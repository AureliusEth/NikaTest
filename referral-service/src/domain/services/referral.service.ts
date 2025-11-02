/**
 * Referral Service Interface (Domain Layer)
 * 
 * Defines the contract for referral validation and level computation.
 * Implementations live in the infrastructure layer.
 */
export interface ReferralService {
  /**
   * Determines if `refereeId` can link to `referrerId` and returns level (1..3).
   * 
   * Business rules enforced:
   * - No self-referral
   * - No cycles (referrer cannot be a descendant of referee)
   * - Maximum depth of 3 levels
   * - Referrer link is immutable (one referrer per user)
   * 
   * @param refereeId - The user being referred
   * @param referrerId - The user doing the referring
   * @returns The level (1-3) of this referral link
   * @throws Error if any business rule is violated
   */
  computeLevelOrThrow(refereeId: string, referrerId: string): Promise<number>;
}


