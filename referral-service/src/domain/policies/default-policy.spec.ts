import { DefaultPolicy } from './commission-policy';

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
    expect(splits.find(s => s.level === 0)?.amount).toBeCloseTo(10);
    // level 1 30%
    expect(splits.find(s => s.level === 1)?.amount).toBeCloseTo(30);
    // level 2 3%
    expect(splits.find(s => s.level === 2)?.amount).toBeCloseTo(3);
    // level 3 2%
    expect(splits.find(s => s.level === 3)?.amount).toBeCloseTo(2);
  });

  it('stops when ancestors are missing', () => {
    const policy = new DefaultPolicy();
    const fee = 50;
    const splits = policy.calculateSplits(fee, {
      userId: 'U',
      userCashbackRate: 0,
      ancestors: ['A1'],
    });
    expect(splits.length).toBe(1);
    expect(splits[0].level).toBe(1);
    expect(splits[0].amount).toBeCloseTo(15);
  });
});




