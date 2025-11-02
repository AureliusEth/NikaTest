import { Inject, Injectable } from '@nestjs/common';
import { TOKENS } from './tokens';
import type { ReferralRepository, UserRepository, LedgerRepository, IdempotencyStore } from './ports/repositories';
import { ReferralService } from '../infrastructure/services/referral.service';
import { CommissionService } from '../infrastructure/services/commission.service';
import { DefaultPolicy } from '../domain/policies/commission-policy';

@Injectable()
export class ReferralAppService {
  private readonly referralDomain: ReferralService;
  private readonly commission: CommissionService;

  constructor(
    @Inject(TOKENS.UserRepository) private readonly userRepo: UserRepository,
    @Inject(TOKENS.ReferralRepository) private readonly refRepo: ReferralRepository,
    @Inject(TOKENS.LedgerRepository) private readonly ledgerRepo: LedgerRepository,
    @Inject(TOKENS.IdempotencyStore) private readonly idem: IdempotencyStore,
  ) {
    this.referralDomain = new ReferralService(this.refRepo);
    this.commission = new CommissionService(new DefaultPolicy());
  }

  async createOrGetReferralCode(userId: string): Promise<string> {
    return this.userRepo.createOrGetReferralCode(userId);
  }

  async setUserEmail(userId: string, email: string): Promise<void> {
    await this.userRepo.setEmail(userId, email);
  }

  async registerReferralByCode(userId: string, code: string): Promise<number> {
    const ref = await this.userRepo.findByReferralCode(code);
    if (!ref) throw new Error('Referral code not found');
    const level = await this.referralDomain.computeLevelOrThrow(userId, ref.id);
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
}


