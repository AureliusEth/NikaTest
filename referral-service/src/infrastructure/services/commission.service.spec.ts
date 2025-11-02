import { CommissionService } from './commission.service';
import { DefaultPolicy } from '../policies/default-policy';

describe('CommissionService', () => {
  it('rejects negative fees', () => {
    const svc = new CommissionService(new DefaultPolicy());
    const ctx = { userId: 'U', userCashbackRate: 0.10, ancestors: [] };
    expect(() => svc.computeSplits(-1, ctx)).toThrow('Fee cannot be negative');
  });

  it('delegates to policy', () => {
    const svc = new CommissionService(new DefaultPolicy());
    const ctx = { userId: 'U', userCashbackRate: 0.10, ancestors: ['A'], token: 'XP' };
    const splits = svc.computeSplits(100, ctx);
    expect(splits.length).toBeGreaterThan(0);
    expect(splits.some((s) => s.beneficiaryId === 'U')).toBe(true);
    expect(splits.some((s) => s.beneficiaryId === 'A')).toBe(true);
  });
});


