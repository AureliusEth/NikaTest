/**
 * Domain Repository Interface - Idempotency Store
 *
 * This interface defines the contract for managing idempotency keys.
 * Implementations belong in the infrastructure layer.
 */

export interface IdempotencyStore {
  /**
   * Check if an idempotency key exists
   */
  exists(key: string): Promise<boolean>;

  /**
   * Store an idempotency key
   * Should throw if key already exists
   */
  put(key: string): Promise<void>;
}
