import { Module } from '@nestjs/common';
import { ReferralController } from './referral.controller';
import { UserController } from './user.controller';
import { TradesController } from './trades.controller';
import { ReferralAppService } from '../../application/referral.app.service';
import { TradesAppService } from '../../application/trades.app.service';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { ReferralService } from '../../infrastructure/services/referral.service';
import { CommissionService } from '../../infrastructure/services/commission.service';
import { DefaultPolicy } from '../../infrastructure/policies/default-policy';

@Module({
  imports: [PrismaModule],
  controllers: [ReferralController, TradesController, UserController],
  providers: [
    ReferralAppService,
    TradesAppService,
    ReferralService,
    CommissionService,
    DefaultPolicy,
  ],
  exports: [ReferralAppService, TradesAppService],
})
export class ReferralModule {}


