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
                destination: e.destination,
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
    async getRefereeEarnings(userId) {
        const results = await this.prisma.$queryRaw `
      SELECT 
        t."userId",
        l.level,
        SUM(l.amount)::text as "totalEarned",
        COUNT(DISTINCT l."sourceTradeId")::text as "tradeCount"
      FROM "CommissionLedgerEntry" l
      INNER JOIN "Trade" t ON l."sourceTradeId" = t.id
      WHERE l."beneficiaryId" = ${userId}
        AND l.level > 0
      GROUP BY t."userId", l.level
      ORDER BY l.level ASC, SUM(l.amount) DESC
    `;
        return results.map(r => ({
            refereeId: r.userId,
            level: r.level,
            totalEarned: parseFloat(r.totalEarned),
            tradeCount: parseInt(r.tradeCount, 10),
        }));
    }
    async getRecentActivity(userId, limit = 50) {
        const entries = await this.prisma.commissionLedgerEntry.findMany({
            where: { beneficiaryId: userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
        const tradeIds = [...new Set(entries.map(e => e.sourceTradeId))];
        const trades = await this.prisma.trade.findMany({
            where: { id: { in: tradeIds } },
        });
        const tradeMap = new Map(trades.map(t => [t.id, t]));
        return entries
            .map(e => {
            const trade = tradeMap.get(e.sourceTradeId);
            if (!trade)
                return null;
            return {
                tradeId: e.sourceTradeId,
                userId: trade.userId,
                feeAmount: Number(trade.feeAmount),
                earnedAmount: Number(e.amount),
                level: e.level,
                createdAt: e.createdAt,
            };
        })
            .filter((a) => a !== null);
    }
};
exports.PrismaLedgerRepository = PrismaLedgerRepository;
exports.PrismaLedgerRepository = PrismaLedgerRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PrismaLedgerRepository);
//# sourceMappingURL=ledger.repository.prisma.js.map