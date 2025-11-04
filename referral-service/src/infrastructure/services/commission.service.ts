import type {
  CommissionPolicy,
  CommissionContext,
  Split,
} from '../../domain/policies';
import type { CommissionService as ICommissionService } from '../../domain/services/commission.service';

/**
 * CommissionService Implementation (Infrastructure Layer)
 *
 * Implements the domain's CommissionService interface.
 * Uses a pluggable CommissionPolicy (Strategy pattern).
 */
export class CommissionService implements ICommissionService {
  constructor(private readonly policy: CommissionPolicy) {}

  computeSplits(tradeFee: number, ctx: CommissionContext): Split[] {
    if (tradeFee < 0) {
      throw new Error('Fee cannot be negative');
    }
    return this.policy.calculateSplits(tradeFee, ctx);
  }
}
