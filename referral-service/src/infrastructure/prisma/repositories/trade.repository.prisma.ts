import { Injectable } from '@nestjs/common';
import type { TradesRepository } from '../../../application/ports/repositories';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class PrismaTradesRepository implements TradesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createTrade(tradeId: string, userId: string, feeAmount: number): Promise<void> {
    await this.prisma.trade.create({ data: { id: tradeId, userId, feeAmount } });
  }

  async getTradesByUser(userId: string, limit: number = 50): Promise<Array<{ id: string; feeAmount: number; createdAt: Date }>> {
    const trades = await this.prisma.trade.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, feeAmount: true, createdAt: true },
    });
    return trades.map(t => ({
      id: t.id,
      feeAmount: Number(t.feeAmount),
      createdAt: t.createdAt,
    }));
  }
}



