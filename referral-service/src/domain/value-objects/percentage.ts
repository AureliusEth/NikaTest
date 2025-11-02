export class Percentage {
  private constructor(private readonly fraction: number) {
    if (fraction < 0 || fraction > 1) throw new Error('Percentage out of range');
  }

  static fromFraction(fraction: number): Percentage {
    return new Percentage(Number(fraction));
  }

  static fromPercent(percent: number): Percentage {
    return new Percentage(Number(percent) / 100);
  }

  toFraction(): number {
    return this.fraction;
  }
}




