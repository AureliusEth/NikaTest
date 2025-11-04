/**
 * Domain Repository Interface - Referral Links
 *
 * This interface defines the contract for managing referral relationships.
 * Implementations belong in the infrastructure layer.
 */
export interface ReferralRepository {
  /**
   * Get the chain of ancestors (uplines) for a user
   * @param userId - The user whose ancestors to fetch
   * @param maxLevels - Maximum number of levels to traverse
   * @returns Array of user IDs, closest ancestor first
   */
  getAncestors(userId: string, maxLevels: number): Promise<string[]>;

  /**
   * Check if a user already has a referrer
   */
  hasReferrer(userId: string): Promise<boolean>;

  /**
   * Create a new referral link
   * @param referrerId - The user who referred
   * @param refereeId - The user being referred
   * @param level - The level of this relationship (1-3)
   */
  createLink(
    referrerId: string,
    refereeId: string,
    level: number,
  ): Promise<void>;

  /**
   * Get all direct referees (downline level 1) for a user
   */
  getDirectReferees(userId: string): Promise<string[]>;
}
