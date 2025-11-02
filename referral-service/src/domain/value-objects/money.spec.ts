import { Money } from './money';

describe('Money', () => {
  it('creates non-negative money', () => {
    expect(Money.from(0).toNumber()).toBe(0);
    expect(Money.from(12.34).toNumber()).toBeCloseTo(12.34);
    expect(() => Money.from(-1)).toThrow();
  });

  it('adds and multiplies', () => {
    const a = Money.from(10);
    const b = Money.from(2.5);
    expect(a.add(b).toNumber()).toBeCloseTo(12.5);
    expect(b.multiply(4).toNumber()).toBeCloseTo(10);
  });

  it('compares with epsilon', () => {
    const a = Money.from(1);
    const b = Money.from(1 + 1e-10);
    expect(a.equals(b)).toBe(true);
  });
});




