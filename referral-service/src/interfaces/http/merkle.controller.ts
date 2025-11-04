import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  UseGuards,
  Body,
  Req,
} from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { MerkleTreeService } from '../../infrastructure/services/merkle-tree.service';
import { EvmBlockchainService } from '../../infrastructure/services/evm-blockchain.service';
import { SvmBlockchainService } from '../../infrastructure/services/svm-blockchain.service';
import { ClaimService } from '../../infrastructure/services/claim.service';
import { PrismaService } from '../../infrastructure/prisma/services/prisma.service';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';
import { getContractAddressForChain } from '../../common/chain-constants';

/**
 * Merkle Tree Controller
 *
 * Provides endpoints for:
 * - Getting latest merkle root (for smart contract)
 * - Generating merkle proofs (for user claims)
 * - Triggering merkle root updates
 * - Updating merkle roots on-chain
 * - Verifying proofs on-chain
 */
@Controller('api/merkle')
export class MerkleController {
  private readonly logger = new Logger(MerkleController.name);

  constructor(
    private readonly merkleService: MerkleTreeService,
    private readonly evmService: EvmBlockchainService,
    private readonly svmService: SvmBlockchainService,
    private readonly claimService: ClaimService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * GET /api/merkle/root/:chain/:token
   *
   * Gets the latest merkle root for a chain/token pair.
   * This is what the smart contract needs to verify claims.
   *
   * Example: GET /api/merkle/root/EVM/USDC
   * Response: {
   *   chain: "EVM",
   *   token: "USDC",
   *   root: "0x1234...",
   *   version: 5,
   *   leafCount: 1234,
   *   createdAt: "2025-11-03T..."
   * }
   */
  @Get('root/:chain/:token')
  async getRoot(
    @Param('chain') chain: 'EVM' | 'SVM',
    @Param('token') token: string,
  ) {
    const root = await this.merkleService.getLatestRoot(chain, token);

    if (!root) {
      return {
        chain,
        token,
        root: null,
        message:
          'No merkle root generated yet. Call POST /api/merkle/generate to create one.',
      };
    }

    return root;
  }

  /**
   * GET /api/merkle/proof/:chain/:token
   *
   * Generates a merkle proof for the authenticated user.
   * The user can submit this proof to the smart contract to claim funds.
   *
   * Example: GET /api/merkle/proof/EVM/USDC
   * Response: {
   *   beneficiaryId: "user123",
   *   token: "USDC",
   *   amount: 45.5,
   *   proof: ["0xabc...", "0xdef...", ...],
   *   leaf: "0x123...",
   *   root: "0x456...",
   *   verified: true
   * }
   */
  @Get('proof/:chain/:token')
  @UseGuards(SessionAuthGuard)
  async getProof(
    @Param('chain') chain: 'EVM' | 'SVM',
    @Param('token') token: string,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      return {
        error: 'User not authenticated',
      };
    }

    // Get latest root
    const rootData = await this.merkleService.getLatestRoot(chain, token);

    if (!rootData) {
      return {
        error:
          'No merkle root found. Generate one first with POST /api/merkle/generate',
      };
    }

    // Get all claimable balances (to rebuild tree)
    const balances = await this.merkleService['getClaimableBalances'](
      chain,
      token,
    );

    // Generate proof for this user
    const proof = this.merkleService.generateProof(userId, balances);

    if (!proof) {
      return {
        beneficiaryId: userId,
        token,
        amount: 0,
        message: 'No claimable balance found for this user',
      };
    }

    // Verify the proof
    const verified = this.merkleService.verifyProof(proof, rootData.root);

    return {
      ...proof,
      root: rootData.root,
      rootVersion: rootData.version,
      verified,
    };
  }

