import { ReferralRepository } from '../../application/ports/repositories';
import type { ReferralService as IReferralService } from '../../domain/services/referral.service';
export declare class ReferralService implements IReferralService {
    private readonly referralRepo;
    constructor(referralRepo: ReferralRepository);
    computeLevelOrThrow(refereeId: string, referrerId: string): Promise<number>;
}
