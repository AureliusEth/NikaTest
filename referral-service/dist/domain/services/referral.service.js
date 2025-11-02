"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferralService = void 0;
class ReferralService {
    referralRepo;
    constructor(referralRepo) {
        this.referralRepo = referralRepo;
    }
    async computeLevelOrThrow(refereeId, referrerId) {
        if (refereeId === referrerId)
            throw new Error('Cannot self-refer');
        if (await this.referralRepo.hasReferrer(refereeId))
            throw new Error('Referrer already set');
        const referrerAncestors = await this.referralRepo.getAncestors(referrerId, 10);
        if (referrerAncestors.includes(refereeId))
            throw new Error('Cycle detected');
        const newLevel = (referrerAncestors.length ?? 0) + 1;
        if (newLevel > 3)
            throw new Error('Depth exceeds 3 levels');
        return newLevel;
    }
}
exports.ReferralService = ReferralService;
//# sourceMappingURL=referral.service.js.map