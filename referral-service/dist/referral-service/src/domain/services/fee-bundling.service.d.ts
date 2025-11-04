import { Split } from '../policies/commission-policy';
export interface FeeBundle {
    destination: 'treasury' | 'claimable';
    chain: 'EVM' | 'SVM';
    token: string;
    totalAmount: number;
    splits: Split[];
    contractAddress?: string;
}
export interface FeeBundlingService {
    bundleSplits(splits: Split[], chain: 'EVM' | 'SVM'): FeeBundle[];
    getContractAddress(chain: 'EVM' | 'SVM', token: string): string;
}
