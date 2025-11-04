import type { ReferralRepository, UserRepository, LedgerRepository, IdempotencyStore } from './ports/repositories';
import { PrismaService } from '../infrastructure/prisma/services/prisma.service';
import { ReferralService } from '../infrastructure/services/referral.service';
export declare class ReferralAppService {
    private readonly userRepo;
    private readonly refRepo;
    private readonly ledgerRepo;
    private readonly idem;
    private readonly prisma;
    private readonly referralService;
    constructor(userRepo: UserRepository, refRepo: ReferralRepository, ledgerRepo: LedgerRepository, idem: IdempotencyStore, prisma: PrismaService, referralService: ReferralService);
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
        totalEarned: number;
        totalClaimed: number;
        unclaimedXP: number;
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
    getHourlyEarnings(userId: string, hours?: number): Promise<Array<{
        hour: string;
        timestamp: number;
        earnings: number;
    }>>;
}
