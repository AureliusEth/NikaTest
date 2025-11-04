import { Injectable } from '@nestjs/common';
import type {
  LedgerEntryDTO,
  LedgerRepository,
  RefereeEarnings,
  TradeActivity,
} from '../../../application/ports/repositories';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class PrismaLedgerRepository implements LedgerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async recordEntries(entries: LedgerEntryDTO[]): Promise<void> {
    if (entries.length === 0) return;
    await this.prisma.commissionLedgerEntry.createMany({
      data: entries.map((e) => ({
        beneficiaryId: e.beneficiaryId,
        sourceTradeId: e.sourceTradeId,
        level: e.level,
        rate: e.rate,
        amount: e.amount,
        token: e.token,
        destination: e.destination,
      })),
      skipDuplicates: true,
    });
  }

  async getEarningsSummary(
    userId: string,
    range?: { from?: Date; to?: Date },
  ): Promise<{ total: number; byLevel: Record<number, number> }> {
    const where: any = { beneficiaryId: userId };
    if (range?.from || range?.to) {
      where.createdAt = {};
      if (range.from) where.createdAt.gte = range.from;
      if (range.to) where.createdAt.lte = range.to;
    }
    const rows = await this.prisma.commissionLedgerEntry.groupBy({
      by: ['level'],
      _sum: { amount: true },
      where,
    });
    const byLevel: Record<number, number> = {} as any;
    let total = 0;
    for (const r of rows) {
      const val = Number(r._sum.amount ?? 0);
      byLevel[r.level] = val;
      total += val;
    }
    return { total, byLevel };
  }

  async getRefereeEarnings(userId: string): Promise<RefereeEarnings[]> {
    // Get earnings grouped by referee (sourceTradeId -> userId from Trade)
    // We need to join ledger entries with trades to get the trader's info
    // RAW QUERY JUSTIFIED: Complex aggregation requirements:
    // 1. JOIN CommissionLedgerEntry with Trade
    // 2. GROUP BY multiple fields (userId, level)
    // 3. Multiple aggregations (SUM, COUNT DISTINCT)
    // 4. ORDER BY with aggregation in the sort
    // Prisma's groupBy() cannot handle this complexity.
    const results = await this.prisma.$queryRaw<
      Array<{
        userId: string;
        level: number;
        totalEarned: string;
        tradeCount: string;
      }>
    >`
      SELECT 
        t."userId",
        l.level,
        SUM(l.amount)::text as "totalEarned",
        COUNT(DISTINCT l."sourceTradeId")::text as "tradeCount"
      FROM "CommissionLedgerEntry" l
      INNER JOIN "Trade" t ON l."sourceTradeId" = t.id
      WHERE l."beneficiaryId" = ${userId}
        AND l.level > 0
      GROUP BY t."userId", l.level
      ORDER BY l.level ASC, SUM(l.amount) DESC
    `;

    return results.map((r) => ({
      refereeId: r.userId,
      level: r.level,
      totalEarned: parseFloat(r.totalEarned),
      tradeCount: parseInt(r.tradeCount, 10),
    }));
  }

  async getRecentActivity(
    userId: string,
    limit: number = 50,
  ): Promise<TradeActivity[]> {
    const entries = await this.prisma.commissionLedgerEntry.findMany({
      where: { beneficiaryId: userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Get trade details for each entry
    const tradeIds = [...new Set(entries.map((e) => e.sourceTradeId))];
    const trades = await this.prisma.trade.findMany({
      where: { id: { in: tradeIds } },
    });

    const tradeMap = new Map(trades.map((t) => [t.id, t]));

    return entries
      .map((e) => {
        const trade = tradeMap.get(e.sourceTradeId);
        if (!trade) return null;
        return {
          tradeId: e.sourceTradeId,
          userId: trade.userId,
          feeAmount: Number(trade.feeAmount),
          earnedAmount: Number(e.amount),
          level: e.level,
          createdAt: e.createdAt,
        };
      })
      .filter((a): a is TradeActivity => a !== null);
  }
}
