export interface TradesRepository {
    createTrade(tradeId: string, userId: string, feeAmount: number): Promise<void>;
}
