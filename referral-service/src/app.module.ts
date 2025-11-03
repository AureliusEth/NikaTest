import { Module } from '@nestjs/common';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { ReferralModule } from './interfaces/http/referral.module';
import { BlockchainModule } from './infrastructure/blockchain/blockchain.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60, limit: 100 }] }),
    PrismaModule,
    BlockchainModule,
    ReferralModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
