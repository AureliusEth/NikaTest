import type { ReferralRepository } from '../../../application/ports/repositories';
import { PrismaService } from '../prisma.service';
export declare class PrismaReferralRepository implements ReferralRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getAncestors(userId: string, maxLevels: number): Promise<string[]>;
    hasReferrer(userId: string): Promise<boolean>;
    createLink(referrerId: string, refereeId: string, level: number): Promise<void>;
    getDirectReferees(userId: string): Promise<string[]>;
}
