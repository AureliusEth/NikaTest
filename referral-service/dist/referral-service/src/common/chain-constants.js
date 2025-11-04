"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SVM_USDC_CONTRACT_ADDRESS = exports.SVM_XP_PROGRAM_ID = exports.EVM_USDC_CONTRACT_ADDRESS = exports.EVM_XP_CONTRACT_ADDRESS = exports.CHAIN_CONSTANTS = void 0;
exports.getContractAddressForChain = getContractAddressForChain;
exports.getRpcUrlForChain = getRpcUrlForChain;
exports.getChainId = getChainId;
function getContractAddress(envKey, deployedAddress, fallback = 'NOT_CONFIGURED') {
    return process.env[envKey] || deployedAddress || fallback;
}
exports.CHAIN_CONSTANTS = {
    EVM: {
        XP: {
            address: getContractAddress('EVM_XP_CONTRACT_ADDRESS', '0x3C4BB209c7f8E77C425247C9507Ace7F3685624C', '0x0000000000000000000000000000000000000000'),
            network: 'arbitrum-sepolia',
            chainId: 421614,
            rpcUrl: process.env.EVM_RPC_URL ||
                'https://arbitrum-sepolia.infura.io/v3/5ce3f0a2d7814e3c9da96f8e8ebf4d0c',
        },
        USDC: {
            address: getContractAddress('EVM_USDC_CONTRACT_ADDRESS', '0x0000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000000'),
            network: 'arbitrum-sepolia',
            chainId: 421614,
            rpcUrl: process.env.EVM_RPC_URL ||
                'https://arbitrum-sepolia.infura.io/v3/5ce3f0a2d7814e3c9da96f8e8ebf4d0c',
        },
    },
    SVM: {
        XP: {
            address: getContractAddress('SVM_XP_CONTRACT_ADDRESS', 'EkEP6vRisXSE4TSBDvr8FcpzZgSaYeVKc9uRdFpnXQVB', '11111111111111111111111111111111'),
            network: 'devnet',
            chainId: undefined,
            rpcUrl: process.env.SVM_RPC_URL || 'https://api.devnet.solana.com',
        },
        USDC: {
            address: getContractAddress('SVM_USDC_CONTRACT_ADDRESS', '11111111111111111111111111111111', '11111111111111111111111111111111'),
            network: 'devnet',
            chainId: undefined,
            rpcUrl: process.env.SVM_RPC_URL || 'https://api.devnet.solana.com',
        },
    },
};
function getContractAddressForChain(chain, token) {
    return exports.CHAIN_CONSTANTS[chain][token].address;
}
function getRpcUrlForChain(chain) {
    return chain === 'EVM'
        ? exports.CHAIN_CONSTANTS.EVM.XP.rpcUrl
        : exports.CHAIN_CONSTANTS.SVM.XP.rpcUrl;
}
function getChainId() {
    return exports.CHAIN_CONSTANTS.EVM.XP.chainId;
}
exports.EVM_XP_CONTRACT_ADDRESS = exports.CHAIN_CONSTANTS.EVM.XP.address;
exports.EVM_USDC_CONTRACT_ADDRESS = exports.CHAIN_CONSTANTS.EVM.USDC.address;
exports.SVM_XP_PROGRAM_ID = exports.CHAIN_CONSTANTS.SVM.XP.address;
exports.SVM_USDC_CONTRACT_ADDRESS = exports.CHAIN_CONSTANTS.SVM.USDC.address;
//# sourceMappingURL=chain-constants.js.map