"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Money = void 0;
class Money {
    value;
    constructor(value) {
        this.value = value;
        if (!Number.isFinite(value))
            throw new Error('Money must be finite');
    }
    static from(value) {
        if (value < 0)
            throw new Error('Money cannot be negative');
        return new Money(Number(value));
    }
    toNumber() {
        return this.value;
    }
    add(other) {
        return new Money(this.value + other.value);
    }
    multiply(factor) {
        if (!Number.isFinite(factor))
            throw new Error('Factor must be finite');
        return new Money(this.value * factor);
    }
    equals(other) {
        return Math.abs(this.value - other.value) < 1e-9;
    }
}
exports.Money = Money;
//# sourceMappingURL=money.js.map