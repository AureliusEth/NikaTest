export declare class Percentage {
    private readonly fraction;
    private constructor();
    static fromFraction(fraction: number): Percentage;
    static fromPercent(percent: number): Percentage;
    toFraction(): number;
}
