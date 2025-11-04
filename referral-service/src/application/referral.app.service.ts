import { Inject, Injectable } from '@nestjs/common';
import { TOKENS } from './tokens';
import type {
  ReferralRepository,
  UserRepository,
  LedgerRepository,
  IdempotencyStore,
} from './ports/repositories';
import { PrismaService } from '../infrastructure/prisma/services/prisma.service';
import { ReferralService } from '../infrastructure/services/referral.service';
// Domain contains only interfaces. Implementations live in application/infrastructure.

@Injectable()
export class ReferralAppService {
  constructor(
    @Inject(TOKENS.UserRepository) private readonly userRepo: UserRepository,
    @Inject(TOKENS.ReferralRepository)
    private readonly refRepo: ReferralRepository,
    @Inject(TOKENS.LedgerRepository)
    private readonly ledgerRepo: LedgerRepository,
    @Inject(TOKENS.IdempotencyStore) private readonly idem: IdempotencyStore,
    private readonly prisma: PrismaService,
    private readonly referralService: ReferralService,
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

    // Use ReferralService for validation (single source of truth)
    const level = await this.referralService.computeLevelOrThrow(
      userId,
      ref.id,
    );

    await this.refRepo.createLink(ref.id, userId, level);
    return level;
  }

  async getNetwork(
    userId: string,
  ): Promise<{ level1: string[]; level2: string[]; level3: string[] }> {
    // Read model can be denormalized later; for now, traverse via repo
    const l1 = await this.findRefereesAtLevel(userId, 1);
    const l2 = await this.findRefereesAtLevel(userId, 2);
    const l3 = await this.findRefereesAtLevel(userId, 3);
    return { level1: l1, level2: l2, level3: l3 };
  }

  private async findRefereesAtLevel(
    userId: string,
    level: number,
  ): Promise<string[]> {
    if (level === 1) return this.refRepo.getDirectReferees(userId);
    if (level === 2) {
      const l1 = await this.refRepo.getDirectReferees(userId);
      const all = await Promise.all(
        l1.map((u) => this.refRepo.getDirectReferees(u)),
      );
      return all.flat();
    }
    if (level === 3) {
      const l2 = await this.findRefereesAtLevel(userId, 2);
      const all = await Promise.all(
        l2.map((u) => this.refRepo.getDirectReferees(u)),
      );
      return all.flat();
    }
    return [];
  }

  async getEarnings(
    userId: string,
  ): Promise<{ total: number; byLevel: Record<number, number> }> {
    return this.ledgerRepo.getEarningsSummary(userId);
  }

  async getDashboard(userId: string): Promise<{
    totalXP: number;
    totalEarned: number;
    totalClaimed: number;
    unclaimedXP: number;
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

    // Get total claimed XP across all chains
    const claimed = await this.prisma.claimRecord.aggregate({
      where: { userId, token: 'XP' },
      _sum: { amount: true },
    });
    const totalClaimed = Number(claimed._sum.amount || 0);
    const unclaimedXP = earnings.total - totalClaimed;

    // Calculate percentage of total for each referee
    const referrals = refereeEarnings.map((r) => ({
      userId: r.refereeId,
      level: r.level,
      totalEarned: r.totalEarned,
      tradeCount: r.tradeCount,
      percentage:
        earnings.total > 0 ? (r.totalEarned / earnings.total) * 100 : 0,
    }));

    return {
      totalXP: unclaimedXP, // Show unclaimed as the main metric
      totalEarned: earnings.total,
      totalClaimed,
      unclaimedXP,
      referrals,
    };
  }

  async getActivity(
    userId: string,
    limit?: number,
  ): Promise<
    Array<{
      tradeId: string;
      userId: string;
      feeAmount: number;
      earnedAmount: number;
      level: number;
      createdAt: Date;
    }>
  > {
    return this.ledgerRepo.getRecentActivity(userId, limit);
  }

  async getHourlyEarnings(
    userId: string,
    hours: number = 24,
  ): Promise<
    Array<{
      hour: string; // ISO date string truncated to hour
      timestamp: number; // Unix timestamp for the hour
      earnings: number; // Total XP earned in this hour
    }>
  > {
    // Get last N hours
    const now = new Date();
    const startTime = new Date(now.getTime() - hours * 60 * 60 * 1000);

    // Query ledger entries grouped by hour
    // RAW QUERY JUSTIFIED: Uses PostgreSQL-specific DATE_TRUNC() function.
    // Prisma doesn't have a database-agnostic way to group by time intervals.
    // This is required for the hourly earnings chart feature.
    const results = await this.prisma.$queryRaw<
      Array<{
        hour: string;
        earnings: string;
      }>
    >`
      SELECT 
        DATE_TRUNC('hour', l."createdAt")::text as hour,
        COALESCE(SUM(l.amount), 0)::text as earnings
      FROM "CommissionLedgerEntry" l
      WHERE l."beneficiaryId" = ${userId}
        AND l.destination = 'claimable'
        AND l.token = 'XP'
        AND l."createdAt" >= ${startTime}
      GROUP BY DATE_TRUNC('hour', l."createdAt")
      ORDER BY hour ASC
    `;

    // Fill in missing hours with zero earnings
    const hourlyData: Map<string, number> = new Map();
    for (let i = 0; i < hours; i++) {
      const hourDate = new Date(startTime.getTime() + i * 60 * 60 * 1000);
      const hourKey = hourDate.toISOString().slice(0, 13) + ':00:00'; // Format: YYYY-MM-DDTHH:00:00
      hourlyData.set(hourKey, 0);
    }

    // Update with actual earnings
    for (const row of results) {
      hourlyData.set(row.hour, parseFloat(row.earnings));
    }

    // Convert to array format
    return Array.from(hourlyData.entries()).map(([hour, earnings]) => ({
      hour,
      timestamp: new Date(hour).getTime(),
      earnings,
    }));
  }
}
