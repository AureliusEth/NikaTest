"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Percentage = void 0;
class Percentage {
    fraction;
    constructor(fraction) {
        this.fraction = fraction;
        if (fraction < 0 || fraction > 1)
            throw new Error('Percentage out of range');
    }
    static fromFraction(fraction) {
        return new Percentage(Number(fraction));
    }
    static fromPercent(percent) {
        return new Percentage(Number(percent) / 100);
    }
    toFraction() {
        return this.fraction;
    }
}
exports.Percentage = Percentage;
//# sourceMappingURL=percentage.js.map