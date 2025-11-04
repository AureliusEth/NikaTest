export interface ChainConfig {
    address: string;
    network: string;
    chainId?: number;
    rpcUrl: string;
}
export interface ChainConstants {
    EVM: {
        XP: ChainConfig;
        USDC: ChainConfig;
    };
    SVM: {
        XP: ChainConfig;
        USDC: ChainConfig;
    };
}
export declare const CHAIN_CONSTANTS: ChainConstants;
export declare function getContractAddressForChain(chain: 'EVM' | 'SVM', token: 'XP' | 'USDC'): string;
export declare function getRpcUrlForChain(chain: 'EVM' | 'SVM'): string;
export declare function getChainId(): number | undefined;
export declare const EVM_XP_CONTRACT_ADDRESS: string;
export declare const EVM_USDC_CONTRACT_ADDRESS: string;
export declare const SVM_XP_PROGRAM_ID: string;
export declare const SVM_USDC_CONTRACT_ADDRESS: string;
