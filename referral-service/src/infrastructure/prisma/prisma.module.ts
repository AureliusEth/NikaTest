import { Module } from '@nestjs/common';
import { PrismaService } from './services/prisma.service';
import { TOKENS } from '../../application/tokens';
import { PrismaUserRepository } from './repositories/user.repository.prisma';
import { PrismaReferralRepository } from './repositories/referral.repository.prisma';
import { PrismaLedgerRepository } from './repositories/ledger.repository.prisma';
import { PrismaIdempotencyStore } from './idempotency.store.prisma';
import { PrismaTradesRepository } from './repositories/trade.repository.prisma';

@Module({
  providers: [
    PrismaService,
    { provide: TOKENS.UserRepository, useClass: PrismaUserRepository },
    { provide: TOKENS.ReferralRepository, useClass: PrismaReferralRepository },
    { provide: TOKENS.LedgerRepository, useClass: PrismaLedgerRepository },
    { provide: TOKENS.IdempotencyStore, useClass: PrismaIdempotencyStore },
    { provide: TOKENS.TradesRepository, useClass: PrismaTradesRepository },
  ],
  exports: [
    PrismaService,
    TOKENS.UserRepository,
    TOKENS.ReferralRepository,
    TOKENS.LedgerRepository,
    TOKENS.IdempotencyStore,
    TOKENS.TradesRepository,
  ],
})
export class PrismaModule {}


