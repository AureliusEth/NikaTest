import { CommissionPolicy, CommissionContext, Split } from '../../domain/policies';
export declare class DefaultPolicy implements CommissionPolicy {
    private readonly uplineRates;
    calculateSplits(tradeFee: number, ctx: CommissionContext): Split[];
}
