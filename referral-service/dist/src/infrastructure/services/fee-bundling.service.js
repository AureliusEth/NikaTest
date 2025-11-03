"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeeBundlingService = void 0;
class FeeBundlingService {
    CONTRACT_ADDRESSES = {
        EVM: {
            XP: '0x0000000000000000000000000000000000000000',
            USDC: '0x0000000000000000000000000000000000000000',
        },
        SVM: {
            XP: '11111111111111111111111111111111',
            USDC: '11111111111111111111111111111111',
        },
    };
    bundleSplits(splits, chain) {
        const bundles = new Map();
        for (const split of splits) {
            const key = `${split.destination}:${split.token}`;
            if (!bundles.has(key)) {
                bundles.set(key, {
                    destination: split.destination,
                    chain,
                    token: split.token,
                    totalAmount: 0,
                    splits: [],
                    contractAddress: split.destination === 'claimable'
                        ? this.getContractAddress(chain, split.token)
                        : undefined,
                });
            }
            const bundle = bundles.get(key);
            bundle.totalAmount += split.amount;
            bundle.splits.push(split);
        }
        return Array.from(bundles.values());
    }
    getContractAddress(chain, token) {
        const address = this.CONTRACT_ADDRESSES[chain]?.[token];
        if (!address) {
            throw new Error(`No contract address configured for ${chain}:${token}`);
        }
        return address;
    }
    generateBundleSummary(bundles) {
        const lines = ['Fee Bundle Summary:'];
        for (const bundle of bundles) {
            lines.push(`  [${bundle.destination.toUpperCase()}] ${bundle.chain} ${bundle.token}: ${bundle.totalAmount.toFixed(8)}`);
            if (bundle.destination === 'claimable') {
                lines.push(`    Contract: ${bundle.contractAddress}`);
                lines.push(`    Splits: ${bundle.splits.length} users`);
            }
            else {
                lines.push(`    Direct to Nika Treasury`);
            }
        }
        return lines.join('\n');
    }
}
exports.FeeBundlingService = FeeBundlingService;
//# sourceMappingURL=fee-bundling.service.js.map