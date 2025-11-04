export interface ReferralService {
    computeLevelOrThrow(refereeId: string, referrerId: string): Promise<number>;
}
