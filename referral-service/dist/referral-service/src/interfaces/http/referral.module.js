"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferralModule = void 0;
const common_1 = require("@nestjs/common");
const referral_controller_1 = require("./referral.controller");
const user_controller_1 = require("./user.controller");
const trades_controller_1 = require("./trades.controller");
const auth_controller_1 = require("./auth.controller");
const merkle_controller_1 = require("./merkle.controller");
const referral_app_service_1 = require("../../application/referral.app.service");
const trades_app_service_1 = require("../../application/trades.app.service");
const prisma_module_1 = require("../../infrastructure/prisma/prisma.module");
const blockchain_module_1 = require("../../infrastructure/blockchain/blockchain.module");
const referral_service_1 = require("../../infrastructure/services/referral.service");
const commission_service_1 = require("../../infrastructure/services/commission.service");
const merkle_tree_service_1 = require("../../infrastructure/services/merkle-tree.service");
const fee_bundling_service_1 = require("../../infrastructure/services/fee-bundling.service");
const scheduled_tasks_service_1 = require("../../infrastructure/services/scheduled-tasks.service");
const claim_service_1 = require("../../infrastructure/services/claim.service");
const default_policy_1 = require("../../infrastructure/policies/default-policy");
const auth_service_1 = require("../../common/auth/auth.service");
const session_auth_guard_1 = require("../../common/guards/session-auth.guard");
let ReferralModule = class ReferralModule {
};
exports.ReferralModule = ReferralModule;
exports.ReferralModule = ReferralModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, blockchain_module_1.BlockchainModule],
        controllers: [
            referral_controller_1.ReferralController,
            trades_controller_1.TradesController,
            user_controller_1.UserController,
            auth_controller_1.AuthController,
            merkle_controller_1.MerkleController,
        ],
        providers: [
            referral_app_service_1.ReferralAppService,
            trades_app_service_1.TradesAppService,
            referral_service_1.ReferralService,
            default_policy_1.DefaultPolicy,
            {
                provide: commission_service_1.CommissionService,
                useFactory: (policy) => new commission_service_1.CommissionService(policy),
                inject: [default_policy_1.DefaultPolicy],
            },
            merkle_tree_service_1.MerkleTreeService,
            fee_bundling_service_1.FeeBundlingService,
            scheduled_tasks_service_1.ScheduledTasksService,
            claim_service_1.ClaimService,
            auth_service_1.AuthService,
            session_auth_guard_1.SessionAuthGuard,
        ],
        exports: [
            referral_app_service_1.ReferralAppService,
            trades_app_service_1.TradesAppService,
            auth_service_1.AuthService,
            merkle_tree_service_1.MerkleTreeService,
        ],
    })
], ReferralModule);
//# sourceMappingURL=referral.module.js.map