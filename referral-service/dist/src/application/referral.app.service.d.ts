import type { ReferralRepository, UserRepository, LedgerRepository, IdempotencyStore } from './ports/repositories';
export declare class ReferralAppService {
    private readonly userRepo;
    private readonly refRepo;
    private readonly ledgerRepo;
    private readonly idem;
    constructor(userRepo: UserRepository, refRepo: ReferralRepository, ledgerRepo: LedgerRepository, idem: IdempotencyStore);
    createOrGetReferralCode(userId: string): Promise<string>;
    setUserEmail(userId: string, email: string): Promise<void>;
    registerReferralByCode(userId: string, code: string): Promise<number>;
    getNetwork(userId: string): Promise<{
        level1: string[];
        level2: string[];
        level3: string[];
    }>;
    private findRefereesAtLevel;
    getEarnings(userId: string): Promise<{
        total: number;
        byLevel: Record<number, number>;
    }>;
    getDashboard(userId: string): Promise<{
        totalXP: number;
        referrals: Array<{
            userId: string;
            level: number;
            totalEarned: number;
            tradeCount: number;
            percentage: number;
        }>;
    }>;
    getActivity(userId: string, limit?: number): Promise<Array<{
        tradeId: string;
        userId: string;
        feeAmount: number;
        earnedAmount: number;
        level: number;
        createdAt: Date;
    }>>;
}
