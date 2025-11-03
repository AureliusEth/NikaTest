import type { LedgerEntryDTO, LedgerRepository, RefereeEarnings, TradeActivity } from '../../../application/ports/repositories';
import { PrismaService } from '../services/prisma.service';
export declare class PrismaLedgerRepository implements LedgerRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    recordEntries(entries: LedgerEntryDTO[]): Promise<void>;
    getEarningsSummary(userId: string, range?: {
        from?: Date;
        to?: Date;
    }): Promise<{
        total: number;
        byLevel: Record<number, number>;
    }>;
    getRefereeEarnings(userId: string): Promise<RefereeEarnings[]>;
    getRecentActivity(userId: string, limit?: number): Promise<TradeActivity[]>;
}
