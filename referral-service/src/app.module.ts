import { Module } from '@nestjs/common';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { ReferralModule } from './interfaces/http/referral.module';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60, limit: 100 }] }),
    PrismaModule,
    ReferralModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
