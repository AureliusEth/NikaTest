export interface UserRecord {
    id: string;
    email?: string;
    feeCashbackRate: number;
}
export interface UserRepository {
    findById(userId: string): Promise<UserRecord | null>;
    findByReferralCode(code: string): Promise<UserRecord | null>;
    createOrGetReferralCode(userId: string): Promise<string>;
    setEmail(userId: string, email: string): Promise<void>;
}
export interface ReferralRepository {
    getAncestors(userId: string, maxLevels: number): Promise<string[]>;
    hasReferrer(userId: string): Promise<boolean>;
    createLink(referrerId: string, refereeId: string, level: number): Promise<void>;
    getDirectReferees(userId: string): Promise<string[]>;
}
export interface LedgerEntryDTO {
    beneficiaryId: string;
    sourceTradeId: string;
    level: number;
    rate: number;
    amount: number;
    token: string;
    destination: 'treasury' | 'claimable';
}
export interface RefereeEarnings {
    refereeId: string;
    level: number;
    totalEarned: number;
    tradeCount: number;
}
export interface TradeActivity {
    tradeId: string;
    userId: string;
    feeAmount: number;
    earnedAmount: number;
    level: number;
    createdAt: Date;
}
export interface LedgerRepository {
    recordEntries(entries: LedgerEntryDTO[]): Promise<void>;
    getEarningsSummary(userId: string, range?: {
        from?: Date;
        to?: Date;
    }): Promise<{
        total: number;
        byLevel: Record<number, number>;
    }>;
    getRefereeEarnings(userId: string): Promise<RefereeEarnings[]>;
    getRecentActivity(userId: string, limit?: number): Promise<TradeActivity[]>;
}
export interface IdempotencyStore {
    exists(key: string): Promise<boolean>;
    put(key: string): Promise<void>;
}
export interface TradesRepository {
    createTrade(tradeId: string, userId: string, feeAmount: number, chain?: 'EVM' | 'SVM'): Promise<void>;
}
