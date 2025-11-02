import { Injectable } from '@nestjs/common';
import type { UserRepository, UserRecord } from '../../../application/ports/repositories';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(userId: string): Promise<UserRecord | null> {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u) return null;
    return { id: u.id, email: u.email ?? undefined, feeCashbackRate: Number(u.feeCashbackRate) };
  }

  async findByReferralCode(code: string): Promise<UserRecord | null> {
    const u = await this.prisma.user.findUnique({ where: { referralCode: code } });
    if (!u) return null;
    return { id: u.id, email: u.email ?? undefined, feeCashbackRate: Number(u.feeCashbackRate) };
  }

  async createOrGetReferralCode(userId: string): Promise<string> {
    const existing = await this.prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
    if (existing?.referralCode) return existing.referralCode;
    // naive code generator; rely on unique constraint for collisions
    const code = `ref_${Math.random().toString(36).slice(2, 10)}`;
    // Use upsert to create user if doesn't exist
    const updated = await this.prisma.user.upsert({
      where: { id: userId },
      update: { referralCode: code },
      create: { id: userId, email: `${userId}@example.com`, referralCode: code },
      select: { referralCode: true }
    });
    return updated.referralCode as string;
  }

  async setEmail(userId: string, email: string): Promise<void> {
    await this.prisma.user.upsert({
      where: { id: userId },
      update: { email },
      create: { id: userId, email },
    });
  }
}



