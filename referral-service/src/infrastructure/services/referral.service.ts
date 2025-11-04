import { ReferralRepository } from '../../application/ports/repositories';
import type { ReferralService as IReferralService } from '../../domain/services/referral.service';

/**
 * ReferralService Implementation (Infrastructure Layer)
 *
 * Implements the domain's ReferralService interface.
 * Validates referral business rules using the ReferralRepository.
 */
export class ReferralService implements IReferralService {
  constructor(private readonly referralRepo: ReferralRepository) {}

  /**
   * Determines if `refereeId` can link to `referrerId` and returns level (1..3).
   * Enforces: no self-referral, no cycles, overall depth ≤ 3.
   */
  async computeLevelOrThrow(
    refereeId: string,
    referrerId: string,
  ): Promise<number> {
    // Rule 1: No self-referral
    if (refereeId === referrerId) {
      throw new Error('Cannot self-refer');
    }

    // Rule 2: Referrer link is immutable (one referrer per user)
    if (await this.referralRepo.hasReferrer(refereeId)) {
      throw new Error('Referrer already set');
    }

    // Rule 3: No cycles (referrer cannot be a descendant of referee)
    const referrerAncestors = await this.referralRepo.getAncestors(
      referrerId,
      10,
    );
    if (referrerAncestors.includes(refereeId)) {
      throw new Error('Cycle detected');
    }

    // Rule 4: Maximum depth of 3 levels
    const newLevel = (referrerAncestors.length ?? 0) + 1;
    if (newLevel > 3) {
      throw new Error('Depth exceeds 3 levels');
    }

    return newLevel;
  }
}
