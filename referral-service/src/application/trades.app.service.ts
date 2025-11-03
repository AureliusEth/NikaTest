import { Inject, Injectable } from '@nestjs/common';
import { TOKENS } from './tokens';
import type { IdempotencyStore, LedgerRepository, TradesRepository, ReferralRepository, UserRepository } from './ports/repositories';
import { CommissionService } from '../infrastructure/services/commission.service';
import { DefaultPolicy } from '../infrastructure/policies/default-policy';

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

  async processTrade(params: { 
    tradeId: string; 
    userId: string; 
    feeAmount: number; 
    token?: string;
    chain?: 'EVM' | 'SVM';
  }): Promise<void> {
    const key = `trade:${params.tradeId}`;
    if (await this.idem.exists(key)) return;
    
    const chain = params.chain ?? 'EVM';
    await this.tradesRepo.createTrade(params.tradeId, params.userId, params.feeAmount, chain);

    const user = await this.userRepo.findById(params.userId);
    const ancestors = await this.referralRepo.getAncestors(params.userId, 3);
    const splits = this.commission.computeSplits(params.feeAmount, {
      userId: params.userId,
      userCashbackRate: user?.feeCashbackRate ?? 0,
      ancestors,
      token: params.token ?? 'XP',
      chain,
    });
    
    // Convert splits to ledger entries (includes treasury + claimable splits)
    await this.ledgerRepo.recordEntries(
      splits.map(s => ({ 
        beneficiaryId: s.beneficiaryId, 
        sourceTradeId: params.tradeId, 
        level: s.level, 
        rate: s.rate, 
        amount: s.amount, 
        token: s.token,
        destination: s.destination,
      }))
    );
    await this.idem.put(key);
  }
}




