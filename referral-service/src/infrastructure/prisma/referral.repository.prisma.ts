import { Injectable } from '@nestjs/common';
import type { ReferralRepository } from '../../../application/ports/repositories';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PrismaReferralRepository implements ReferralRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getAncestors(userId: string, maxLevels: number): Promise<string[]> {
    const ancestors: string[] = [];
    let current = userId;
    while (ancestors.length < maxLevels) {
      const link = await this.prisma.referralLink.findUnique({ where: { refereeId: current } });
      if (!link) break;
      ancestors.push(link.referrerId);
      current = link.referrerId;
    }
    return ancestors;
  }

  async hasReferrer(userId: string): Promise<boolean> {
    const link = await this.prisma.referralLink.findUnique({ where: { refereeId: userId }, select: { refereeId: true } });
    return !!link;
    }

  async createLink(referrerId: string, refereeId: string, level: number): Promise<void> {
    await this.prisma.referralLink.create({ data: { referrerId, refereeId, level } });
  }

  async getDirectReferees(userId: string): Promise<string[]> {
    const rows = await this.prisma.referralLink.findMany({ where: { referrerId: userId }, select: { refereeId: true } });
    return rows.map(r => r.refereeId);
  }
}




