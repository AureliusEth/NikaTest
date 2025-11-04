import { Split } from '../policies/commission-policy';

/**
 * Fee Bundle represents a grouped set of splits by destination.
 * Used for the SQE (spot mechanism) fee bundling logic.
 */
export interface FeeBundle {
  destination: 'treasury' | 'claimable';
  chain: 'EVM' | 'SVM';
  token: string;
  totalAmount: number;
  splits: Split[];
  contractAddress?: string; // Smart contract address for claimable funds
}

/**
 * Fee Bundling Service Interface (Domain Layer)
 *
 * Handles the SQE fee bundling logic to redirect fees to:
 * - Treasury: Direct to Nika treasury
 * - Claimable: Merkle root smart contract (for user claims)
 *
 * Implementations live in the infrastructure layer.
 */
export interface FeeBundlingService {
  /**
   * Bundles commission splits by destination.
   * Groups splits for efficient transfer to treasury and smart contracts.
   *
   * @param splits - Array of commission splits
   * @param chain - EVM (Arbitrum) or SVM (Solana)
   * @returns Array of fee bundles grouped by destination
   */
  bundleSplits(splits: Split[], chain: 'EVM' | 'SVM'): FeeBundle[];

  /**
   * Gets the smart contract address for a given chain and token.
   * This is where claimable funds are sent.
   *
   * @param chain - EVM (Arbitrum) or SVM (Solana)
   * @param token - Token type (e.g., 'XP', 'USDC')
   * @returns Smart contract address
   */
  getContractAddress(chain: 'EVM' | 'SVM', token: string): string;
}