  /**
   * POST /api/merkle/generate/:chain/:token
   *
   * Generates and stores a new merkle root from current claimable balances.
   * Automatically updates the merkle root on-chain if blockchain services are configured.
   * Set ?updateOnChain=false to skip on-chain update.
   *
   * This should be called:
   * - Periodically (e.g., every hour)
   * - After significant balance changes
   *
   * Example: POST /api/merkle/generate/EVM/USDC
   * Response: {
   *   chain: "EVM",
   *   token: "USDC",
   *   root: "0x1234...",
   *   version: 6,
   *   leafCount: 1250,
   *   createdAt: "2025-11-03T...",
   *   txHash: "0xabc..." // If updated on-chain
   * }
   */
  @Post('generate/:chain/:token')
  async generateRoot(
    @Param('chain') chain: 'EVM' | 'SVM',
    @Param('token') token: string,
    @Query('updateOnChain') skipUpdate?: string,
  ) {
    const rootData = await this.merkleService.generateAndStoreRoot(
      chain,
      token,
    );

    let txHash: string | undefined;
    let onChainUpdated = false;

    // If there are no leaves, skip on-chain update entirely (prevents zero-root overwrites)
    if (rootData.leafCount === 0) {
      this.logger.warn(
        `Skipping on-chain update for ${chain}/${token}: zero leafCount`,
      );
      return {
        ...rootData,
        message: `Merkle root version ${rootData.version} generated. No on-chain update (zero leafCount). Contract address: ${this.getContractAddress(chain, token)}`,
        contractUpdateRequired: false,
        txHash: 'skipped:zero-leafcount',
      };
    }

    // Update on-chain by default, unless ?updateOnChain=false is explicitly provided
    const shouldUpdate = skipUpdate !== 'false';

    if (shouldUpdate) {
      const contractAddress = this.getContractAddress(chain, token);

      if (contractAddress !== 'NOT_CONFIGURED') {
        try {
          if (chain === 'EVM' && this.evmService.isInitialized()) {
            txHash = await this.evmService.updateMerkleRoot(
              contractAddress,
              rootData.root,
            );
            onChainUpdated = true;
          } else if (chain === 'SVM' && this.svmService.isInitialized()) {
            txHash = await this.svmService.updateMerkleRoot(
              contractAddress,
              rootData.root,
            );
            onChainUpdated = true;
          } else {
            this.logger.warn(
              `${chain} blockchain service not initialized. Set ${chain}_RPC_URL and ${chain}_PRIVATE_KEY environment variables.`,
            );
          }
        } catch (error: any) {
          this.logger.error(
            `Failed to update merkle root on-chain: ${error.message}`,
            error.stack,
          );
          // Continue - return the generated root even if on-chain update failed
        }
      }
    }

    return {
      ...rootData,
      message: onChainUpdated
        ? `Merkle root version ${rootData.version} generated and updated on-chain successfully.`
        : `Merkle root version ${rootData.version} generated successfully. ` +
          (shouldUpdate
            ? `On-chain update skipped or failed. Contract address: ${this.getContractAddress(chain, token)}`
            : `On-chain update skipped. Contract address: ${this.getContractAddress(chain, token)}`),
      contractUpdateRequired: !onChainUpdated,
      txHash,
    };
  }

  /**
   * Helper to get contract address for a chain/token
   */
  private getContractAddress(chain: 'EVM' | 'SVM', token: string): string {
    return getContractAddressForChain(chain, token as 'XP' | 'USDC');
  }

