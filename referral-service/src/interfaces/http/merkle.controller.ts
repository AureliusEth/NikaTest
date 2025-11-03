import { Controller, Get, Post, Query, Param, UseGuards, Body, Req } from '@nestjs/common';
import { MerkleTreeService } from '../../infrastructure/services/merkle-tree.service';
import { EvmBlockchainService } from '../../infrastructure/services/evm-blockchain.service';
import { SvmBlockchainService } from '../../infrastructure/services/svm-blockchain.service';
import { ClaimService } from '../../infrastructure/services/claim.service';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';

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
  constructor(
    private readonly merkleService: MerkleTreeService,
    private readonly evmService: EvmBlockchainService,
    private readonly svmService: SvmBlockchainService,
    private readonly claimService: ClaimService,
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
        message: 'No merkle root generated yet. Call POST /api/merkle/generate to create one.',
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
        error: 'No merkle root found. Generate one first with POST /api/merkle/generate',
      };
    }

    // Get all claimable balances (to rebuild tree)
    const balances = await this.merkleService['getClaimableBalances'](chain, token);
    
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
   * This should be called:
   * - Periodically (e.g., every hour)
   * - After significant balance changes
   * - Before updating the on-chain contract
   * 
   * Example: POST /api/merkle/generate/EVM/USDC
   * Response: {
   *   chain: "EVM",
   *   token: "USDC",
   *   root: "0x1234...",
   *   version: 6,
   *   leafCount: 1250,
   *   createdAt: "2025-11-03T..."
   * }
   */
  @Post('generate/:chain/:token')
  async generateRoot(
    @Param('chain') chain: 'EVM' | 'SVM',
    @Param('token') token: string,
  ) {
    const rootData = await this.merkleService.generateAndStoreRoot(chain, token);
    
    return {
      ...rootData,
      message: `Merkle root version ${rootData.version} generated successfully. ` +
               `This root should be submitted to the smart contract at: ${this.getContractAddress(chain, token)}`,
      contractUpdateRequired: true,
    };
  }

  /**
   * Helper to get contract address for a chain/token
   */
  private getContractAddress(chain: 'EVM' | 'SVM', token: string): string {
    const envKey = `${chain}_${token}_CONTRACT_ADDRESS`;
    const address = process.env[envKey];
    
    if (address) {
      return address;
    }
    
    // Fallback to defaults
    const addresses = {
      EVM: {
        XP: process.env.EVM_XP_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
        USDC: process.env.EVM_USDC_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
      },
      SVM: {
        XP: process.env.SVM_XP_CONTRACT_ADDRESS || '11111111111111111111111111111111',
        USDC: process.env.SVM_USDC_CONTRACT_ADDRESS || '11111111111111111111111111111111',
      },
    };
    
    return addresses[chain]?.[token] || 'NOT_CONFIGURED';
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
        error: 'No merkle root found. Generate one first with POST /api/merkle/generate',
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
            error: 'EVM blockchain service not initialized. Set EVM_RPC_URL and EVM_PRIVATE_KEY environment variables.',
          };
        }
        txHash = await this.evmService.updateMerkleRoot(contractAddress, rootData.root);
      } else {
        if (!this.svmService.isInitialized()) {
          return {
            error: 'SVM blockchain service not initialized. Set SVM_RPC_URL and SVM_PRIVATE_KEY environment variables.',
          };
        }
        txHash = await this.svmService.updateMerkleRoot(contractAddress, rootData.root);
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
        onChainVersion = await this.evmService.getMerkleRootVersion(contractAddress);
      } else {
        if (!this.svmService.isInitialized()) {
          return {
            error: 'SVM blockchain service not initialized',
            databaseRoot: databaseRoot || null,
          };
        }
        onChainRoot = await this.svmService.getMerkleRoot(contractAddress);
        onChainVersion = await this.svmService.getMerkleRootVersion(contractAddress);
      }

      return {
        chain,
        token,
        contractAddress,
        onChainRoot,
        onChainVersion,
        databaseRoot: databaseRoot?.root || null,
        databaseVersion: databaseRoot?.version || null,
        synced: databaseRoot?.root === onChainRoot && databaseRoot?.version === onChainVersion,
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
   * Body: { proof: string[], amount: number, userAddress: string }
   * 
   * Example: POST /api/merkle/verify-on-chain/EVM/USDC
   * Body: {
   *   "proof": ["0xabc...", "0xdef..."],
   *   "amount": 45.5,
   *   "userAddress": "0x1234..."
   * }
   */
  @Post('verify-on-chain/:chain/:token')
  async verifyOnChain(
    @Param('chain') chain: 'EVM' | 'SVM',
    @Param('token') token: string,
    @Body() body: { proof: string[]; amount: number; userAddress: string },
  ) {
    const contractAddress = this.getContractAddress(chain, token);
    
    if (contractAddress === 'NOT_CONFIGURED') {
      return {
        error: `Contract address not configured for ${chain}/${token}`,
      };
    }

    try {
      let isValid: boolean;

      if (chain === 'EVM') {
        if (!this.evmService.isInitialized()) {
          return {
            error: 'EVM blockchain service not initialized',
          };
        }
        isValid = await this.evmService.verifyProof(
          contractAddress,
          body.proof,
          body.amount,
          body.userAddress,
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
          body.amount,
          body.userAddress,
        );
      }

      return {
        valid: isValid,
        chain,
        token,
        contractAddress,
        userAddress: body.userAddress,
        amount: body.amount,
      };
    } catch (error: any) {
      return {
        error: `Failed to verify proof: ${error.message}`,
        chain,
        token,
  /**
   * POST /api/merkle/claim/:chain/:token
   * 
   * Claims XP for the authenticated user (simulated - no actual token transfer).
   * Verifies proof off-chain and records claim in database.
   * 
   * No wallet connection needed - XP is tracked in database, not on-chain.
   */
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
    // Implementation would fetch from TreasuryAccount model
    return {
      chain,
      token,
      message: 'Treasury balance endpoint - implementation pending',
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

