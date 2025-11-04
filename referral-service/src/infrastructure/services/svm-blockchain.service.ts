import { Injectable, Logger } from '@nestjs/common';
import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet, Idl } from '@coral-xyz/anchor';
import * as fs from 'fs';
import * as path from 'path';
import { NikaTreasury } from '../../../../contracts/svm/nika-treasury/target/types/nika_treasury';
import NikaTreasuryIDL from '../../../../contracts/svm/nika-treasury/target/idl/nika_treasury.json';
import { SVM_XP_PROGRAM_ID } from '../../common/chain-constants';

/**
 * SVM Blockchain Service (Solana)
 *
 * Handles interactions with Solana smart contracts (Anchor programs)
 * - Update merkle roots on-chain
 * - Verify proofs on-chain
 * - Read contract state
 *
 * Note on Anchor APIs:
 * - program.account.* is NOT deprecated (contrary to some IDL comments)
 * - program.methods.* is the modern way to call instructions
 * - Anchor v0.32+ provides full type inference when IDL is cast to specific type
 */
@Injectable()
export class SvmBlockchainService {
  private readonly logger = new Logger(SvmBlockchainService.name);
  private connection: Connection | null = null;
  private wallet: Wallet | null = null;
  private provider: AnchorProvider | null = null;
  private program: Program<NikaTreasury> | null = null;

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
        throw new Error(
          'Please provide private key as JSON array or file path',
        );
      }

      this.wallet = new Wallet(keypair);
      this.logger.log(
        `Solana service initialized with wallet: ${this.wallet.publicKey.toString()}`,
      );

      // Initialize Anchor program
      this.initializeProgram(keypair);
    } else {
      this.logger.warn(
        'Solana service initialized without wallet (read-only mode)',
      );
    }
  }

  /**
   * Initialize Anchor program
   */
  private initializeProgram(keypair: Keypair): void {
    if (!this.connection) {
      throw new Error('Connection not initialized');
    }

    // Create provider with connection and wallet
    this.provider = new AnchorProvider(this.connection, new Wallet(keypair), {
      commitment: 'confirmed',
    });

    // Use imported IDL with TypeScript types
    // Cast to specific NikaTreasury type, not generic Idl, to preserve type information
    const idl = NikaTreasuryIDL as unknown as NikaTreasury;
    this.logger.log(`Using Anchor TypeScript IDL for NikaTreasury`);

    try {
      const anchor = require('@coral-xyz/anchor');
      // Set provider globally first (Anchor convention)
      anchor.setProvider(this.provider);

      // Create Program with TypeScript types
      // Program<NikaTreasury> ensures type safety
      // Constructor: new Program(idl, provider) or new Program(idl, programId, provider)
      // Since IDL contains address, we can use (idl, provider)
      this.program = new Program<NikaTreasury>(idl, this.provider);

      // Verify program has provider set correctly
      if (!this.program.provider) {
        throw new Error('Program provider not set after initialization');
      }

      this.logger.log(
        `Anchor program initialized with program ID: ${this.program.programId.toString()}`,
      );
    } catch (error: any) {
      this.logger.error(`Failed to initialize Program: ${error.message}`);
      this.logger.error(`Error stack: ${error.stack}`);
      throw new Error(`Failed to initialize Program: ${error.message}`);
    }
  }

  /**
   * Convert hex string to Uint8Array
   */
  private hexToUint8Array(hex: string): Uint8Array {
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
    return new Uint8Array(Buffer.from(cleanHex, 'hex'));
  }

  /**
   * Convert hex proof array to Uint8Array format for Solana
   */
  private parseHexProofArray(hexArray: string[]): Uint8Array[] {
    return hexArray.map((hex) => this.hexToUint8Array(hex));
  }

  /**
   * Initialize the state account if it doesn't exist
   * Note: For regular accounts (not PDAs), we need the state keypair to initialize
   */
  private async ensureStateInitialized(): Promise<boolean> {
    if (!this.program || !this.wallet) {
      throw new Error('Program or wallet not initialized');
    }

    const stateAddress = this.getStateAddress();
    const statePublicKey = new PublicKey(stateAddress);
    const zeroRoot = Buffer.alloc(32, 0);

    try {
      // Try to fetch the state account to see if it's initialized
      await this.program.account.state.fetch(statePublicKey);
      this.logger.log(`State account ${stateAddress} already initialized`);
      return true;
    } catch (error: any) {
      // Account doesn't exist, isn't initialized, or has wrong discriminator
      const isUninitialized =
        error.message?.includes('Account does not exist') ||
        error.message?.includes('AccountOwnedByWrongProgram') ||
        error.message?.includes('Invalid account discriminator');

      if (isUninitialized) {
        // Try to load state keypair from file
        const stateKeypairPath =
          process.env.SVM_STATE_KEYPAIR_PATH || process.env.STATE_KEYPAIR_PATH;

        if (!stateKeypairPath) {
          throw new Error(
            'State account not initialized and no state keypair provided. ' +
              'Set SVM_STATE_KEYPAIR_PATH environment variable or run initialization script first.',
          );
        }

        let stateKeypair: Keypair;
        try {
          const keypairData = JSON.parse(
            fs.readFileSync(stateKeypairPath, 'utf-8'),
          );
          stateKeypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));

          // Use the state keypair's address instead of the passed stateAddress
          // The stateAddress might be a program ID or wrong address
          const resolvedStateAddress = stateKeypair.publicKey.toString();

          // If the passed address doesn't match, log a warning but use the keypair's address
          if (resolvedStateAddress !== stateAddress) {
            this.logger.warn(
              `State address mismatch: expected ${stateAddress}, using keypair address ${resolvedStateAddress}`,
            );
          }
        } catch (fileError: any) {
          throw new Error(
            `Failed to load state keypair from ${stateKeypairPath}: ${fileError.message}`,
          );
        }

        this.logger.log(
          `Initializing state account ${stateKeypair.publicKey.toString()}...`,
        );

        try {
          const tx = await this.program.methods
            .initialize(Array.from(zeroRoot))
            .accounts({
              state: stateKeypair.publicKey,
              authority: this.wallet.publicKey,
            })
            .signers([stateKeypair]) // State keypair must sign for account creation
            .rpc();

          this.logger.log(`State account initialized successfully: ${tx}`);
          return true;
        } catch (initError: any) {
          // If it's already initialized, that's fine
          if (
            initError.message?.includes('already in use') ||
            initError.message?.includes('AccountInUse')
          ) {
            this.logger.log(`State account already initialized`);
            return true;
          }
          this.logger.error(
            `Failed to initialize state account: ${initError.message}`,
          );
          throw initError;
        }
      }
      // If it's a different error, re-throw it
      throw error;
    }
  }

  /**
   * Get the state account address from the configured keypair file
   * @throws Error if state keypair is not configured
   */
  private getStateAddress(): string {
    const stateKeypairPath =
      process.env.SVM_STATE_KEYPAIR_PATH || process.env.STATE_KEYPAIR_PATH;

    if (!stateKeypairPath) {
      throw new Error(
        'State keypair path not configured. Set SVM_STATE_KEYPAIR_PATH environment variable.',
      );
    }

    if (!fs.existsSync(stateKeypairPath)) {
      throw new Error(`State keypair file not found at: ${stateKeypairPath}`);
    }

    try {
      const keypairData = JSON.parse(
        fs.readFileSync(stateKeypairPath, 'utf-8'),
      );
      const stateKeypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
      return stateKeypair.publicKey.toString();
    } catch (error: any) {
      throw new Error(
        `Failed to load state keypair from ${stateKeypairPath}: ${error.message}`,
      );
    }
  }

  /**
   * Update merkle root on-chain
   * Note: stateAddress parameter is deprecated and ignored - address is read from keypair file
   */
  async updateMerkleRoot(stateAddress: string, root: string): Promise<string> {
    if (!this.program || !this.wallet) {
      throw new Error(
        'Program or wallet not initialized. Cannot update merkle root.',
      );
    }

    // Get state address from configured keypair file
    const resolvedStateAddress = this.getStateAddress();

    // If the requested root is zero, skip updating on-chain to avoid overwriting
    // an existing non-zero root (e.g., when another token has no claimable data)
    const expectedRootHexEarly = root.replace(/^0x/, '').toLowerCase();
    if (expectedRootHexEarly === '0'.repeat(64)) {
      this.logger.warn(
        `Skipping on-chain update to zero root for state ${resolvedStateAddress}. ` +
          `Zero roots are expected when there is no claimable data.`,
      );
      return 'skipped:zero-root';
    }

    // Ensure state account is initialized first
    await this.ensureStateInitialized();

    const statePublicKey = new PublicKey(resolvedStateAddress);
    const rootBytes = this.hexToUint8Array(root);

    this.logger.log(
      `Updating merkle root on state ${resolvedStateAddress} to ${root}`,
    );
    this.logger.log(
      `Root bytes length: ${rootBytes.length}, wallet: ${this.wallet.publicKey.toString()}`,
    );

    try {
      // First, verify the state account's authority matches our wallet
      const currentState = await this.program.account.state.fetch(
        statePublicKey,
      );
      const stateAuthority = new PublicKey(currentState.authority.toString());
      const walletPubkey = this.wallet.publicKey;

      if (!stateAuthority.equals(walletPubkey)) {
        throw new Error(
          `Authority mismatch: State account authority is ${stateAuthority.toString()}, ` +
            `but wallet is ${walletPubkey.toString()}. Cannot update merkle root.`,
        );
      }

      this.logger.log(`Authority verified: ${walletPubkey.toString()}`);

      // Simulate the transaction first to catch any errors before sending
      const simulateResult = await this.program.methods
        .updateRoot(Array.from(rootBytes))
        .accounts({
          state: statePublicKey,
        })
        .simulate();

      // Check for simulation errors (simulate returns the result directly in newer Anchor versions)
      if ((simulateResult as any).value?.err) {
        throw new Error(
          `Transaction simulation failed: ${JSON.stringify((simulateResult as any).value.err)}`,
        );
      }

      // Anchor converts snake_case IDL methods to camelCase
      // updateRoot method expects array of numbers, not Uint8Array
      // Authority is automatically inferred from provider.wallet
      const tx = await this.program.methods
        .updateRoot(Array.from(rootBytes))
        .accounts({
          state: statePublicKey,
        })
        .rpc();

      this.logger.log(`Transaction confirmed: ${tx}`);

      // Verify the update was successful by fetching the root
      // Wait a bit for the transaction to be confirmed

      const updatedState = await this.program.account.state.fetch(
        statePublicKey,
      );
      const updatedRootHex = Buffer.from(updatedState.merkleRoot).toString(
        'hex',
      );
      const expectedRootHex = root.replace(/^0x/, '');

      this.logger.log(`Verified updated root: 0x${updatedRootHex}`);
      this.logger.log(`Expected root: 0x${expectedRootHex}`);

      // First check if the roots match - this is the primary validation
      if (updatedRootHex.toLowerCase() !== expectedRootHex.toLowerCase()) {
        throw new Error(
          `Root mismatch after update. Expected: 0x${expectedRootHex}, Got: 0x${updatedRootHex}. ` +
            `Transaction: ${tx}. Check transaction logs for errors.`,
        );
      }

      // Only warn if we successfully set a zero root (for tokens with no data)
      // This is not an error, just informational
      if (
        updatedRootHex === '0'.repeat(64) &&
        expectedRootHex === '0'.repeat(64)
      ) {
        this.logger.warn(
          `Updated to zero merkle root. This is expected for tokens with no claimable data. ` +
            `Transaction: ${tx}`,
        );
      }

      this.logger.log(
        `Successfully updated merkle root to 0x${updatedRootHex}`,
      );

      return tx;
    } catch (error: any) {
      this.logger.error(
        `Failed to update merkle root: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get current merkle root from contract
   * Note: stateAddress parameter is deprecated and ignored - address is read from keypair file
   */
  async getMerkleRoot(stateAddress: string): Promise<string> {
    if (!this.program) {
      throw new Error('Program not initialized');
    }

    // Get state address from configured keypair file
    const resolvedStateAddress = this.getStateAddress();
    const statePublicKey = new PublicKey(resolvedStateAddress);

    try {
      // Ensure we have connection
      if (!this.connection) {
        throw new Error('Connection not initialized');
      }

      // Use program.account API which should work with proper provider
      // If account doesn't exist, we'll get a clear error
      const state = await this.program.account.state.fetch(
        statePublicKey,
      );
      const rootHex = Buffer.from(state.merkleRoot).toString('hex');
      return '0x' + rootHex;
    } catch (error: any) {
      // If account doesn't exist, return zero root
      if (
        error.message?.includes('Account does not exist') ||
        error.message?.includes('fetch')
      ) {
        this.logger.warn(
          `State account not found at ${statePublicKey.toString()}, returning zero root`,
        );
        return '0x' + '0'.repeat(64);
      }
      this.logger.error(
        `Failed to get merkle root: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get current merkle root version from contract
   * Note: stateAddress parameter is deprecated and ignored - address is read from keypair file
   */
  async getMerkleRootVersion(stateAddress: string): Promise<number> {
    if (!this.program) {
      throw new Error('Program not initialized');
    }

    // Get state address from configured keypair file
    const resolvedStateAddress = this.getStateAddress();
    const statePublicKey = new PublicKey(resolvedStateAddress);

    try {
      // Ensure we have connection
      if (!this.connection) {
        throw new Error('Connection not initialized');
      }

      const state = await this.program.account.state.fetch(
        statePublicKey,
      );
      return Number(state.version);
    } catch (error: any) {
      // If account doesn't exist, return 0
      if (
        error.message?.includes('Account does not exist') ||
        error.message?.includes('fetch')
      ) {
        this.logger.warn(
          `State account not found at ${statePublicKey.toString()}, returning version 0`,
        );
        return 0;
      }
      this.logger.error(
        `Failed to get merkle root version: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Verify proof on-chain
   * Note: stateAddress parameter is deprecated and ignored - address is read from keypair file
   */
  async verifyProof(
    stateAddress: string,
    proof: string[],
    user_id: string,
    token: string,
    amount_str: string,
  ): Promise<boolean> {
    if (!this.program) {
      throw new Error('Program not initialized');
    }

    // Get state address from configured keypair file
    const resolvedStateAddress = this.getStateAddress();
    const statePublicKey = new PublicKey(resolvedStateAddress);
    const proofBytes = this.parseHexProofArray(proof);
    // Convert Uint8Array[] to number[][] as required by Anchor IDL
    const proofNumbers = proofBytes.map((p) => Array.from(p));

    try {
      const sim = await this.program.methods
        .verifyProof(user_id, token, amount_str, proofNumbers)
        .accounts({
          state: statePublicKey,
        })
        .simulate();

      // Anchor's simulate() returns event data in sim.events array
      // For verifyProof, look for "proofVerified" event with data.valid field
      const events = sim?.events || [];
      let valid = false;

      if (Array.isArray(events)) {
        for (const event of events) {
          if (
            event?.name === 'proofVerified' &&
            typeof event?.data?.valid === 'boolean'
          ) {
            valid = event.data.valid;
            break;
          }
        }
      } else {
        this.logger.error(
          `No events array found in simulation result. ` +
            `user_id=${user_id}, token=${token}, amount_str=${amount_str}, proofLen=${proof?.length || 0}`,
        );
      }

      if (!valid) {
        this.logger.warn(
          `SVM proof invalid. user_id=${user_id}, token=${token}, amount_str=${amount_str}, ` +
            `proofLen=${proof?.length || 0}, state=${resolvedStateAddress}`,
        );
      }

      return valid;
    } catch (error: any) {
      this.logger.error(
        `Failed to verify proof: ${error.message}`,
        error.stack,
      );
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