  /**
   * POST /api/merkle/update-on-chain/:chain/:token
   *
   * Updates the merkle root on the smart contract.
   * Requires blockchain service to be configured with a signer.
   *
   * Example: POST /api/merkle/update-on-chain/EVM/USDC
   * Response: {
   *   success: true,
   *   txHash: "0x1234...",
   *   chain: "EVM",
   *   token: "USDC",
   *   root: "0x5678...",
   *   version: 6
   * }
   */
  @Post('update-on-chain/:chain/:token')
  async updateOnChain(
    @Param('chain') chain: 'EVM' | 'SVM',
    @Param('token') token: string,
  ) {
    // Get latest root from database
    const rootData = await this.merkleService.getLatestRoot(chain, token);

    if (!rootData) {
      return {
        error:
          'No merkle root found. Generate one first with POST /api/merkle/generate',
      };
    }

    const contractAddress = this.getContractAddress(chain, token);

    if (contractAddress === 'NOT_CONFIGURED') {
      return {
        error: `Contract address not configured for ${chain}/${token}. Set ${chain}_${token}_CONTRACT_ADDRESS environment variable.`,
      };
    }

    try {
      let txHash: string;

      if (chain === 'EVM') {
        if (!this.evmService.isInitialized()) {
          return {
            error:
              'EVM blockchain service not initialized. Set EVM_RPC_URL and EVM_PRIVATE_KEY environment variables.',
          };
        }
        txHash = await this.evmService.updateMerkleRoot(
          contractAddress,
          rootData.root,
        );
      } else {
        if (!this.svmService.isInitialized()) {
          return {
            error:
              'SVM blockchain service not initialized. Set SVM_RPC_URL and SVM_PRIVATE_KEY environment variables.',
          };
        }
        txHash = await this.svmService.updateMerkleRoot(
          contractAddress,
          rootData.root,
        );
      }

      return {
        success: true,
        txHash,
        chain: rootData.chain,
        token: rootData.token,
        root: rootData.root,
        version: rootData.version,
        contractAddress,
      };
    } catch (error: any) {
      return {
        error: `Failed to update contract: ${error.message}`,
        chain: rootData.chain,
        token: rootData.token,
        root: rootData.root,
        version: rootData.version,
      };
    }
  }

  /**
   * GET /api/merkle/contract-status/:chain/:token
   *
   * Gets the current merkle root and version from the on-chain contract.
   *
   * Example: GET /api/merkle/contract-status/EVM/USDC
   * Response: {
   *   chain: "EVM",
   *   token: "USDC",
   *   onChainRoot: "0x1234...",
   *   onChainVersion: 5,
   *   databaseRoot: "0x5678...",
   *   databaseVersion: 6,
   *   synced: false
   * }
   */
  @Get('contract-status/:chain/:token')
  async getContractStatus(
    @Param('chain') chain: 'EVM' | 'SVM',
    @Param('token') token: string,
  ) {
    const contractAddress = this.getContractAddress(chain, token);

    if (contractAddress === 'NOT_CONFIGURED') {
      return {
        error: `Contract address not configured for ${chain}/${token}`,
      };
    }

    const databaseRoot = await this.merkleService.getLatestRoot(chain, token);

    try {
      let onChainRoot: string;
      let onChainVersion: number;

      if (chain === 'EVM') {
        if (!this.evmService.isInitialized()) {
          return {
            error: 'EVM blockchain service not initialized',
            databaseRoot: databaseRoot || null,
          };
        }
        onChainRoot = await this.evmService.getMerkleRoot(contractAddress);
        onChainVersion =
          await this.evmService.getMerkleRootVersion(contractAddress);
      } else {
        if (!this.svmService.isInitialized()) {
          return {
            error: 'SVM blockchain service not initialized',
            databaseRoot: databaseRoot || null,
          };
        }
        onChainRoot = await this.svmService.getMerkleRoot(contractAddress);
        onChainVersion =
          await this.svmService.getMerkleRootVersion(contractAddress);
      }

      return {
        chain,
        token,
        contractAddress,
        onChainRoot,
        onChainVersion,
        databaseRoot: databaseRoot?.root || null,
        databaseVersion: databaseRoot?.version || null,
        synced:
          databaseRoot?.root === onChainRoot &&
          databaseRoot?.version === onChainVersion,
      };
    } catch (error: any) {
      return {
        error: `Failed to read contract status: ${error.message}`,
        chain,
        token,
        contractAddress,
        databaseRoot: databaseRoot || null,
      };
    }
  }

