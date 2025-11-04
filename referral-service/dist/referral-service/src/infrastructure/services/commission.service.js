"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommissionService = void 0;
class CommissionService {
    policy;
    constructor(policy) {
        this.policy = policy;
    }
    computeSplits(tradeFee, ctx) {
        if (tradeFee < 0) {
            throw new Error('Fee cannot be negative');
        }
        return this.policy.calculateSplits(tradeFee, ctx);
    }
}
exports.CommissionService = CommissionService;
//# sourceMappingURL=commission.service.js.map