import { Injectable } from '@nestjs/common';
import type { LedgerEntryDTO, LedgerRepository } from '../../application/ports/repositories';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaLedgerRepository implements LedgerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async recordEntries(entries: LedgerEntryDTO[]): Promise<void> {
    if (entries.length === 0) return;
    await this.prisma.commissionLedgerEntry.createMany({
      data: entries.map(e => ({
        beneficiaryId: e.beneficiaryId,
        sourceTradeId: e.sourceTradeId,
        level: e.level,
        rate: e.rate,
        amount: e.amount,
        token: e.token,
      })),
      skipDuplicates: true,
    });
  }

  async getEarningsSummary(userId: string, range?: { from?: Date; to?: Date }): Promise<{ total: number; byLevel: Record<number, number> }> {
    const where: any = { beneficiaryId: userId };
    if (range?.from || range?.to) {
      where.createdAt = {};
      if (range.from) where.createdAt.gte = range.from;
      if (range.to) where.createdAt.lte = range.to;
    }
    const rows = await this.prisma.commissionLedgerEntry.groupBy({ by: ['level'], _sum: { amount: true }, where });
    const byLevel: Record<number, number> = {} as any;
    let total = 0;
    for (const r of rows) {
      const val = Number(r._sum.amount ?? 0);
      byLevel[r.level] = val;
      total += val;
    }
    return { total, byLevel };
  }
}


