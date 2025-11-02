import type { LedgerEntryDTO, LedgerRepository } from '../../application/ports/repositories';
import { PrismaService } from './prisma.service';
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
}
