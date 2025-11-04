import { CommissionContext, Split } from '../policies/commission-policy';
export interface CommissionService {
    computeSplits(tradeFee: number, ctx: CommissionContext): Split[];
}
