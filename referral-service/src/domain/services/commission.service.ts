import { CommissionContext, Split } from '../policies/commission-policy';

/**
 * Commission Service Interface (Domain Layer)
 *
 * Defines the contract for computing commission splits.
 * Implementations live in the infrastructure layer.
 */
export interface CommissionService {
  /**
   * Computes commission splits for a given trade fee.
   * @param tradeFee - The trade fee amount (must be non-negative)
   * @param ctx - Context containing user info, ancestors, and cashback rate
   * @returns Array of commission splits with beneficiaries and amounts
   * @throws Error if tradeFee is negative
   */
  computeSplits(tradeFee: number, ctx: CommissionContext): Split[];
}
