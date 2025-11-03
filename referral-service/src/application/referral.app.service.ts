import { Inject, Injectable } from '@nestjs/common';
import { TOKENS } from './tokens';
import type { ReferralRepository, UserRepository, LedgerRepository, IdempotencyStore } from './ports/repositories';
// Domain contains only interfaces. Implementations live in application/infrastructure.

@Injectable()
export class ReferralAppService {

  constructor(
    @Inject(TOKENS.UserRepository) private readonly userRepo: UserRepository,
    @Inject(TOKENS.ReferralRepository) private readonly refRepo: ReferralRepository,
    @Inject(TOKENS.LedgerRepository) private readonly ledgerRepo: LedgerRepository,
    @Inject(TOKENS.IdempotencyStore) private readonly idem: IdempotencyStore,
  ) {}

  async createOrGetReferralCode(userId: string): Promise<string> {
    return this.userRepo.createOrGetReferralCode(userId);
  }

  async setUserEmail(userId: string, email: string): Promise<void> {
    await this.userRepo.setEmail(userId, email);
  }

  async registerReferralByCode(userId: string, code: string): Promise<number> {
    const ref = await this.userRepo.findByReferralCode(code);
    if (!ref) throw new Error('Referral code not found');
    // Inline validation rules
    if (userId === ref.id) throw new Error('Cannot self-refer');
    if (await this.refRepo.hasReferrer(userId)) throw new Error('Referrer already set');
    const referrerAncestors = await this.refRepo.getAncestors(ref.id, 10);
    if (referrerAncestors.includes(userId)) throw new Error('Cycle detected');
    const level = (referrerAncestors.length ?? 0) + 1;
    if (level > 3) throw new Error('Depth exceeds 3 levels');
    await this.refRepo.createLink(ref.id, userId, level);
    return level;
  }

  async getNetwork(userId: string): Promise<{ level1: string[]; level2: string[]; level3: string[] }> {
    // Read model can be denormalized later; for now, traverse via repo
    const l1 = await this.findRefereesAtLevel(userId, 1);
    const l2 = await this.findRefereesAtLevel(userId, 2);
    const l3 = await this.findRefereesAtLevel(userId, 3);
    return { level1: l1, level2: l2, level3: l3 };
  }

  private async findRefereesAtLevel(userId: string, level: number): Promise<string[]> {
    if (level === 1) return this.refRepo.getDirectReferees(userId);
    if (level === 2) {
      const l1 = await this.refRepo.getDirectReferees(userId);
      const all = await Promise.all(l1.map(u => this.refRepo.getDirectReferees(u)));
      return all.flat();
    }
    if (level === 3) {
      const l2 = await this.findRefereesAtLevel(userId, 2);
      const all = await Promise.all(l2.map(u => this.refRepo.getDirectReferees(u)));
      return all.flat();
    }
    return [];
  }

  async getEarnings(userId: string): Promise<{ total: number; byLevel: Record<number, number> }> {
    return this.ledgerRepo.getEarningsSummary(userId);
  }

  async getDashboard(userId: string): Promise<{
    totalXP: number;
    referrals: Array<{
      userId: string;
      level: number;
      totalEarned: number;
      tradeCount: number;
      percentage: number;
    }>;
  }> {
    const earnings = await this.ledgerRepo.getEarningsSummary(userId);
    const refereeEarnings = await this.ledgerRepo.getRefereeEarnings(userId);

    // Calculate percentage of total for each referee
    const referrals = refereeEarnings.map(r => ({
      userId: r.refereeId,
      level: r.level,
      totalEarned: r.totalEarned,
      tradeCount: r.tradeCount,
      percentage: earnings.total > 0 ? (r.totalEarned / earnings.total) * 100 : 0,
    }));

    return {
      totalXP: earnings.total,
      referrals,
    };
  }

  async getActivity(userId: string, limit?: number): Promise<Array<{
    tradeId: string;
    userId: string;
    feeAmount: number;
    earnedAmount: number;
    level: number;
    createdAt: Date;
  }>> {
    return this.ledgerRepo.getRecentActivity(userId, limit);
  }
}


