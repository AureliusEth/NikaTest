import {
  CommissionPolicy,
  CommissionContext,
  Split,
} from '../../domain/policies';

/**
 * Default Commission Policy Implementation
 *
 * SQE Fee Bundling:
 * - Cashback: configurable per user (e.g., 10%)
 * - Level 1 (direct referral): 30%
 * - Level 2 (referral's referral): 3%
 * - Level 3 (3rd level): 2%
 * - Treasury: Remainder (e.g., 55% if cashback is 10%)
 *
 * Fee Split by Destination:
 * - Treasury → Direct to Nika (remaining amount)
 * - Claimable → Merkle root smart contract (cashback + commissions)
 */
export class DefaultPolicy implements CommissionPolicy {
  private readonly uplineRates = [0.3, 0.03, 0.02]; // Level 1, 2, 3
  private readonly TREASURY_BENEFICIARY = 'NIKA_TREASURY';

  calculateSplits(tradeFee: number, ctx: CommissionContext): Split[] {
    const token = ctx.token ?? 'XP';
    const splits: Split[] = [];
    let claimableTotal = 0;

    // User cashback (level 0) - Goes to claimable contract
    if (ctx.userCashbackRate > 0) {
      const amount = tradeFee * ctx.userCashbackRate;
      if (amount > 0) {
        splits.push({
          beneficiaryId: ctx.userId,
          level: 0,
          rate: ctx.userCashbackRate,
          amount,
          token,
          destination: 'claimable',
        });
        claimableTotal += amount;
      }
    }

    // Upline commissions (levels 1-3) - Goes to claimable contract
    for (let i = 0; i < this.uplineRates.length; i++) {
      const ancestorId = ctx.ancestors[i];
      if (!ancestorId) break; // No more uplines

      const rate = this.uplineRates[i];
      const amount = tradeFee * rate;
      if (amount > 0) {
        splits.push({
          beneficiaryId: ancestorId,
          level: i + 1,
          rate,
          amount,
          token,
          destination: 'claimable',
        });
        claimableTotal += amount;
      }
    }

    // Treasury split (remainder) - Goes directly to Nika treasury
    const treasuryAmount = tradeFee - claimableTotal;
    if (treasuryAmount > 0) {
      const treasuryRate = treasuryAmount / tradeFee;
      splits.push({
        beneficiaryId: this.TREASURY_BENEFICIARY,
        level: -1,
        rate: treasuryRate,
        amount: treasuryAmount,
        token,
        destination: 'treasury',
      });
    }

    return splits;
  }
}
