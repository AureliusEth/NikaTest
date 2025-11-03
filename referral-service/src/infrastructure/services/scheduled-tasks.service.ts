import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MerkleTreeService } from '../services/merkle-tree.service';
import { EvmBlockchainService } from '../services/evm-blockchain.service';
import { SvmBlockchainService } from '../services/svm-blockchain.service';

/**
 * Scheduled Tasks Service
 * 
 * Handles periodic tasks:
 * - Merkle root generation and updates
 * - Treasury balance synchronization
 */
@Injectable()
export class ScheduledTasksService {
  private readonly logger = new Logger(ScheduledTasksService.name);

  constructor(
    private readonly merkleService: MerkleTreeService,
    private readonly evmService: EvmBlockchainService,
    private readonly svmService: SvmBlockchainService,
  ) {}

  /**
   * Generate and update merkle roots every hour
   * Configurable via MERKLE_UPDATE_INTERVAL_CRON env var (default: every hour)
   */
  @Cron(process.env.MERKLE_UPDATE_INTERVAL_CRON || CronExpression.EVERY_HOUR)
  async handleMerkleRootUpdates() {
    this.logger.log('Starting scheduled merkle root updates...');

    const chains: ('EVM' | 'SVM')[] = ['EVM', 'SVM'];
    const tokens = ['XP', 'USDC']; // Add more tokens as needed

    for (const chain of chains) {
      for (const token of tokens) {
        try {
          this.logger.log(`Generating merkle root for ${chain}/${token}...`);
          
          // Generate new root
          const rootData = await this.merkleService.generateAndStoreRoot(chain, token);
          
          this.logger.log(
            `Generated merkle root v${rootData.version} for ${chain}/${token}: ${rootData.root}`
          );

          // Auto-update on-chain if configured
          const autoUpdate = process.env.AUTO_UPDATE_MERKLE_ROOTS === 'true';
          
          if (autoUpdate) {
            await this.updateMerkleRootOnChain(chain, token, rootData.root);
          } else {
            this.logger.log(
              `Skipping on-chain update (set AUTO_UPDATE_MERKLE_ROOTS=true to enable). ` +
              `Manual update required at: ${this.getContractAddress(chain, token)}`
            );
          }
        } catch (error: any) {
          this.logger.error(
            `Failed to update merkle root for ${chain}/${token}: ${error.message}`,
            error.stack
          );
        }
      }
    }

    this.logger.log('Completed scheduled merkle root updates');
  }

  /**
   * Update merkle root on-chain
   */
  private async updateMerkleRootOnChain(
    chain: 'EVM' | 'SVM',
    token: string,
    root: string
  ): Promise<void> {
    const contractAddress = this.getContractAddress(chain, token);
    
    if (contractAddress === 'NOT_CONFIGURED') {
      this.logger.warn(`Contract address not configured for ${chain}/${token}`);
      return;
    }

    try {
      let txHash: string;

      if (chain === 'EVM') {
        if (!this.evmService.isInitialized()) {
          this.logger.warn('EVM service not initialized, skipping update');
          return;
        }
        txHash = await this.evmService.updateMerkleRoot(contractAddress, root);
      } else {
        if (!this.svmService.isInitialized()) {
          this.logger.warn('SVM service not initialized, skipping update');
          return;
        }
        txHash = await this.svmService.updateMerkleRoot(contractAddress, root);
      }

      this.logger.log(
        `Successfully updated merkle root on-chain for ${chain}/${token}: ${txHash}`
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to update merkle root on-chain for ${chain}/${token}: ${error.message}`,
        error.stack
      );
    }
  }

  /**
   * Get contract address for chain/token
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
        XP: process.env.EVM_XP_CONTRACT_ADDRESS || 'NOT_CONFIGURED',
        USDC: process.env.EVM_USDC_CONTRACT_ADDRESS || 'NOT_CONFIGURED',
      },
      SVM: {
        XP: process.env.SVM_XP_CONTRACT_ADDRESS || 'NOT_CONFIGURED',
        USDC: process.env.SVM_USDC_CONTRACT_ADDRESS || 'NOT_CONFIGURED',
      },
    };
    
    return addresses[chain]?.[token] || 'NOT_CONFIGURED';
  }
}

