export interface Split {
  beneficiaryId: string;
  level: number; // 0 cashback; 1..3 uplines
  rate: number; // fraction 0..1
  amount: number;
  token: string;
}

export interface CommissionContext {
  userId: string;
  userCashbackRate: number; // 0..1
  ancestors: string[]; // closest first
  token?: string;
}

export interface CommissionPolicy {
  calculateSplits(tradeFee: number, ctx: CommissionContext): Split[];
}

export class DefaultPolicy implements CommissionPolicy {
  private readonly uplines = [0.30, 0.03, 0.02];
  calculateSplits(tradeFee: number, ctx: CommissionContext): Split[] {
    const token = ctx.token ?? 'XP';
    const splits: Split[] = [];
    if (ctx.userCashbackRate > 0) {
      const amount = tradeFee * ctx.userCashbackRate;
      if (amount > 0) splits.push({ beneficiaryId: ctx.userId, level: 0, rate: ctx.userCashbackRate, amount, token });
    }
    for (let i = 0; i < this.uplines.length; i++) {
      const ancestorId = ctx.ancestors[i];
      if (!ancestorId) break;
      const rate = this.uplines[i];
      const amount = tradeFee * rate;
      if (amount > 0) splits.push({ beneficiaryId: ancestorId, level: i + 1, rate, amount, token });
    }
    return splits;
  }
}




