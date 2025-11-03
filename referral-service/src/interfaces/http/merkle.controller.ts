import { Controller, Get, Post, Query, Param, UseGuards } from '@nestjs/common';
import { MerkleTreeService } from '../../infrastructure/services/merkle-tree.service';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';

/**
 * Merkle Tree Controller
 * 
 * Provides endpoints for:
 * - Getting latest merkle root (for smart contract)
 * - Generating merkle proofs (for user claims)
 * - Triggering merkle root updates
 */
@Controller('api/merkle')
export class MerkleController {
  constructor(private readonly merkleService: MerkleTreeService) {}

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
    @Query('userId') userId?: string,
  ) {
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
    const proof = this.merkleService.generateProof(userId || '', balances);
    
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
    // TODO: Replace with actual contract addresses from environment
    const addresses = {
      EVM: {
        XP: '0x0000000000000000000000000000000000000000',
        USDC: '0x0000000000000000000000000000000000000000',
      },
      SVM: {
        XP: '11111111111111111111111111111111',
        USDC: '11111111111111111111111111111111',
      },
    };
    
    return addresses[chain]?.[token] || 'NOT_CONFIGURED';
  }
}

