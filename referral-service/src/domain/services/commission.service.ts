import { CommissionPolicy, CommissionContext, Split } from '../policies/commission-policy';

export class CommissionService {
  constructor(private readonly policy: CommissionPolicy) {}

  computeSplits(tradeFee: number, ctx: CommissionContext): Split[] {
    if (tradeFee < 0) throw new Error('Fee cannot be negative');
    return this.policy.calculateSplits(tradeFee, ctx);
  }
}




