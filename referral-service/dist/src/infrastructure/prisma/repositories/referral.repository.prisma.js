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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaReferralRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../services/prisma.service");
let PrismaReferralRepository = class PrismaReferralRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getAncestors(userId, maxLevels) {
        const ancestors = [];
        let current = userId;
        while (ancestors.length < maxLevels) {
            const link = await this.prisma.referralLink.findUnique({ where: { refereeId: current } });
            if (!link)
                break;
            ancestors.push(link.referrerId);
            current = link.referrerId;
        }
        return ancestors;
    }
    async hasReferrer(userId) {
        const link = await this.prisma.referralLink.findUnique({ where: { refereeId: userId }, select: { refereeId: true } });
        return !!link;
    }
    async createLink(referrerId, refereeId, level) {
        await this.prisma.referralLink.create({ data: { referrerId, refereeId, level } });
    }
    async getDirectReferees(userId) {
        const rows = await this.prisma.referralLink.findMany({ where: { referrerId: userId }, select: { refereeId: true } });
        return rows.map(r => r.refereeId);
    }
};
exports.PrismaReferralRepository = PrismaReferralRepository;
exports.PrismaReferralRepository = PrismaReferralRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PrismaReferralRepository);
//# sourceMappingURL=referral.repository.prisma.js.map