import type { CommissionPolicy, CommissionContext, Split } from '../../domain/policies';
import type { CommissionService as ICommissionService } from '../../domain/services/commission.service';
export declare class CommissionService implements ICommissionService {
    private readonly policy;
    constructor(policy: CommissionPolicy);
    computeSplits(tradeFee: number, ctx: CommissionContext): Split[];
}
