/**
 * Chain Constants
 *
 * Centralized configuration for blockchain contract addresses and network settings.
 * These values are read from environment variables with fallback to deployed addresses.
 *
 * Update these values after deploying new contracts or when switching networks.
 */

export interface ChainConfig {
  /** Contract address or program ID */
  address: string;
  /** Network/chain identifier */
  network: string;
  /** Chain ID (for EVM chains) */
  chainId?: number;
  /** RPC URL */
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

/**
 * Get contract address for a chain and token.
 * Priority: Environment variable > Deployed address > Fallback
 */
function getContractAddress(
  envKey: string,
  deployedAddress: string,
  fallback: string = 'NOT_CONFIGURED',
): string {
  return process.env[envKey] || deployedAddress || fallback;
}

/**
 * Chain constants configuration
 *
 * Recently deployed addresses:
 * - Solana (SVM) Program ID: EkEP6vRisXSE4TSBDvr8FcpzZgSaYeVKc9uRdFpnXQVB
 * - EVM Contract Address: 0x3C4BB209c7f8E77C425247C9507Ace7F3685624C
 * - Chain ID: 421614 (Arbitrum Sepolia)
 * - Network: devnet (Solana), arbitrum-sepolia (EVM)
 */
export const CHAIN_CONSTANTS: ChainConstants = {
  EVM: {
    XP: {
      address: getContractAddress(
        'EVM_XP_CONTRACT_ADDRESS',
        '0x3C4BB209c7f8E77C425247C9507Ace7F3685624C',
        '0x0000000000000000000000000000000000000000',
      ),
      network: 'arbitrum-sepolia',
      chainId: 421614,
      rpcUrl:
        process.env.EVM_RPC_URL ||
        'https://arbitrum-sepolia.infura.io/v3/5ce3f0a2d7814e3c9da96f8e8ebf4d0c',
    },
    USDC: {
      address: getContractAddress(
        'EVM_USDC_CONTRACT_ADDRESS',
        '0x0000000000000000000000000000000000000000',
        '0x0000000000000000000000000000000000000000',
      ),
      network: 'arbitrum-sepolia',
      chainId: 421614,
      rpcUrl:
        process.env.EVM_RPC_URL ||
        'https://arbitrum-sepolia.infura.io/v3/5ce3f0a2d7814e3c9da96f8e8ebf4d0c',
    },
  },
  SVM: {
    XP: {
      address: getContractAddress(
        'SVM_XP_CONTRACT_ADDRESS',
        'EkEP6vRisXSE4TSBDvr8FcpzZgSaYeVKc9uRdFpnXQVB',
        '11111111111111111111111111111111',
      ),
      network: 'devnet',
      chainId: undefined, // Solana doesn't use chain IDs
      rpcUrl: process.env.SVM_RPC_URL || 'https://api.devnet.solana.com',
    },
    USDC: {
      address: getContractAddress(
        'SVM_USDC_CONTRACT_ADDRESS',
        '11111111111111111111111111111111',
        '11111111111111111111111111111111',
      ),
      network: 'devnet',
      chainId: undefined,
      rpcUrl: process.env.SVM_RPC_URL || 'https://api.devnet.solana.com',
    },
  },
};

/**
 * Get contract address for a chain and token
 */
export function getContractAddressForChain(
  chain: 'EVM' | 'SVM',
  token: 'XP' | 'USDC',
): string {
  return CHAIN_CONSTANTS[chain][token].address;
}

/**
 * Get RPC URL for a chain
 */
export function getRpcUrlForChain(chain: 'EVM' | 'SVM'): string {
  return chain === 'EVM'
    ? CHAIN_CONSTANTS.EVM.XP.rpcUrl
    : CHAIN_CONSTANTS.SVM.XP.rpcUrl;
}

/**
 * Get chain ID for EVM chains
 */
export function getChainId(): number | undefined {
  return CHAIN_CONSTANTS.EVM.XP.chainId;
}

/**
 * Export individual constants for convenience
 */
export const EVM_XP_CONTRACT_ADDRESS = CHAIN_CONSTANTS.EVM.XP.address;
export const EVM_USDC_CONTRACT_ADDRESS = CHAIN_CONSTANTS.EVM.USDC.address;
export const SVM_XP_PROGRAM_ID = CHAIN_CONSTANTS.SVM.XP.address;
export const SVM_USDC_CONTRACT_ADDRESS = CHAIN_CONSTANTS.SVM.USDC.address;

/**
 * Deployment information
 *
 * Last updated: After deployment on 2025-03-11
 *
 * Solana Deployment:
 * - Program ID: EkEP6vRisXSE4TSBDvr8FcpzZgSaYeVKc9uRdFpnXQVB
 * - Network: devnet
 * - Signature: 45G37Rcte7Uz1x1tz62pdS1sdVpR1DkwKpPzb2H5C6od878cVGrhQYBeLCD2TbCGAr3saRGtDEfVxKmfsJfF4mGa
 *
 * EVM Deployment:
 * - Contract Address: 0x3C4BB209c7f8E77C425247C9507Ace7F3685624C
 * - Network: arbitrum-sepolia
 * - Chain ID: 421614
 * - Transaction Hash: 0x914e95ca09503f172ce9fa4878c68490eae29d21a0e278f88260693a65341891
 * - Block: 211525294
 */
