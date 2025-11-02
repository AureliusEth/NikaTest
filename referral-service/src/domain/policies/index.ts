/**
 * Commission Policy Interfaces
 * 
 * The policy interface belongs in domain.
 * Concrete implementations (DefaultPolicy, VIPPolicy, etc.) belong in infrastructure.
 */

export interface Split {
  beneficiaryId: string;
  level: number; // 0 = cashback; 1-3 = upline levels
  rate: number; // fraction 0..1
  amount: number;
  token: string;
}

export interface CommissionContext {
  userId: string;
  userCashbackRate: number; // 0..1
  ancestors: string[]; // uplines, closest first
  token?: string;
}

/**
 * Policy Interface - Strategy Pattern
 * 
 * Different commission policies can be implemented:
 * - DefaultPolicy: 30%/3%/2% for levels 1/2/3
 * - VIPPolicy: 35%/5%/3% for VIP users
 * - PromotionalPolicy: 40%/5%/5% during campaigns
 */
export interface CommissionPolicy {
  calculateSplits(tradeFee: number, ctx: CommissionContext): Split[];
}

