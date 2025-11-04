import { DefaultPolicy } from '../../../../src/infrastructure/policies/default-policy';

describe('DefaultPolicy', () => {
  it('splits cashback and 3 upline levels', () => {
    const policy = new DefaultPolicy();
    const fee = 100;
    const splits = policy.calculateSplits(fee, {
      userId: 'U',
      userCashbackRate: 0.1,
      ancestors: ['A1', 'A2', 'A3'],
      token: 'XP',
    });

    // cashback 10%
    expect(splits.find((s) => s.level === 0)?.amount).toBeCloseTo(10);
    // level 1 30%
    expect(splits.find((s) => s.level === 1)?.amount).toBeCloseTo(30);
    // level 2 3%
    expect(splits.find((s) => s.level === 2)?.amount).toBeCloseTo(3);
    // level 3 2%
    expect(splits.find((s) => s.level === 3)?.amount).toBeCloseTo(2);
  });

  it('stops when ancestors are missing', () => {
    const policy = new DefaultPolicy();
    const fee = 50;
    const splits = policy.calculateSplits(fee, {
      userId: 'U',
      userCashbackRate: 0,
      ancestors: ['A1'],
    });
    // Should have 2 splits: Level 1 commission + Treasury remainder
    expect(splits.length).toBe(2);

    // Level 1 commission (30% of 50 = 15)
    const level1 = splits.find((s) => s.level === 1);
    expect(level1?.amount).toBeCloseTo(15);
    expect(level1?.destination).toBe('claimable');

    // Treasury gets remainder (50 - 15 = 35)
    const treasury = splits.find((s) => s.destination === 'treasury');
    expect(treasury?.amount).toBeCloseTo(35);
    expect(treasury?.level).toBe(-1);
  });
});
