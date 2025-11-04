import { CommissionPolicy, CommissionContext, Split } from '../../domain/policies';
export declare class DefaultPolicy implements CommissionPolicy {
    private readonly uplineRates;
    private readonly TREASURY_BENEFICIARY;
    calculateSplits(tradeFee: number, ctx: CommissionContext): Split[];
}
