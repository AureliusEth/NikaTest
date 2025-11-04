/**
 * Domain Repository Interface - Users
 *
 * This interface defines the contract for user data access.
 * Implementations belong in the infrastructure layer.
 */

export interface UserRecord {
  id: string;
  email?: string;
  feeCashbackRate: number;
}

export interface UserRepository {
  /**
   * Find a user by their ID
   */
  findById(userId: string): Promise<UserRecord | null>;

  /**
   * Find a user by their referral code
   */
  findByReferralCode(code: string): Promise<UserRecord | null>;

  /**
   * Create or retrieve a referral code for a user
   * If the user doesn't exist, they should be created
   */
  createOrGetReferralCode(userId: string): Promise<string>;

  /** Persist or update user's email */
  setEmail(userId: string, email: string): Promise<void>;
}
