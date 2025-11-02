import { CommissionPolicy, CommissionContext, Split } from '../../domain/policies';

/**
 * Default Commission Policy Implementation
 * 
 * Commission rates:
 * - Level 1 (direct referral): 30%
 * - Level 2 (referral's referral): 3%
 * - Level 3 (3rd level): 2%
 * - User cashback: configurable per user
 */
export class DefaultPolicy implements CommissionPolicy {
  private readonly uplineRates = [0.30, 0.03, 0.02]; // Level 1, 2, 3

  calculateSplits(tradeFee: number, ctx: CommissionContext): Split[] {
    const token = ctx.token ?? 'XP';
    const splits: Split[] = [];

    // User cashback (level 0)
    if (ctx.userCashbackRate > 0) {
      const amount = tradeFee * ctx.userCashbackRate;
      if (amount > 0) {
        splits.push({
          beneficiaryId: ctx.userId,
          level: 0,
          rate: ctx.userCashbackRate,
          amount,
          token,
        });
      }
    }

    // Upline commissions (levels 1-3)
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
        });
      }
    }

    return splits;
  }
}

