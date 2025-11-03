export interface ReferralRepository {
    getAncestors(userId: string, maxLevels: number): Promise<string[]>;
    hasReferrer(userId: string): Promise<boolean>;
    createLink(referrerId: string, refereeId: string, level: number): Promise<void>;
    getDirectReferees(userId: string): Promise<string[]>;
}
