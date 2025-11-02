"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultPolicy = void 0;
class DefaultPolicy {
    uplineRates = [0.30, 0.03, 0.02];
    calculateSplits(tradeFee, ctx) {
        const token = ctx.token ?? 'XP';
        const splits = [];
        if (ctx.userCashbackRate > 0) {
            const amount = tradeFee * ctx.userCashbackRate;
            if (amount > 0) {
                splits.push({
                    beneficiaryId: ctx.userId,
                    level: 0,
                    rate: ctx.userCashbackRate,
                    amount,
                    token,
                });
            }
        }
        for (let i = 0; i < this.uplineRates.length; i++) {
            const ancestorId = ctx.ancestors[i];
            if (!ancestorId)
                break;
            const rate = this.uplineRates[i];
            const amount = tradeFee * rate;
            if (amount > 0) {
                splits.push({
                    beneficiaryId: ancestorId,
                    level: i + 1,
                    rate,
                    amount,
                    token,
                });
            }
        }
        return splits;
    }
}
exports.DefaultPolicy = DefaultPolicy;
//# sourceMappingURL=default-policy.js.map