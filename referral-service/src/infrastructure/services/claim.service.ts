import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/services/prisma.service';
import { MerkleTreeService } from './merkle-tree.service';
import { EvmBlockchainService } from './evm-blockchain.service';
import { SvmBlockchainService } from './svm-blockchain.service';
import { getContractAddressForChain } from '../../common/chain-constants';
import { PublicKey } from '@solana/web3.js';

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
  ): Promise<{ 
    success: boolean; 
    claimId?: string; 
    amount?: number; 
    error?: string;
    contractAddress?: string;
    onChainRoot?: string;
    databaseRoot?: string;
    details?: string;
  }> {
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

    // Prepare values used across verification and error handling
    const amount_str = proof.amount.toFixed(8);
    const contractAddress = this.getContractAddress(chain, token);
    var verified = false;
    try {
      // Format amount to match backend's leaf creation format (toFixed(8))
      
      this.logger.log(`Verifying proof on ${chain} contract: ${contractAddress}`);
      
      if (chain === 'EVM') {
        // Check merkle root first
        const onChainRoot = await this.evmService.getMerkleRoot(contractAddress);
        const dbRoot = rootData.root;
        this.logger.log(`EVM Merkle root - On-chain: ${onChainRoot}, Database: ${dbRoot}`);
        
        if (onChainRoot === '0x0000000000000000000000000000000000000000000000000000000000000000') {
          this.logger.warn('Merkle root on EVM contract is zero - proof verification will fail. Update merkle root first.');
          return {
            success: false,
            error: 'Merkle root not set on contract. Please update merkle root on-chain first.',
            contractAddress,
            onChainRoot,
            databaseRoot: dbRoot,
          };
        }
        
        verified = await this.evmService.verifyProof(
          contractAddress,
          proof.proof,
          userId,
          token,
          amount_str
        );
      } else if (chain === 'SVM') {
        // Check merkle root first
        const onChainRoot = await this.svmService.getMerkleRoot(contractAddress);
        const dbRoot = rootData.root;
        this.logger.log(`SVM Merkle root - On-chain: ${onChainRoot}, Database: ${dbRoot}`);
        
        if (onChainRoot === '0x0000000000000000000000000000000000000000000000000000000000000000') {
          this.logger.warn('Merkle root on SVM contract is zero - proof verification will fail. Update merkle root first.');
          return {
            success: false,
            error: 'Merkle root not set on contract. Please update merkle root on-chain first.',
            contractAddress,
            onChainRoot,
            databaseRoot: dbRoot,
          };
        }
        
        verified = await this.svmService.verifyProof(
          contractAddress,
          proof.proof,
          userId,
          token,
          amount_str
        );
      }
    } catch (error) {
      this.logger.error(`Failed to verify proof: ${error.message}`, error.stack);
      return {
        success: false,
        error: `Proof verification failed: ${error.message}`,
        details: error.stack,
      };
    }
    if (!verified) {
      // Surface detailed context when proof fails without exception
      const onChainRoot = chain === 'EVM'
        ? await this.evmService.getMerkleRoot(contractAddress)
        : await this.svmService.getMerkleRoot(contractAddress);
      const dbRoot = rootData.root;
      this.logger.warn(
        `Proof invalid for ${chain}/${token}. userId=${userId}, amount_str=${amount_str}, ` +
        `contract=${contractAddress}, onChainRoot=${onChainRoot}, databaseRoot=${dbRoot}, version=${rootData.version}`
      );
      return {
        success: false,
        error: 'Proof verification failed',
        contractAddress,
        onChainRoot,
        databaseRoot: dbRoot,
        details: `userId=${userId}, amount=${amount_str}, version=${rootData.version}`,
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
      amount: Number(proof.amount), // Include claimed amount for frontend
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
   * Get treasury balance for a chain/token
   */
  async getTreasuryBalance(
    chain: 'EVM' | 'SVM',
    token: string,
  ): Promise<number> {
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

    return treasury ? Number(treasury.balance) : 0;
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
   * 
   * For EVM: Returns the contract address directly
   * For SVM: Returns the state account address (not the program ID)
   *   - First checks SVM_STATE_ACCOUNT_ADDRESS env var
   *   - Then tries to load state keypair and use its address
   *   - Falls back to deriving PDA from program ID if available
   *   - Finally falls back to program ID (for reference, but won't work for verification)
   */
  private getContractAddress(chain: 'EVM' | 'SVM', token: string): string {
    // For SVM, we need the state account address (not the program ID)
    if (chain === 'SVM') {
      // Priority 1: Check for explicit state account address in env
      // This should be the address from deployment (could be PDA or regular account)
      const stateAddressEnv = process.env.SVM_STATE_ACCOUNT_ADDRESS || process.env.SVM_STATE_PDA_ADDRESS;
      if (stateAddressEnv) {
        this.logger.log(`Using SVM state account from env: ${stateAddressEnv}`);
        return stateAddressEnv;
      }
      
      // Priority 2: Try to load state keypair and use its address
      const stateKeypairPath = process.env.SVM_STATE_KEYPAIR_PATH || process.env.STATE_KEYPAIR_PATH;
      if (stateKeypairPath) {
        try {
          const fs = require('fs');
          const { Keypair } = require('@solana/web3.js');
          const keypairData = JSON.parse(fs.readFileSync(stateKeypairPath, 'utf-8'));
          const stateKeypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
          const stateAddress = stateKeypair.publicKey.toString();
          this.logger.log(`Using SVM state account from keypair: ${stateAddress}`);
          return stateAddress;
        } catch (error: any) {
          this.logger.warn(`Failed to load state keypair from ${stateKeypairPath}: ${error.message}`);
        }
      }
      
      // Priority 3: Try to derive state PDA from program ID
      // This only works if the contract uses a PDA with ['state'] seed
      const programId = getContractAddressForChain(chain, token as 'XP' | 'USDC');
      try {
        const [statePda] = PublicKey.findProgramAddressSync(
          [Buffer.from('state')],
          new PublicKey(programId)
        );
        this.logger.log(`Derived SVM state PDA from program ID: ${statePda.toString()}`);
        return statePda.toString();
      } catch (error) {
        this.logger.warn(`Failed to derive state PDA for ${chain}/${token}, using program ID: ${error.message}`);
        // Priority 4: Fallback to program ID (but this won't work for verification)
        return programId;
      }
    }
    
    // For EVM, use chain constants directly
    return getContractAddressForChain(chain, token as 'XP' | 'USDC');
  }

  /**
   * Get treasury address
   */
  private getTreasuryAddress(chain: 'EVM' | 'SVM'): string {
    const envKey = `${chain}_TREASURY_ADDRESS`;
    return process.env[envKey] || (chain === 'EVM' ? '0x0000000000000000000000000000000000000000' : '11111111111111111111111111111111');
  }
}

