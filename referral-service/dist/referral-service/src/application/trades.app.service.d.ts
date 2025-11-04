import type { IdempotencyStore, LedgerRepository, TradesRepository, ReferralRepository, UserRepository } from './ports/repositories';
import { CommissionService } from '../infrastructure/services/commission.service';
import { ClaimService } from '../infrastructure/services/claim.service';
export declare class TradesAppService {
    private readonly tradesRepo;
    private readonly idem;
    private readonly ledgerRepo;
    private readonly referralRepo;
    private readonly userRepo;
    private readonly claimService;
    private readonly commission;
    constructor(tradesRepo: TradesRepository, idem: IdempotencyStore, ledgerRepo: LedgerRepository, referralRepo: ReferralRepository, userRepo: UserRepository, claimService: ClaimService, commission: CommissionService);
    processTrade(params: {
        tradeId: string;
        userId: string;
        feeAmount: number;
        token?: string;
        chain?: 'EVM' | 'SVM';
    }): Promise<void>;
}