  /**
   * POST /api/merkle/verify-on-chain/:chain/:token
   *
   * Verifies a merkle proof on-chain.
   * Body: { proof: string[], user_id: string, amount: number, token?: string }
   *
   * Example: POST /api/merkle/verify-on-chain/EVM/USDC
   * Body: {
   *   "proof": ["0xabc...", "0xdef..."],
   *   "user_id": "user@example.com",
   *   "amount": 45.5,
   *   "token": "XP"
   * }
   */
  @Post('verify-on-chain/:chain/:token')
  async verifyOnChain(
    @Param('chain') chain: 'EVM' | 'SVM',
    @Param('token') token: string,
    @Body()
    body: { proof: string[]; user_id: string; amount: number; token?: string },
  ) {
    const contractAddress = this.getContractAddress(chain, token);

    if (contractAddress === 'NOT_CONFIGURED') {
      return {
        error: `Contract address not configured for ${chain}/${token}`,
      };
    }

    try {
      let isValid: boolean;
      const tokenParam = body.token || token;
      const amount_str = body.amount.toFixed(8);

      if (chain === 'EVM') {
        if (!this.evmService.isInitialized()) {
          return {
            error: 'EVM blockchain service not initialized',
          };
        }
        isValid = await this.evmService.verifyProof(
          contractAddress,
          body.proof,
          body.user_id,
          tokenParam,
          amount_str,
        );
      } else {
        if (!this.svmService.isInitialized()) {
          return {
            error: 'SVM blockchain service not initialized',
          };
        }
        isValid = await this.svmService.verifyProof(
          contractAddress,
          body.proof,
          body.user_id,
          tokenParam,
          amount_str,
        );
      }

      return {
        valid: isValid,
        chain,
        token: tokenParam,
        contractAddress,
        user_id: body.user_id,
        amount: body.amount,
        amount_str,
      };
    } catch (error: any) {
      return {
        error: `Failed to verify proof: ${error.message}`,
        chain,
        token,
      };
    }
  }

  /**
   * POST /api/merkle/claim/:chain/:token
   *
   * Claims XP for the authenticated user (simulated - no actual token transfer).
   * Verifies proof off-chain and records claim in database.
   *
   * No wallet connection needed - XP is tracked in database, not on-chain.
   */
  /**
   * GET /api/merkle/claim-preview/:chain/:token
   *
   * Preview claim details before actually claiming.
   * Shows user their claimable amount, treasury split, etc.
   */
  @Get('claim-preview/:chain/:token')
  @UseGuards(SessionAuthGuard)
  async claimPreview(
    @Param('chain') chain: 'EVM' | 'SVM',
    @Param('token') token: string,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      return { error: 'User not authenticated' };
    }

    // Get user's proof/claimable amount
    const rootData = await this.merkleService.getLatestRoot(chain, token);
    if (!rootData) {
      return {
        claimableAmount: 0,
        userCashback: 0,
        treasuryAmount: 0,
        evmTreasuryTotal: 0,
        svmTreasuryTotal: 0,
        message: 'No merkle root available. Generate one first.',
      };
    }

    const balances = await this.merkleService['getClaimableBalances'](
      chain,
      token,
    );
    const proof = this.merkleService.generateProof(userId, balances);

    // Get treasury balances
    const evmTreasuryBalance = await this.claimService.getTreasuryBalance(
      'EVM',
      token,
    );
    const svmTreasuryBalance = await this.claimService.getTreasuryBalance(
      'SVM',
      token,
    );

    // Calculate user's cashback (level 0 entries) from ledger, filtered by chain
    const cashbackResult = await this.prisma.$queryRaw<
      Array<{ totalCashback: string }>
    >`
      SELECT COALESCE(SUM(l.amount), 0)::text as "totalCashback"
      FROM "CommissionLedgerEntry" l
      INNER JOIN "Trade" t ON l."sourceTradeId" = t.id
      WHERE l."beneficiaryId" = ${userId}
        AND l.level = 0
        AND l.token = ${token}
        AND l.destination = 'claimable'
        AND t.chain = ${chain}
    `;

