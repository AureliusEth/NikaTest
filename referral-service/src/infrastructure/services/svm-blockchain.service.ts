import { Injectable, Logger } from '@nestjs/common';
import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import * as fs from 'fs';
import * as path from 'path';

/**
 * SVM Blockchain Service (Solana)
 * 
 * Handles interactions with Solana smart contracts (Anchor programs)
 * - Update merkle roots on-chain
 * - Verify proofs on-chain
 * - Read contract state
 */
@Injectable()
export class SvmBlockchainService {
  private readonly logger = new Logger(SvmBlockchainService.name);
  private connection: Connection | null = null;
  private wallet: Wallet | null = null;
  private program: Program | null = null;

  /**
   * Initialize the Solana connection and wallet
   */
  initialize(rpcUrl: string, privateKeyOrPath?: string): void {
    this.connection = new Connection(rpcUrl, 'confirmed');
    
    if (privateKeyOrPath) {
      let keypair: Keypair;
      
      // Check if it's a file path or raw private key
      if (privateKeyOrPath.startsWith('[') || privateKeyOrPath.includes(',')) {
        // Assume it's a JSON array (Solana keypair format)
        const keyArray = JSON.parse(privateKeyOrPath);
        keypair = Keypair.fromSecretKey(Uint8Array.from(keyArray));
      } else if (fs.existsSync(privateKeyOrPath)) {
        // Assume it's a file path
        const keyData = JSON.parse(fs.readFileSync(privateKeyOrPath, 'utf-8'));
        keypair = Keypair.fromSecretKey(Uint8Array.from(keyData));
      } else {
        // Assume it's base58 encoded private key
        throw new Error('Please provide private key as JSON array or file path');
      }

      this.wallet = new Wallet(keypair);
      this.logger.log(`Solana service initialized with wallet: ${this.wallet.publicKey.toString()}`);
      
      // Initialize Anchor program
      this.initializeProgram(keypair);
    } else {
      this.logger.warn('Solana service initialized without wallet (read-only mode)');
    }
  }

  /**
   * Initialize Anchor program
   */
  private initializeProgram(keypair: Keypair): void {
    if (!this.connection) {
      throw new Error('Connection not initialized');
    }

    const provider = new AnchorProvider(
      this.connection,
      new Wallet(keypair),
      { commitment: 'confirmed' }
    );

    // Program ID from the contract
    const programId = new PublicKey('EkEP6vRisXSE4TSBDvr8FcpzZgSaYeVKc9uRdFpnXQVB');

    // Load IDL (Interface Definition Language) from the contract
    // In production, you'd load this from a file or fetch from chain
    const idl = {
      version: '0.1.0',
      name: 'nika_treasury',
      instructions: [
        {
          name: 'initialize',
          accounts: [
            { name: 'state', isMut: true, isSigner: false },
            { name: 'authority', isMut: true, isSigner: true },
            { name: 'systemProgram', isMut: false, isSigner: false },
          ],
          args: [{ name: 'merkleRoot', type: { array: ['u8', 32] } }],
        },
        {
          name: 'updateRoot',
          accounts: [
            { name: 'state', isMut: true, isSigner: false },
            { name: 'authority', isMut: false, isSigner: true },
          ],
          args: [{ name: 'newRoot', type: { array: ['u8', 32] } }],
        },
        {
          name: 'verifyProof',
          accounts: [
            { name: 'state', isMut: false, isSigner: false },
            { name: 'user', isMut: false, isSigner: true },
          ],
          args: [
            { name: 'amount', type: 'u64' },
            { name: 'proof', type: { vec: { array: ['u8', 32] } } },
          ],
        },
        {
          name: 'viewRoot',
          accounts: [{ name: 'state', isMut: false, isSigner: false }],
          args: [],
        },
      ],
      accounts: [
        {
          name: 'State',
          type: {
            kind: 'struct',
            fields: [
              { name: 'merkleRoot', type: { array: ['u8', 32] } },
              { name: 'version', type: 'u64' },
              { name: 'authority', type: 'publicKey' },
            ],
          },
        },
      ],
    };

    this.program = new Program(idl as any, programId, provider);
    this.logger.log('Anchor program initialized');
  }

  /**
   * Get state PDA (Program Derived Address)
   */
  private async getStatePda(): Promise<PublicKey> {
    if (!this.program) {
      throw new Error('Program not initialized');
    }

    // State PDA derivation (this should match your contract)
    const [statePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('state')],
      this.program.programId
    );

    return statePda;
  }

  /**
   * Convert hex string to Uint8Array
   */
  private hexToUint8Array(hex: string): Uint8Array {
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
    return new Uint8Array(Buffer.from(cleanHex, 'hex'));
  }

  /**
   * Convert hex string array to Uint8Array array
   */
  private hexArrayToUint8ArrayArray(hexArray: string[]): Uint8Array[] {
    return hexArray.map(hex => this.hexToUint8Array(hex));
  }

  /**
   * Update merkle root on-chain
   */
  async updateMerkleRoot(stateAddress: string, root: string): Promise<string> {
    if (!this.program || !this.wallet) {
      throw new Error('Program or wallet not initialized. Cannot update merkle root.');
    }

    const statePda = new PublicKey(stateAddress);
    const rootBytes = this.hexToUint8Array(root);

    this.logger.log(`Updating merkle root on state ${stateAddress} to ${root}`);

    try {
      const tx = await this.program.methods
        .updateRoot(rootBytes)
        .accounts({
          state: statePda,
          authority: this.wallet.publicKey,
        })
        .rpc();

      this.logger.log(`Transaction confirmed: ${tx}`);
      return tx;
    } catch (error) {
      this.logger.error(`Failed to update merkle root: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get current merkle root from contract
   */
  async getMerkleRoot(stateAddress: string): Promise<string> {
    if (!this.program) {
      throw new Error('Program not initialized');
    }

    const statePda = new PublicKey(stateAddress);

    try {
      const state = await this.program.account.state.fetch(statePda);
      const rootHex = Buffer.from(state.merkleRoot).toString('hex');
      return '0x' + rootHex;
    } catch (error) {
      this.logger.error(`Failed to get merkle root: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get current merkle root version from contract
   */
  async getMerkleRootVersion(stateAddress: string): Promise<number> {
    if (!this.program) {
      throw new Error('Program not initialized');
    }

    const statePda = new PublicKey(stateAddress);

    try {
      const state = await this.program.account.state.fetch(statePda);
      return Number(state.version);
    } catch (error) {
      this.logger.error(`Failed to get merkle root version: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Verify proof on-chain
   */
  async verifyProof(
    stateAddress: string,
    proof: string[],
    amount: number,
    userAddress: string
  ): Promise<boolean> {
    if (!this.program) {
      throw new Error('Program not initialized');
    }

    const statePda = new PublicKey(stateAddress);
    const userPubkey = new PublicKey(userAddress);
    const proofBytes = this.hexArrayToUint8ArrayArray(proof);
    const amountLamports = Math.floor(amount * 1e9); // Convert to lamports (9 decimals)

    try {
      // Note: verifyProof is a view function, but Anchor doesn't support view functions directly
      // This would need to be called via a transaction or RPC call
      // For now, we'll return a promise that indicates we'd need to implement this differently
      throw new Error('Proof verification via RPC not yet implemented. Use client-side verification.');
    } catch (error) {
      this.logger.error(`Failed to verify proof: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.connection !== null;
  }

  /**
   * Get wallet address (if available)
   */
  getWalletAddress(): string | null {
    return this.wallet?.publicKey.toString() || null;
  }
}

