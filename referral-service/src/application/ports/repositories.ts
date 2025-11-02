export interface UserRecord {
  id: string;
  email?: string;
  feeCashbackRate: number; // fraction 0..1
}

export interface UserRepository {
  findById(userId: string): Promise<UserRecord | null>;
  findByReferralCode(code: string): Promise<UserRecord | null>;
  createOrGetReferralCode(userId: string): Promise<string>;

  /**
   * Create or update a user's email
   */
  setEmail(userId: string, email: string): Promise<void>;
}

export interface ReferralRepository {
  /** Returns ancestor chain for a user up to maxLevels, closest ancestor first */
  getAncestors(userId: string, maxLevels: number): Promise<string[]>;
  /** Whether the user already has a referrer link */
  hasReferrer(userId: string): Promise<boolean>;
  createLink(referrerId: string, refereeId: string, level: number): Promise<void>;
  /** Direct referrals of a given user */
  getDirectReferees(userId: string): Promise<string[]>;
  /** Get all referrals (direct and indirect) with their levels */
  getAllReferees(userId: string): Promise<Array<{ refereeId: string; level: number }>>;
}

export interface LedgerEntryDTO {
  beneficiaryId: string;
  sourceTradeId: string;
  level: number; // 0 cashback; 1..3 uplines
  rate: number; // fraction 0..1
  amount: number; // decimal as number for tests
  token: string;
}

export interface LedgerRepository {
  recordEntries(entries: LedgerEntryDTO[]): Promise<void>;
  getEarningsSummary(
    userId: string,
    range?: { from?: Date; to?: Date }
  ): Promise<{ total: number; byLevel: Record<number, number> }>;
  /** Get earnings from a specific referee */
  getEarningsFromReferee(userId: string, refereeId: string): Promise<{ total: number; totalFees: number; entries: Array<{ tradeId: string; amount: number; rate: number; level: number; createdAt: Date }> }>;
}

export interface IdempotencyStore {
  exists(key: string): Promise<boolean>;
  put(key: string): Promise<void>;
}

export interface TradesRepository {
  createTrade(tradeId: string, userId: string, feeAmount: number): Promise<void>;
  getTradesByUser(userId: string, limit?: number): Promise<Array<{ id: string; feeAmount: number; createdAt: Date }>>;
}


