import { Inject, Injectable } from '@nestjs/common';
import { TOKENS } from './tokens';
import type {
  IdempotencyStore,
  LedgerRepository,
  TradesRepository,
  ReferralRepository,
  UserRepository,
} from './ports/repositories';
import { CommissionService } from '../infrastructure/services/commission.service';
import { ClaimService } from '../infrastructure/services/claim.service';

@Injectable()
export class TradesAppService {
  constructor(
    @Inject(TOKENS.TradesRepository)
    private readonly tradesRepo: TradesRepository,
    @Inject(TOKENS.IdempotencyStore) private readonly idem: IdempotencyStore,
    @Inject(TOKENS.LedgerRepository)
    private readonly ledgerRepo: LedgerRepository,
    @Inject(TOKENS.ReferralRepository)
    private readonly referralRepo: ReferralRepository,
    @Inject(TOKENS.UserRepository) private readonly userRepo: UserRepository,
    private readonly claimService: ClaimService,
    private readonly commission: CommissionService,
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
    const token = params.token ?? 'XP';
    await this.tradesRepo.createTrade(
      params.tradeId,
      params.userId,
      params.feeAmount,
      chain,
    );

    const user = await this.userRepo.findById(params.userId);
    const ancestors = await this.referralRepo.getAncestors(params.userId, 3);
    const splits = this.commission.computeSplits(params.feeAmount, {
      userId: params.userId,
      userCashbackRate: user?.feeCashbackRate ?? 0,
      ancestors,
      token,
      chain,
    });

    // Convert splits to ledger entries (includes treasury + claimable splits)
    await this.ledgerRepo.recordEntries(
      splits.map((s) => ({
        beneficiaryId: s.beneficiaryId,
        sourceTradeId: params.tradeId,
        level: s.level,
        rate: s.rate,
        amount: s.amount,
        token: s.token,
        destination: s.destination,
      })),
    );

    // Update treasury balance for treasury splits
    const treasurySplits = splits.filter((s) => s.destination === 'treasury');
    for (const split of treasurySplits) {
      await this.claimService.updateTreasuryBalance(chain, token, split.amount);
    }

    await this.idem.put(key);
  }
}
