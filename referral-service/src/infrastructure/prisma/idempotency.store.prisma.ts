import { Injectable } from '@nestjs/common';
import type { IdempotencyStore } from '../../application/ports/repositories';
import { PrismaService } from './services/prisma.service';

@Injectable()
export class PrismaIdempotencyStore implements IdempotencyStore {
  constructor(private readonly prisma: PrismaService) {}

  async exists(key: string): Promise<boolean> {
    const found = await this.prisma.idempotencyKey.findUnique({ where: { key }, select: { key: true } });
    return !!found;
  }

  async put(key: string): Promise<void> {
    await this.prisma.idempotencyKey.create({ data: { key } });
  }
}




