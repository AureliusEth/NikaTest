import { ReferralRepository } from '../../application/ports/repositories';
export declare class ReferralService {
    private readonly referralRepo;
    constructor(referralRepo: ReferralRepository);
    computeLevelOrThrow(refereeId: string, referrerId: string): Promise<number>;
}
