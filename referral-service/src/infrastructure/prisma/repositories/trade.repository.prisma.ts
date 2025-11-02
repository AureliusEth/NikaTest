import { Injectable } from '@nestjs/common';
import type { TradesRepository } from '../../../application/ports/repositories';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class PrismaTradesRepository implements TradesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createTrade(tradeId: string, userId: string, feeAmount: number): Promise<void> {
    await this.prisma.trade.create({ data: { id: tradeId, userId, feeAmount } });
  }
}



