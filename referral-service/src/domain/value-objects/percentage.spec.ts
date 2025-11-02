import { Percentage } from './percentage';

describe('Percentage', () => {
  it('creates from fraction and percent', () => {
    expect(Percentage.fromFraction(0.3).toFraction()).toBeCloseTo(0.3);
    expect(Percentage.fromPercent(30).toFraction()).toBeCloseTo(0.3);
  });

  it('validates range', () => {
    expect(() => Percentage.fromFraction(-0.01)).toThrow();
    expect(() => Percentage.fromFraction(1.01)).toThrow();
  });
});




