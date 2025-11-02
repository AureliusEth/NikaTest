import type { UserRepository, UserRecord } from '../../application/ports/repositories';
import { PrismaService } from './prisma.service';
export declare class PrismaUserRepository implements UserRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findById(userId: string): Promise<UserRecord | null>;
    findByReferralCode(code: string): Promise<UserRecord | null>;
    createOrGetReferralCode(userId: string): Promise<string>;
    setEmail(userId: string, email: string): Promise<void>;
}
