import type { IdempotencyStore } from '../../application/ports/repositories';
import { PrismaService } from './services/prisma.service';
export declare class PrismaIdempotencyStore implements IdempotencyStore {
    private readonly prisma;
    constructor(prisma: PrismaService);
    exists(key: string): Promise<boolean>;
    put(key: string): Promise<void>;
}
