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
exports.ReferralAppService = void 0;
const common_1 = require("@nestjs/common");
const tokens_1 = require("./tokens");
let ReferralAppService = class ReferralAppService {
    userRepo;
    refRepo;
    ledgerRepo;
    idem;
    constructor(userRepo, refRepo, ledgerRepo, idem) {
        this.userRepo = userRepo;
        this.refRepo = refRepo;
        this.ledgerRepo = ledgerRepo;
        this.idem = idem;
    }
    async createOrGetReferralCode(userId) {
        return this.userRepo.createOrGetReferralCode(userId);
    }
    async setUserEmail(userId, email) {
        await this.userRepo.setEmail(userId, email);
    }
    async registerReferralByCode(userId, code) {
        const ref = await this.userRepo.findByReferralCode(code);
        if (!ref)
            throw new Error('Referral code not found');
        if (userId === ref.id)
            throw new Error('Cannot self-refer');
        if (await this.refRepo.hasReferrer(userId))
            throw new Error('Referrer already set');
        const referrerAncestors = await this.refRepo.getAncestors(ref.id, 10);
        if (referrerAncestors.includes(userId))
            throw new Error('Cycle detected');
        const level = (referrerAncestors.length ?? 0) + 1;
        if (level > 3)
            throw new Error('Depth exceeds 3 levels');
        await this.refRepo.createLink(ref.id, userId, level);
        return level;
    }
    async getNetwork(userId) {
        const l1 = await this.findRefereesAtLevel(userId, 1);
        const l2 = await this.findRefereesAtLevel(userId, 2);
        const l3 = await this.findRefereesAtLevel(userId, 3);
        return { level1: l1, level2: l2, level3: l3 };
    }
    async findRefereesAtLevel(userId, level) {
        if (level === 1)
            return this.refRepo.getDirectReferees(userId);
        if (level === 2) {
            const l1 = await this.refRepo.getDirectReferees(userId);
            const all = await Promise.all(l1.map(u => this.refRepo.getDirectReferees(u)));
            return all.flat();
        }
        if (level === 3) {
            const l2 = await this.findRefereesAtLevel(userId, 2);
            const all = await Promise.all(l2.map(u => this.refRepo.getDirectReferees(u)));
            return all.flat();
        }
        return [];
    }
    async getEarnings(userId) {
        return this.ledgerRepo.getEarningsSummary(userId);
    }
};
exports.ReferralAppService = ReferralAppService;
exports.ReferralAppService = ReferralAppService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(tokens_1.TOKENS.UserRepository)),
    __param(1, (0, common_1.Inject)(tokens_1.TOKENS.ReferralRepository)),
    __param(2, (0, common_1.Inject)(tokens_1.TOKENS.LedgerRepository)),
    __param(3, (0, common_1.Inject)(tokens_1.TOKENS.IdempotencyStore)),
    __metadata("design:paramtypes", [Object, Object, Object, Object])
], ReferralAppService);
//# sourceMappingURL=referral.app.service.js.map