    const userCashback = Number(cashbackResult[0]?.totalCashback || 0);

    // Calculate commission earnings (level > 0 entries)
    const commissionResult = await this.prisma.$queryRaw<
      Array<{ totalCommissions: string }>
    >`
      SELECT COALESCE(SUM(l.amount), 0)::text as "totalCommissions"
      FROM "CommissionLedgerEntry" l
      INNER JOIN "Trade" t ON l."sourceTradeId" = t.id
      WHERE l."beneficiaryId" = ${userId}
        AND l.level > 0
        AND l.token = ${token}
        AND l.destination = 'claimable'
        AND t.chain = ${chain}
    `;

    const userCommissions = Number(commissionResult[0]?.totalCommissions || 0);

    return {
      claimableAmount: proof?.amount || 0,
      userCashback,
      userCommissions,
      treasuryAmount: 0, // Amount that will go to treasury from this claim (if any)
      evmTreasuryTotal: Number(evmTreasuryBalance),
      svmTreasuryTotal: Number(svmTreasuryBalance),
      chain,
      token,
      canClaim: (proof?.amount || 0) > 0,
      merkleVersion: rootData.version,
    };
  }

  @Post('claim/:chain/:token')
  @UseGuards(SessionAuthGuard)
  async claim(
    @Param('chain') chain: 'EVM' | 'SVM',
    @Param('token') token: string,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      return { error: 'User not authenticated' };
    }

    return await this.claimService.claim(userId, chain, token);
  }

  /**
   * GET /api/merkle/treasury-balance/:chain/:token
   *
   * Gets treasury balance for a chain/token pair.
   */
  @Get('treasury-balance/:chain/:token')
  async getTreasuryBalance(
    @Param('chain') chain: 'EVM' | 'SVM',
    @Param('token') token: string,
  ) {
    const balance = await this.claimService.getTreasuryBalance(chain, token);
    return {
      chain,
      token,
      balance: Number(balance),
    };
  }

  /**
   * POST /api/merkle/generate-all
   *
   * Manual trigger to generate ALL merkle roots (for testing).
   * Generates roots for EVM/XP, EVM/USDC, SVM/XP, SVM/USDC.
   * Automatically updates merkle roots on-chain by default.
   */
  @Post('generate-all')
  async generateAll(@Query('updateOnChain') skipUpdate?: string) {
    const chains: ('EVM' | 'SVM')[] = ['EVM', 'SVM'];
    const tokens = ['XP', 'USDC'];
    const results: Array<{
      chain: string;
      token: string;
      success: boolean;
      root?: string;
      version?: number;
      leafCount?: number;
      txHash?: string;
      onChainUpdated?: boolean;
      error?: string;
    }> = [];

    for (const chain of chains) {
      for (const token of tokens) {
        try {
          // Use generateRoot which now has auto-update built in
          const rootData = await this.generateRoot(chain, token, skipUpdate);
          results.push({
            chain,
            token,
            success: true,
            root: rootData.root,
            version: rootData.version,
            leafCount: rootData.leafCount,
            txHash: rootData.txHash,
            onChainUpdated: !rootData.contractUpdateRequired,
          });
        } catch (error: any) {
          results.push({
            chain,
            token,
            success: false,
            error: error.message,
          });
        }
      }
    }

    return {
      message: 'Generated all merkle roots',
      results,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /api/merkle/transfer-treasury/:chain/:token
   *
   * Transfers treasury funds to treasury address.
   * Admin only.
   */
  @Post('transfer-treasury/:chain/:token')
  async transferTreasury(
    @Param('chain') chain: 'EVM' | 'SVM',
    @Param('token') token: string,
  ) {
    return await this.claimService.transferTreasuryFunds(chain, token);
  }
}
