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
