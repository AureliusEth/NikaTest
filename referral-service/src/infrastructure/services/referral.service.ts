import { ReferralRepository } from '../../application/ports/repositories';

export class ReferralService {
  constructor(private readonly referralRepo: ReferralRepository) {}

  /**
   * Determines if `refereeId` can link to `referrerId` and returns level (1..3).
   * Enforces: no self-referral, no cycles, overall depth ≤ 3.
   */
  async computeLevelOrThrow(refereeId: string, referrerId: string): Promise<number> {
    if (refereeId === referrerId) throw new Error('Cannot self-refer');
    if (await this.referralRepo.hasReferrer(refereeId)) throw new Error('Referrer already set');

    // If referrer is a descendant of referee, this creates a cycle.
    const referrerAncestors = await this.referralRepo.getAncestors(referrerId, 10);
    if (referrerAncestors.includes(refereeId)) throw new Error('Cycle detected');

    // Determine the level of the new link by referrer depth.
    
    const newLevel = (referrerAncestors.length ?? 0) + 1;
    if (newLevel > 3) throw new Error('Depth exceeds 3 levels');
    return newLevel;
  }
}


