import { Injectable } from '@nestjs/common';
import type { LedgerEntryDTO, LedgerRepository } from '../../../application/ports/repositories';
import { PrismaService } from '../services/prisma.service';

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

  async getEarningsFromReferee(userId: string, refereeId: string): Promise<{ total: number; totalFees: number; entries: Array<{ tradeId: string; amount: number; rate: number; level: number; createdAt: Date }> }> {
    // Get all trades made by the referee
    const trades = await this.prisma.trade.findMany({
      where: { userId: refereeId },
      select: { id: true, feeAmount: true },
    });

    const tradeIds = trades.map(t => t.id);
    const tradeFeeMap = new Map(trades.map(t => [t.id, Number(t.feeAmount)]));

    // Get all commission entries for this user from trades made by the referee
    const entries = await this.prisma.commissionLedgerEntry.findMany({
      where: {
        beneficiaryId: userId,
        sourceTradeId: { in: tradeIds },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        sourceTradeId: true,
        amount: true,
        rate: true,
        level: true,
        createdAt: true,
      },
    });

    let total = 0;
    const totalFees = trades.reduce((sum, t) => sum + Number(t.feeAmount), 0);

    const entryList = entries.map(e => {
      const amount = Number(e.amount);
      total += amount;
      return {
        tradeId: e.sourceTradeId,
        amount,
        rate: Number(e.rate),
        level: e.level,
        createdAt: e.createdAt,
      };
    });

    return { total, totalFees, entries: entryList };
  }
}


