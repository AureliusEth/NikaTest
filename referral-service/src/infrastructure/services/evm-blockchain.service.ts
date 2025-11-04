import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';

/**
 * EVM Blockchain Service
 *
 * Handles interactions with EVM-based smart contracts (Ethereum, Arbitrum, etc.)
 * - Update merkle roots on-chain
 * - Verify proofs on-chain
 * - Read contract state
 */
@Injectable()
export class EvmBlockchainService {
  private readonly logger = new Logger(EvmBlockchainService.name);
  private provider: ethers.JsonRpcProvider | null = null;
  private signer: ethers.Wallet | null = null;

  /**
   * Initialize the EVM provider and signer
   */
  initialize(rpcUrl: string, privateKey?: string): void {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    if (privateKey) {
      this.signer = new ethers.Wallet(privateKey, this.provider);
      this.logger.log(
        `EVM service initialized with signer: ${this.signer.address}`,
      );
    } else {
      this.logger.warn(
        'EVM service initialized without signer (read-only mode)',
      );
    }
  }

  /**
   * Get contract instance
   */
  private getContract(address: string): ethers.Contract {
    if (!this.provider) {
      throw new Error('EVM provider not initialized. Call initialize() first.');
    }

    // Contract ABI for NikaTreasury
    const abi = [
      'function updateMerkleRoot(bytes32 newRoot) external',
      'function merkleRoot() public view returns (bytes32)',
      'function merkleRootVersion() public view returns (uint256)',
      'function verifyProof(bytes32[] memory proof, string memory user_id, string memory token, string memory amount_str) public view returns (bool)',
      'event MerkleRootUpdated(bytes32 newRoot)',
    ];

    if (this.signer) {
      return new ethers.Contract(address, abi, this.signer);
    }
    return new ethers.Contract(address, abi, this.provider);
  }

  /**
   * Update merkle root on-chain
   */
  async updateMerkleRoot(
    contractAddress: string,
    root: string,
  ): Promise<string> {
    if (!this.signer) {
      throw new Error('No signer configured. Cannot update merkle root.');
    }

    const contract = this.getContract(contractAddress);
    this.logger.log(
      `Updating merkle root on contract ${contractAddress} to ${root}`,
    );

    try {
      const tx = await contract.updateMerkleRoot(root);
      this.logger.log(`Transaction sent: ${tx.hash}`);

      const receipt = await tx.wait();
      this.logger.log(`Transaction confirmed in block ${receipt.blockNumber}`);

      return receipt.hash;
    } catch (error) {
      this.logger.error(
        `Failed to update merkle root: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get current merkle root from contract
   */
  async getMerkleRoot(contractAddress: string): Promise<string> {
    const contract = this.getContract(contractAddress);

    try {
      const root = await contract.merkleRoot();
      return root;
    } catch (error) {
      this.logger.error(
        `Failed to get merkle root: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get current merkle root version from contract
   */
  async getMerkleRootVersion(contractAddress: string): Promise<number> {
    const contract = this.getContract(contractAddress);

    try {
      const version = await contract.merkleRootVersion();
      return Number(version);
    } catch (error) {
      this.logger.error(
        `Failed to get merkle root version: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Verify proof on-chain
   */
  async verifyProof(
    contractAddress: string,
    proof: string[],
    user_id: string,
    token: string,
    amount_str: string,
  ): Promise<boolean> {
    const contract = this.getContract(contractAddress);

    try {
      const isValid = await contract.verifyProof(
        proof,
        user_id,
        token,
        amount_str,
      );
      if (!isValid) {
        this.logger.warn(
          `EVM proof invalid. user_id=${user_id}, token=${token}, amount_str=${amount_str}, ` +
            `proofLen=${proof?.length || 0}, contract=${contractAddress}`,
        );
      }
      return isValid;
    } catch (error) {
      this.logger.error(
        `Failed to verify proof: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Check if contract is initialized
   */
  isInitialized(): boolean {
    return this.provider !== null;
  }

  /**
   * Get signer address (if available)
   */
  getSignerAddress(): string | null {
    return this.signer?.address || null;
  }
}
