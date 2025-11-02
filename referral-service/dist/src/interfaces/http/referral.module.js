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
const referral_app_service_1 = require("../../application/referral.app.service");
const trades_app_service_1 = require("../../application/trades.app.service");
const prisma_module_1 = require("../../infrastructure/prisma/prisma.module");
const referral_service_1 = require("../../infrastructure/services/referral.service");
const commission_service_1 = require("../../infrastructure/services/commission.service");
const default_policy_1 = require("../../infrastructure/policies/default-policy");
let ReferralModule = class ReferralModule {
};
exports.ReferralModule = ReferralModule;
exports.ReferralModule = ReferralModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        controllers: [referral_controller_1.ReferralController, trades_controller_1.TradesController, user_controller_1.UserController],
        providers: [
            referral_app_service_1.ReferralAppService,
            trades_app_service_1.TradesAppService,
            referral_service_1.ReferralService,
            commission_service_1.CommissionService,
            default_policy_1.DefaultPolicy,
        ],
        exports: [referral_app_service_1.ReferralAppService, trades_app_service_1.TradesAppService],
    })
], ReferralModule);
//# sourceMappingURL=referral.module.js.map