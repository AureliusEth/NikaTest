"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TradesAppService = void 0;
const common_1 = require("@nestjs/common");
const tokens_1 = require("./tokens");
const commission_service_1 = require("../infrastructure/services/commission.service");
const commission_policy_1 = require("../domain/policies/commission-policy");
let TradesAppService = class TradesAppService {
    tradesRepo;
    idem;
    ledgerRepo;
    referralRepo;
    userRepo;
    commission = new commission_service_1.CommissionService(new commission_policy_1.DefaultPolicy());
    constructor(tradesRepo, idem, ledgerRepo, referralRepo, userRepo) {
        this.tradesRepo = tradesRepo;
        this.idem = idem;
        this.ledgerRepo = ledgerRepo;
        this.referralRepo = referralRepo;
        this.userRepo = userRepo;
    }
    async processTrade(params) {
        const key = `trade:${params.tradeId}`;
        if (await this.idem.exists(key))
            return;
        await this.tradesRepo.createTrade(params.tradeId, params.userId, params.feeAmount);
        const user = await this.userRepo.findById(params.userId);
        const ancestors = await this.referralRepo.getAncestors(params.userId, 3);
        const splits = this.commission.computeSplits(params.feeAmount, {
            userId: params.userId,
            userCashbackRate: user?.feeCashbackRate ?? 0,
            ancestors,
            token: params.token ?? 'XP',
        });
        await this.ledgerRepo.recordEntries(splits.map(s => ({ beneficiaryId: s.beneficiaryId, sourceTradeId: params.tradeId, level: s.level, rate: s.rate, amount: s.amount, token: s.token })));
        await this.idem.put(key);
    }
};
exports.TradesAppService = TradesAppService;
exports.TradesAppService = TradesAppService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(tokens_1.TOKENS.TradesRepository)),
    __param(1, (0, common_1.Inject)(tokens_1.TOKENS.IdempotencyStore)),
    __param(2, (0, common_1.Inject)(tokens_1.TOKENS.LedgerRepository)),
    __param(3, (0, common_1.Inject)(tokens_1.TOKENS.ReferralRepository)),
    __param(4, (0, common_1.Inject)(tokens_1.TOKENS.UserRepository)),
    __metadata("design:paramtypes", [Object, Object, Object, Object, Object])
], TradesAppService);
//# sourceMappingURL=trades.app.service.js.map