import { CommissionService } from './commission.service';
import { DefaultPolicy } from '../policies/commission-policy';

describe('CommissionService', () => {
  it('delegates to policy and returns splits', () => {
    const svc = new CommissionService(new DefaultPolicy());
    const splits = svc.computeSplits(10, { userId: 'U', userCashbackRate: 0.2, ancestors: ['A'] });
    // cashback 2, L1 3
    expect(splits.find(s => s.level === 0)?.amount).toBeCloseTo(2);
    expect(splits.find(s => s.level === 1)?.amount).toBeCloseTo(3);
  });

  it('rejects negative fee', () => {
    const svc = new CommissionService(new DefaultPolicy());
    expect(() => svc.computeSplits(-1, { userId: 'U', userCashbackRate: 0, ancestors: [] })).toThrow();
  });
});




