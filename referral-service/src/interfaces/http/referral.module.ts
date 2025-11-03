import { Module } from '@nestjs/common';
import { ReferralController } from './referral.controller';
import { UserController } from './user.controller';
import { TradesController } from './trades.controller';
import { AuthController } from './auth.controller';
import { MerkleController } from './merkle.controller';
import { ReferralAppService } from '../../application/referral.app.service';
import { TradesAppService } from '../../application/trades.app.service';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { BlockchainModule } from '../../infrastructure/blockchain/blockchain.module';
import { ReferralService } from '../../infrastructure/services/referral.service';
import { CommissionService } from '../../infrastructure/services/commission.service';
import { MerkleTreeService } from '../../infrastructure/services/merkle-tree.service';
import { FeeBundlingService } from '../../infrastructure/services/fee-bundling.service';
import { ScheduledTasksService } from '../../infrastructure/services/scheduled-tasks.service';
import { ClaimService } from '../../infrastructure/services/claim.service';
import { DefaultPolicy } from '../../infrastructure/policies/default-policy';
import { AuthService } from '../../common/auth/auth.service';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';

@Module({
  imports: [PrismaModule, BlockchainModule],
  controllers: [ReferralController, TradesController, UserController, AuthController, MerkleController],
  providers: [
    ReferralAppService,
    TradesAppService,
    ReferralService,
    CommissionService,
    MerkleTreeService,
    FeeBundlingService,
    ScheduledTasksService,
    ClaimService,
    DefaultPolicy,
    AuthService,
    SessionAuthGuard,
  ],
  exports: [ReferralAppService, TradesAppService, AuthService, MerkleTreeService],
})
export class ReferralModule {}


