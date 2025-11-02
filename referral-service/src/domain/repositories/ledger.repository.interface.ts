/**
 * Domain Repository Interface - Commission Ledger
 * 
 * This interface defines the contract for recording and querying commission earnings.
 * Implementations belong in the infrastructure layer.
 */

export interface LedgerEntryDTO {
  beneficiaryId: string;
  sourceTradeId: string;
  level: number;
  rate: number;
  amount: number;
  token: string;
}

export interface LedgerRepository {
  /**
   * Record commission entries in the ledger
   * Should be idempotent (skip duplicates)
   */
  recordEntries(entries: LedgerEntryDTO[]): Promise<void>;

  /**
   * Get earnings summary for a user
   * @param userId - The beneficiary
   * @param range - Optional date range filter
   * @returns Total and breakdown by level
   */
  getEarningsSummary(
    userId: string,
    range?: { from?: Date; to?: Date }
  ): Promise<{ total: number; byLevel: Record<number, number> }>;
}

