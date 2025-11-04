export interface Split {
    beneficiaryId: string;
    level: number;
    rate: number;
    amount: number;
    token: string;
    destination: 'treasury' | 'claimable';
}
export interface CommissionContext {
    userId: string;
    userCashbackRate: number;
    ancestors: string[];
    token?: string;
    chain?: 'EVM' | 'SVM';
}
export interface CommissionPolicy {
    calculateSplits(tradeFee: number, ctx: CommissionContext): Split[];
}
