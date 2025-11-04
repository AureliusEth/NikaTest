"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultPolicy = void 0;
class DefaultPolicy {
    uplineRates = [0.30, 0.03, 0.02];
    TREASURY_BENEFICIARY = 'NIKA_TREASURY';
    calculateSplits(tradeFee, ctx) {
        const token = ctx.token ?? 'XP';
        const splits = [];
        let claimableTotal = 0;
        if (ctx.userCashbackRate > 0) {
            const amount = tradeFee * ctx.userCashbackRate;
            if (amount > 0) {
                splits.push({
                    beneficiaryId: ctx.userId,
                    level: 0,
                    rate: ctx.userCashbackRate,
                    amount,
                    token,
                    destination: 'claimable',
                });
                claimableTotal += amount;
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
                    destination: 'claimable',
                });
                claimableTotal += amount;
            }
        }
        const treasuryAmount = tradeFee - claimableTotal;
        if (treasuryAmount > 0) {
            const treasuryRate = treasuryAmount / tradeFee;
            splits.push({
                beneficiaryId: this.TREASURY_BENEFICIARY,
                level: -1,
                rate: treasuryRate,
                amount: treasuryAmount,
                token,
                destination: 'treasury',
            });
        }
        return splits;
    }
}
exports.DefaultPolicy = DefaultPolicy;
//# sourceMappingURL=default-policy.js.map