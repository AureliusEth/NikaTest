"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("./services/prisma.service");
const tokens_1 = require("../../application/tokens");
const user_repository_prisma_1 = require("./repositories/user.repository.prisma");
const referral_repository_prisma_1 = require("./repositories/referral.repository.prisma");
const ledger_repository_prisma_1 = require("./repositories/ledger.repository.prisma");
const idempotency_store_prisma_1 = require("./idempotency.store.prisma");
const trade_repository_prisma_1 = require("./repositories/trade.repository.prisma");
let PrismaModule = class PrismaModule {
};
exports.PrismaModule = PrismaModule;
exports.PrismaModule = PrismaModule = __decorate([
    (0, common_1.Module)({
        providers: [
            prisma_service_1.PrismaService,
            { provide: tokens_1.TOKENS.UserRepository, useClass: user_repository_prisma_1.PrismaUserRepository },
            { provide: tokens_1.TOKENS.ReferralRepository, useClass: referral_repository_prisma_1.PrismaReferralRepository },
            { provide: tokens_1.TOKENS.LedgerRepository, useClass: ledger_repository_prisma_1.PrismaLedgerRepository },
            { provide: tokens_1.TOKENS.IdempotencyStore, useClass: idempotency_store_prisma_1.PrismaIdempotencyStore },
            { provide: tokens_1.TOKENS.TradesRepository, useClass: trade_repository_prisma_1.PrismaTradesRepository },
        ],
        exports: [
            prisma_service_1.PrismaService,
            tokens_1.TOKENS.UserRepository,
            tokens_1.TOKENS.ReferralRepository,
            tokens_1.TOKENS.LedgerRepository,
            tokens_1.TOKENS.IdempotencyStore,
            tokens_1.TOKENS.TradesRepository,
        ],
    })
], PrismaModule);
//# sourceMappingURL=prisma.module.js.map