import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/services/prisma.service';
import { MerkleTreeService } from './merkle-tree.service';
import { EvmBlockchainService } from './evm-blockchain.service';
import { SvmBlockchainService } from './svm-blockchain.service';

/**
 * Claim Service
 * 
 * Handles XP claims for users (simulated - database-only):
 * 1. Verifies merkle proof off-chain
 * 2. Records claim in database
 * 3. Updates treasury balances (simulated)
 * 
 * NOTE: XP is simulated - no actual token transfers occur.
 * Merkle root contracts are used for proof verification only.
 */
@Injectable()
export class ClaimService {
  private readonly logger = new Logger(ClaimService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly merkleService: MerkleTreeService,
    private readonly evmService: EvmBlockchainService,
    private readonly svmService: SvmBlockchainService,
  ) {}

  /**
   * Claim XP for a user (simulated - no actual token transfer)
   * 
   * This simulates XP claims by:
   * 1. Verifying merkle proof off-chain
   * 2. Recording claim in database
   * 3. XP is tracked in database, not transferred on-chain
   */
  async claim(
    userId: string,
    chain: 'EVM' | 'SVM',
    token: string,
  ): Promise<{ success: boolean; claimId?: string; error?: string }> {
    // Get latest root
    const rootData = await this.merkleService.getLatestRoot(chain, token);
    
    if (!rootData) {
      return {
        success: false,
        error: 'No merkle root found. Generate one first.',
      };
    }

    // Check if already claimed for this version
    const existingClaim = await this.prisma.claimRecord.findUnique({
      where: {
        userId_chain_token_merkleVersion: {
          userId,
          chain,
          token,
          merkleVersion: rootData.version,
        },
      },
    });

    if (existingClaim) {
      return {
        success: false,
        error: `Already claimed for merkle root version ${rootData.version}`,
      };
    }

    // Get user's proof
    const balances = await this.merkleService['getClaimableBalances'](chain, token);
    const proof = this.merkleService.generateProof(userId, balances);

    if (!proof || proof.amount === 0) {
      return {
        success: false,
        error: 'No claimable balance found',
      };
    }

    // Verify proof off-chain (no need for on-chain verification)
    const verified = this.merkleService.verifyProof(proof, rootData.root);
    
    if (!verified) {
      return {
        success: false,
        error: 'Proof verification failed',
      };
    }

    // Record claim in database (simulated XP claim)
    const claimRecord = await this.prisma.claimRecord.create({
      data: {
        userId,
        chain,
        token,
        amount: proof.amount,
        merkleVersion: rootData.version,
        txHash: null, // No on-chain transaction for simulated XP
      },
    });

    this.logger.log(
      `User ${userId} claimed ${proof.amount} ${token} on ${chain} (simulated)`
    );

    return {
      success: true,
      claimId: claimRecord.id,
    };
  }

  /**
   * Transfer XP to user (not used for simulated XP)
   * NOTE: Kept for future real token implementation
   */
  private async transferXP(
    chain: 'EVM' | 'SVM',
    token: string,
    userAddress: string,
    amount: number,
  ): Promise<string> {
    // This would transfer real tokens - not used for simulated XP
    this.logger.warn('transferXP called but XP is simulated - no actual transfer');
    return `simulated_${Date.now()}`;
  }

  /**
   * Update treasury balance after trade processing
   */
  async updateTreasuryBalance(
    chain: 'EVM' | 'SVM',
    token: string,
    amount: number,
  ): Promise<void> {
    const treasuryAddress = this.getTreasuryAddress(chain);
    
    const treasury = await this.prisma.treasuryAccount.upsert({
      where: {
        chain_token_address: {
          chain,
          token,
          address: treasuryAddress,
        },
      },
      create: {
        chain,
        token,
        address: treasuryAddress,
        balance: amount,
        claimed: 0,
      },
      update: {
        balance: {
          increment: amount,
        },
      },
    });

    this.logger.log(
      `Updated treasury balance: ${chain}/${token} = ${treasury.balance.toString()}`
    );
  }

  /**
   * Transfer treasury funds to treasury address (simulated)
   * 
   * NOTE: For simulated XP, this just updates the database.
   * When real tokens are added, this would transfer tokens on-chain.
   */
  async transferTreasuryFunds(
    chain: 'EVM' | 'SVM',
    token: string,
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    const treasuryAddress = this.getTreasuryAddress(chain);
    
    const treasury = await this.prisma.treasuryAccount.findUnique({
      where: {
        chain_token_address: {
          chain,
          token,
          address: treasuryAddress,
        },
      },
    });

    if (!treasury || Number(treasury.balance) <= Number(treasury.claimed)) {
      return {
        success: false,
        error: 'No treasury funds to transfer',
      };
    }

    const transferAmount = Number(treasury.balance) - Number(treasury.claimed);
    
    // For simulated XP, just update the database
    // When real tokens are added, this would call contract transfer function
    const txHash = `simulated_treasury_${Date.now()}`;

    // Update claimed amount
    await this.prisma.treasuryAccount.update({
      where: {
        id: treasury.id,
      },
      data: {
        claimed: treasury.balance,
      },
    });

    this.logger.log(
      `Transferred ${transferAmount} ${token} to treasury ${treasuryAddress} on ${chain} (simulated)`
    );

    return {
      success: true,
      txHash,
    };
  }

  /**
   * Transfer funds to treasury address (not used for simulated XP)
   */
  private async transferToTreasury(
    chain: 'EVM' | 'SVM',
    token: string,
    treasuryAddress: string,
    amount: number,
  ): Promise<string> {
    // This would transfer real tokens - not used for simulated XP
    this.logger.warn('transferToTreasury called but XP is simulated - no actual transfer');
    return `simulated_${Date.now()}`;
  }

  /**
   * Get contract address
   */
  private getContractAddress(chain: 'EVM' | 'SVM', token: string): string {
    const envKey = `${chain}_${token}_CONTRACT_ADDRESS`;
    return process.env[envKey] || 'NOT_CONFIGURED';
  }

  /**
   * Get treasury address
   */
  private getTreasuryAddress(chain: 'EVM' | 'SVM'): string {
    const envKey = `${chain}_TREASURY_ADDRESS`;
    return process.env[envKey] || (chain === 'EVM' ? '0x0000000000000000000000000000000000000000' : '11111111111111111111111111111111');
  }
}

