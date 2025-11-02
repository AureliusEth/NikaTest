import { Inject, Injectable } from '@nestjs/common';
import { TOKENS } from './tokens';
import type { IdempotencyStore, LedgerRepository, TradesRepository, ReferralRepository, UserRepository } from './ports/repositories';
import { CommissionService } from '../infrastructure/services/commission.service';
import { DefaultPolicy } from '../domain/policies/commission-policy';

@Injectable()
export class TradesAppService {
  private readonly commission = new CommissionService(new DefaultPolicy());

  constructor(
    @Inject(TOKENS.TradesRepository) private readonly tradesRepo: TradesRepository,
    @Inject(TOKENS.IdempotencyStore) private readonly idem: IdempotencyStore,
    @Inject(TOKENS.LedgerRepository) private readonly ledgerRepo: LedgerRepository,
    @Inject(TOKENS.ReferralRepository) private readonly referralRepo: ReferralRepository,
    @Inject(TOKENS.UserRepository) private readonly userRepo: UserRepository,
  ) {}

  async processTrade(params: { tradeId: string; userId: string; feeAmount: number; token?: string }): Promise<void> {
    const key = `trade:${params.tradeId}`;
    if (await this.idem.exists(key)) return;
    await this.tradesRepo.createTrade(params.tradeId, params.userId, params.feeAmount);

    const user = await this.userRepo.findById(params.userId);
    const ancestors = await this.referralRepo.getAncestors(params.userId, 3);
    const splits = this.commission.computeSplits(params.feeAmount, {
      userId: params.userId,
      userCashbackRate: user?.feeCashbackRate ?? 0,
      ancestors,
      token: params.token ?? 'XP',
    });
    await this.ledgerRepo.recordEntries(
      splits.map(s => ({ beneficiaryId: s.beneficiaryId, sourceTradeId: params.tradeId, level: s.level, rate: s.rate, amount: s.amount, token: s.token }))
    );
    await this.idem.put(key);
  }
}




