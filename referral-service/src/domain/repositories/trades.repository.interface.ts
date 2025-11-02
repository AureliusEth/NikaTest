/**
 * Domain Repository Interface - Trades
 * 
 * This interface defines the contract for recording trades.
 * Implementations belong in the infrastructure layer.
 */

export interface TradesRepository {
  /**
   * Record a new trade
   */
  createTrade(tradeId: string, userId: string, feeAmount: number): Promise<void>;
}

