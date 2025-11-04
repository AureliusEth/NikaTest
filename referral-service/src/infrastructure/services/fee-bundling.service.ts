import { Split } from '../../domain/policies/commission-policy';
import {
  FeeBundlingService as IFeeBundlingService,
  FeeBundle,
} from '../../domain/services/fee-bundling.service';

/**
 * Fee Bundling Service Implementation (Infrastructure Layer)
 *
 * Implements the SQE fee bundling logic:
 * 1. Groups splits by destination (treasury vs claimable)
 * 2. Provides smart contract addresses for each chain
 * 3. Prepares bundles for efficient fund transfers
 */
export class FeeBundlingService implements IFeeBundlingService {
  // Smart contract addresses for merkle root claiming
  // TODO: Replace with actual deployed contract addresses
  private readonly CONTRACT_ADDRESSES = {
    EVM: {
      XP: '0x0000000000000000000000000000000000000000', // Arbitrum XP contract
      USDC: '0x0000000000000000000000000000000000000000', // Arbitrum USDC contract
    },
    SVM: {
      XP: '11111111111111111111111111111111', // Solana XP contract
      USDC: '11111111111111111111111111111111', // Solana USDC contract
    },
  };

  bundleSplits(splits: Split[], chain: 'EVM' | 'SVM'): FeeBundle[] {
    const bundles = new Map<string, FeeBundle>();

    for (const split of splits) {
      const key = `${split.destination}:${split.token}`;

      if (!bundles.has(key)) {
        bundles.set(key, {
          destination: split.destination,
          chain,
          token: split.token,
          totalAmount: 0,
          splits: [],
          contractAddress:
            split.destination === 'claimable'
              ? this.getContractAddress(chain, split.token)
              : undefined,
        });
      }

      const bundle = bundles.get(key)!;
      bundle.totalAmount += split.amount;
      bundle.splits.push(split);
    }

    return Array.from(bundles.values());
  }

  getContractAddress(chain: 'EVM' | 'SVM', token: string): string {
    const address = this.CONTRACT_ADDRESSES[chain]?.[token];
    if (!address) {
      throw new Error(`No contract address configured for ${chain}:${token}`);
    }
    return address;
  }

  /**
   * Generates a summary of the fee bundling for logging/debugging.
   * Useful for verifying correct fee distribution.
   */
  generateBundleSummary(bundles: FeeBundle[]): string {
    const lines: string[] = ['Fee Bundle Summary:'];

    for (const bundle of bundles) {
      lines.push(
        `  [${bundle.destination.toUpperCase()}] ${bundle.chain} ${bundle.token}: ${bundle.totalAmount.toFixed(8)}`,
      );

      if (bundle.destination === 'claimable') {
        lines.push(`    Contract: ${bundle.contractAddress}`);
        lines.push(`    Splits: ${bundle.splits.length} users`);
      } else {
        lines.push(`    Direct to Nika Treasury`);
      }
    }

    return lines.join('\n');
  }
}
