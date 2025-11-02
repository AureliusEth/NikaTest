/**
 * Split represents a commission or cashback payment.
 */
export interface Split {
  beneficiaryId: string;
  level: number; // 0 = cashback; 1-3 = upline levels
  rate: number; // fraction 0..1 (e.g., 0.30 = 30%)
  amount: number; // calculated commission amount
  token: string; // token type (e.g., 'XP', 'USDC')
}

/**
 * CommissionContext provides all information needed to calculate commission splits.
 */
export interface CommissionContext {
  userId: string; // The trader who generated the fee
  userCashbackRate: number; // User's cashback rate (0..1)
  ancestors: string[]; // Upline referrers (closest first, up to 3)
  token?: string; // Token type (defaults to 'XP')
}

/**
 * CommissionPolicy Interface (Domain Layer)
 * 
 * Defines the contract for calculating commission splits.
 * This allows different commission structures (e.g., standard, KOL, VIP).
 * 
 * Implementations live in the infrastructure layer.
 */
export interface CommissionPolicy {
  /**
   * Calculates commission splits for a given trade fee.
   * @param tradeFee - The total trade fee amount
   * @param ctx - Context with user info and referral chain
   * @returns Array of splits (cashback + upline commissions)
   */
  calculateSplits(tradeFee: number, ctx: CommissionContext): Split[];
}




