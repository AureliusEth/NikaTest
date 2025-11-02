import { CommissionPolicy, CommissionContext, Split } from '../../domain/policies/commission-policy';
export declare class CommissionService {
    private readonly policy;
    constructor(policy: CommissionPolicy);
    computeSplits(tradeFee: number, ctx: CommissionContext): Split[];
}
