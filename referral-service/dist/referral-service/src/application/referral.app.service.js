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
const prisma_service_1 = require("../infrastructure/prisma/services/prisma.service");
const referral_service_1 = require("../infrastructure/services/referral.service");
let ReferralAppService = class ReferralAppService {
    userRepo;
    refRepo;
    ledgerRepo;
    idem;
    prisma;
    referralService;
    constructor(userRepo, refRepo, ledgerRepo, idem, prisma, referralService) {
        this.userRepo = userRepo;
        this.refRepo = refRepo;
        this.ledgerRepo = ledgerRepo;
        this.idem = idem;
        this.prisma = prisma;
        this.referralService = referralService;
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
        const level = await this.referralService.computeLevelOrThrow(userId, ref.id);
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
            const all = await Promise.all(l1.map((u) => this.refRepo.getDirectReferees(u)));
            return all.flat();
        }
        if (level === 3) {
            const l2 = await this.findRefereesAtLevel(userId, 2);
            const all = await Promise.all(l2.map((u) => this.refRepo.getDirectReferees(u)));
            return all.flat();
        }
        return [];
    }
    async getEarnings(userId) {
        return this.ledgerRepo.getEarningsSummary(userId);
    }
    async getDashboard(userId) {
        const earnings = await this.ledgerRepo.getEarningsSummary(userId);
        const refereeEarnings = await this.ledgerRepo.getRefereeEarnings(userId);
        const claimed = await this.prisma.claimRecord.aggregate({
            where: { userId, token: 'XP' },
            _sum: { amount: true },
        });
        const totalClaimed = Number(claimed._sum.amount || 0);
        const unclaimedXP = earnings.total - totalClaimed;
        const referrals = refereeEarnings.map((r) => ({
            userId: r.refereeId,
            level: r.level,
            totalEarned: r.totalEarned,
            tradeCount: r.tradeCount,
            percentage: earnings.total > 0 ? (r.totalEarned / earnings.total) * 100 : 0,
        }));
        return {
            totalXP: unclaimedXP,
            totalEarned: earnings.total,
            totalClaimed,
            unclaimedXP,
            referrals,
        };
    }
    async getActivity(userId, limit) {
        return this.ledgerRepo.getRecentActivity(userId, limit);
    }
    async getHourlyEarnings(userId, hours = 24) {
        const now = new Date();
        const startTime = new Date(now.getTime() - hours * 60 * 60 * 1000);
        const results = await this.prisma.$queryRaw `
      SELECT 
        DATE_TRUNC('hour', l."createdAt")::text as hour,
        COALESCE(SUM(l.amount), 0)::text as earnings
      FROM "CommissionLedgerEntry" l
      WHERE l."beneficiaryId" = ${userId}
        AND l.destination = 'claimable'
        AND l.token = 'XP'
        AND l."createdAt" >= ${startTime}
      GROUP BY DATE_TRUNC('hour', l."createdAt")
      ORDER BY hour ASC
    `;
        const hourlyData = new Map();
        for (let i = 0; i < hours; i++) {
            const hourDate = new Date(startTime.getTime() + i * 60 * 60 * 1000);
            const hourKey = hourDate.toISOString().slice(0, 13) + ':00:00';
            hourlyData.set(hourKey, 0);
        }
        for (const row of results) {
            hourlyData.set(row.hour, parseFloat(row.earnings));
        }
        return Array.from(hourlyData.entries()).map(([hour, earnings]) => ({
            hour,
            timestamp: new Date(hour).getTime(),
            earnings,
        }));
    }
};
exports.ReferralAppService = ReferralAppService;
exports.ReferralAppService = ReferralAppService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(tokens_1.TOKENS.UserRepository)),
    __param(1, (0, common_1.Inject)(tokens_1.TOKENS.ReferralRepository)),
    __param(2, (0, common_1.Inject)(tokens_1.TOKENS.LedgerRepository)),
    __param(3, (0, common_1.Inject)(tokens_1.TOKENS.IdempotencyStore)),
    __metadata("design:paramtypes", [Object, Object, Object, Object, prisma_service_1.PrismaService,
        referral_service_1.ReferralService])
], ReferralAppService);
//# sourceMappingURL=referral.app.service.js.map