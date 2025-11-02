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
exports.PrismaLedgerRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../services/prisma.service");
let PrismaLedgerRepository = class PrismaLedgerRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async recordEntries(entries) {
        if (entries.length === 0)
            return;
        await this.prisma.commissionLedgerEntry.createMany({
            data: entries.map(e => ({
                beneficiaryId: e.beneficiaryId,
                sourceTradeId: e.sourceTradeId,
                level: e.level,
                rate: e.rate,
                amount: e.amount,
                token: e.token,
            })),
            skipDuplicates: true,
        });
    }
    async getEarningsSummary(userId, range) {
        const where = { beneficiaryId: userId };
        if (range?.from || range?.to) {
            where.createdAt = {};
            if (range.from)
                where.createdAt.gte = range.from;
            if (range.to)
                where.createdAt.lte = range.to;
        }
        const rows = await this.prisma.commissionLedgerEntry.groupBy({ by: ['level'], _sum: { amount: true }, where });
        const byLevel = {};
        let total = 0;
        for (const r of rows) {
            const val = Number(r._sum.amount ?? 0);
            byLevel[r.level] = val;
            total += val;
        }
        return { total, byLevel };
    }
};
exports.PrismaLedgerRepository = PrismaLedgerRepository;
exports.PrismaLedgerRepository = PrismaLedgerRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PrismaLedgerRepository);
//# sourceMappingURL=ledger.repository.prisma.js.map