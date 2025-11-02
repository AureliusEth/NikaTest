export declare class Money {
    private readonly value;
    private constructor();
    static from(value: number): Money;
    toNumber(): number;
    add(other: Money): Money;
    multiply(factor: number): Money;
    equals(other: Money): boolean;
}
