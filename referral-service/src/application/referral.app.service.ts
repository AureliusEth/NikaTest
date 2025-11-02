import { Inject, Injectable } from '@nestjs/common';
import { TOKENS } from './tokens';
import type { ReferralRepository, UserRepository, LedgerRepository, IdempotencyStore, TradesRepository } from './ports/repositories';
// Domain contains only interfaces. Implementations live in application/infrastructure.

@Injectable()
export class ReferralAppService {

  constructor(
    @Inject(TOKENS.UserRepository) private readonly userRepo: UserRepository,
    @Inject(TOKENS.ReferralRepository) private readonly refRepo: ReferralRepository,
    @Inject(TOKENS.LedgerRepository) private readonly ledgerRepo: LedgerRepository,
    @Inject(TOKENS.IdempotencyStore) private readonly idem: IdempotencyStore,
    @Inject(TOKENS.TradesRepository) private readonly tradesRepo: TradesRepository,
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
    referralsCount: number;
    referrals: Array<{
      refereeId: string;
      level: number;
      totalFeesEarned: number;
      totalXPGenerated: number;
      feePercentage: number;
      email?: string;
    }>;
  }> {
    const [earnings] = await Promise.all([
      this.ledgerRepo.getEarningsSummary(userId),
    ]);

    // Get all referrals (direct and indirect) by traversing the referral tree
    const allReferees: Array<{ refereeId: string; level: number }> = [];
    
    // Get direct referrals (level 1)
    const level1 = await this.refRepo.getDirectReferees(userId);
    for (const ref of level1) {
      allReferees.push({ refereeId: ref, level: 1 });
    }
    
    // Get level 2 referrals
    for (const l1 of level1) {
      const level2 = await this.refRepo.getDirectReferees(l1);
      for (const ref of level2) {
        allReferees.push({ refereeId: ref, level: 2 });
      }
    }
    
    // Get level 3 referrals
    for (const l1 of level1) {
      const level2 = await this.refRepo.getDirectReferees(l1);
      for (const l2 of level2) {
        const level3 = await this.refRepo.getDirectReferees(l2);
        for (const ref of level3) {
          allReferees.push({ refereeId: ref, level: 3 });
        }
      }
    }

    const referralsWithStats = await Promise.all(
      allReferees.map(async (ref) => {
        const stats = await this.ledgerRepo.getEarningsFromReferee(userId, ref.refereeId);
        const user = await this.userRepo.findById(ref.refereeId);
        
        // Calculate fee percentage: total XP earned / total fees * 100
        const feePercentage = stats.totalFees > 0 
          ? (stats.total / stats.totalFees) * 100 
          : 0;

        return {
          refereeId: ref.refereeId,
          level: ref.level,
          totalFeesEarned: stats.totalFees,
          totalXPGenerated: stats.total,
          feePercentage,
          email: user?.email,
        };
      })
    );

    // Filter out referrals with no XP generated (no trades yet)
    const activeReferrals = referralsWithStats.filter(ref => ref.totalXPGenerated > 0);

    return {
      totalXP: earnings.total,
      referralsCount: activeReferrals.length,
      referrals: activeReferrals,
    };
  }

  async getActivity(userId: string, limit: number = 50): Promise<Array<{
    tradeId: string;
    feeAmount: number;
    createdAt: Date;
  }>> {
    return this.tradesRepo.getTradesByUser(userId, limit);
  }
}


