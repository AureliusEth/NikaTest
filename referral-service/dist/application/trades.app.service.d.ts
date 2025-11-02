import type { IdempotencyStore, LedgerRepository, TradesRepository, ReferralRepository, UserRepository } from './ports/repositories';
export declare class TradesAppService {
    private readonly tradesRepo;
    private readonly idem;
    private readonly ledgerRepo;
    private readonly referralRepo;
    private readonly userRepo;
    private readonly commission;
    constructor(tradesRepo: TradesRepository, idem: IdempotencyStore, ledgerRepo: LedgerRepository, referralRepo: ReferralRepository, userRepo: UserRepository);
    processTrade(params: {
        tradeId: string;
        userId: string;
        feeAmount: number;
        token?: string;
    }): Promise<void>;
}
