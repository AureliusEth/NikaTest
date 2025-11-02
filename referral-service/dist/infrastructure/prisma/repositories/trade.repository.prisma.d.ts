import type { TradesRepository } from '../../../application/ports/repositories';
import { PrismaService } from '../services/prisma.service';
export declare class PrismaTradesRepository implements TradesRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createTrade(tradeId: string, userId: string, feeAmount: number): Promise<void>;
}
