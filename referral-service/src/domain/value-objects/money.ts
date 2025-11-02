export class Money {
  private constructor(private readonly value: number) {
    if (!Number.isFinite(value)) throw new Error('Money must be finite');
  }

  static from(value: number): Money {
    if (value < 0) throw new Error('Money cannot be negative');
    return new Money(Number(value));
  }

  toNumber(): number {
    return this.value;
  }

  add(other: Money): Money {
    return new Money(this.value + other.value);
  }

  multiply(factor: number): Money {
    if (!Number.isFinite(factor)) throw new Error('Factor must be finite');
    return new Money(this.value * factor);
  }

  equals(other: Money): boolean {
    return Math.abs(this.value - other.value) < 1e-9;
  }
}




