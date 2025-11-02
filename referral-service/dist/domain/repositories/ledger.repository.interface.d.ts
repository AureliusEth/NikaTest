export interface LedgerEntryDTO {
    beneficiaryId: string;
    sourceTradeId: string;
    level: number;
    rate: number;
    amount: number;
    token: string;
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
}
