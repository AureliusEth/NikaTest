import { Split } from '../../domain/policies/commission-policy';
import { FeeBundlingService as IFeeBundlingService, FeeBundle } from '../../domain/services/fee-bundling.service';
export declare class FeeBundlingService implements IFeeBundlingService {
    private readonly CONTRACT_ADDRESSES;
    bundleSplits(splits: Split[], chain: 'EVM' | 'SVM'): FeeBundle[];
    getContractAddress(chain: 'EVM' | 'SVM', token: string): string;
    generateBundleSummary(bundles: FeeBundle[]): string;
}
