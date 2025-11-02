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
exports.PrismaUserRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("./prisma.service");
let PrismaUserRepository = class PrismaUserRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findById(userId) {
        const u = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!u)
            return null;
        return { id: u.id, email: u.email ?? undefined, feeCashbackRate: Number(u.feeCashbackRate) };
    }
    async findByReferralCode(code) {
        const u = await this.prisma.user.findUnique({ where: { referralCode: code } });
        if (!u)
            return null;
        return { id: u.id, email: u.email ?? undefined, feeCashbackRate: Number(u.feeCashbackRate) };
    }
    async createOrGetReferralCode(userId) {
        const existing = await this.prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
        if (existing?.referralCode)
            return existing.referralCode;
        const code = `ref_${Math.random().toString(36).slice(2, 10)}`;
        const updated = await this.prisma.user.upsert({
            where: { id: userId },
            update: { referralCode: code },
            create: { id: userId, email: `${userId}@example.com`, referralCode: code },
            select: { referralCode: true }
        });
        return updated.referralCode;
    }
    async setEmail(userId, email) {
        await this.prisma.user.upsert({
            where: { id: userId },
            update: { email },
            create: { id: userId, email },
        });
    }
};
exports.PrismaUserRepository = PrismaUserRepository;
exports.PrismaUserRepository = PrismaUserRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PrismaUserRepository);
//# sourceMappingURL=user.repository.prisma.js.map