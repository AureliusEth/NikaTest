"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var SvmBlockchainService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SvmBlockchainService = void 0;
const common_1 = require("@nestjs/common");
const web3_js_1 = require("@solana/web3.js");
const anchor_1 = require("@coral-xyz/anchor");
const fs = __importStar(require("fs"));
const nika_treasury_json_1 = __importDefault(require("../../../../contracts/svm/nika-treasury/target/idl/nika_treasury.json"));
let SvmBlockchainService = SvmBlockchainService_1 = class SvmBlockchainService {
    logger = new common_1.Logger(SvmBlockchainService_1.name);
    connection = null;
    wallet = null;
    provider = null;
    program = null;
    initialize(rpcUrl, privateKeyOrPath) {
        this.connection = new web3_js_1.Connection(rpcUrl, 'confirmed');
        if (privateKeyOrPath) {
            let keypair;
            if (privateKeyOrPath.startsWith('[') || privateKeyOrPath.includes(',')) {
                const keyArray = JSON.parse(privateKeyOrPath);
                keypair = web3_js_1.Keypair.fromSecretKey(Uint8Array.from(keyArray));
            }
            else if (fs.existsSync(privateKeyOrPath)) {
                const keyData = JSON.parse(fs.readFileSync(privateKeyOrPath, 'utf-8'));
                keypair = web3_js_1.Keypair.fromSecretKey(Uint8Array.from(keyData));
            }
            else {
                throw new Error('Please provide private key as JSON array or file path');
            }
            this.wallet = new anchor_1.Wallet(keypair);
            this.logger.log(`Solana service initialized with wallet: ${this.wallet.publicKey.toString()}`);
            this.initializeProgram(keypair);
        }
        else {
            this.logger.warn('Solana service initialized without wallet (read-only mode)');
        }
    }
    initializeProgram(keypair) {
        if (!this.connection) {
            throw new Error('Connection not initialized');
        }
        this.provider = new anchor_1.AnchorProvider(this.connection, new anchor_1.Wallet(keypair), {
            commitment: 'confirmed',
        });
        const idl = nika_treasury_json_1.default;
        this.logger.log(`Using Anchor TypeScript IDL for NikaTreasury`);
        try {
            const anchor = require('@coral-xyz/anchor');
            anchor.setProvider(this.provider);
            this.program = new anchor_1.Program(idl, this.provider);
            if (!this.program.provider) {
                throw new Error('Program provider not set after initialization');
            }
            this.logger.log(`Anchor program initialized with program ID: ${this.program.programId.toString()}`);
        }
        catch (error) {
            this.logger.error(`Failed to initialize Program: ${error.message}`);
            this.logger.error(`Error stack: ${error.stack}`);
            throw new Error(`Failed to initialize Program: ${error.message}`);
        }
    }
    hexToUint8Array(hex) {
        const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
        return new Uint8Array(Buffer.from(cleanHex, 'hex'));
    }
    parseHexProofArray(hexArray) {
        return hexArray.map((hex) => this.hexToUint8Array(hex));
    }
    async ensureStateInitialized() {
        if (!this.program || !this.wallet) {
            throw new Error('Program or wallet not initialized');
        }
        const stateAddress = this.getStateAddress();
        const statePublicKey = new web3_js_1.PublicKey(stateAddress);
        const zeroRoot = Buffer.alloc(32, 0);
        try {
            await this.program.account.state.fetch(statePublicKey);
            this.logger.log(`State account ${stateAddress} already initialized`);
            return true;
        }
        catch (error) {
            const isUninitialized = error.message?.includes('Account does not exist') ||
                error.message?.includes('AccountOwnedByWrongProgram') ||
                error.message?.includes('Invalid account discriminator');
            if (isUninitialized) {
                const stateKeypairPath = process.env.SVM_STATE_KEYPAIR_PATH || process.env.STATE_KEYPAIR_PATH;
                if (!stateKeypairPath) {
                    throw new Error('State account not initialized and no state keypair provided. ' +
                        'Set SVM_STATE_KEYPAIR_PATH environment variable or run initialization script first.');
                }
                let stateKeypair;
                try {
                    const keypairData = JSON.parse(fs.readFileSync(stateKeypairPath, 'utf-8'));
                    stateKeypair = web3_js_1.Keypair.fromSecretKey(Uint8Array.from(keypairData));
                    const resolvedStateAddress = stateKeypair.publicKey.toString();
                    if (resolvedStateAddress !== stateAddress) {
                        this.logger.warn(`State address mismatch: expected ${stateAddress}, using keypair address ${resolvedStateAddress}`);
                    }
                }
                catch (fileError) {
                    throw new Error(`Failed to load state keypair from ${stateKeypairPath}: ${fileError.message}`);
                }
                this.logger.log(`Initializing state account ${stateKeypair.publicKey.toString()}...`);
                try {
                    const tx = await this.program.methods
                        .initialize(Array.from(zeroRoot))
                        .accounts({
                        state: stateKeypair.publicKey,
                        authority: this.wallet.publicKey,
                    })
                        .signers([stateKeypair])
                        .rpc();
                    this.logger.log(`State account initialized successfully: ${tx}`);
                    return true;
                }
                catch (initError) {
                    if (initError.message?.includes('already in use') ||
                        initError.message?.includes('AccountInUse')) {
                        this.logger.log(`State account already initialized`);
                        return true;
                    }
                    this.logger.error(`Failed to initialize state account: ${initError.message}`);
                    throw initError;
                }
            }
            throw error;
        }
    }
    getStateAddress() {
        const stateKeypairPath = process.env.SVM_STATE_KEYPAIR_PATH || process.env.STATE_KEYPAIR_PATH;
        if (!stateKeypairPath) {
            throw new Error('State keypair path not configured. Set SVM_STATE_KEYPAIR_PATH environment variable.');
        }
        if (!fs.existsSync(stateKeypairPath)) {
            throw new Error(`State keypair file not found at: ${stateKeypairPath}`);
        }
        try {
            const keypairData = JSON.parse(fs.readFileSync(stateKeypairPath, 'utf-8'));
            const stateKeypair = web3_js_1.Keypair.fromSecretKey(Uint8Array.from(keypairData));
            return stateKeypair.publicKey.toString();
        }
        catch (error) {
            throw new Error(`Failed to load state keypair from ${stateKeypairPath}: ${error.message}`);
        }
    }
    async updateMerkleRoot(stateAddress, root) {
        if (!this.program || !this.wallet) {
            throw new Error('Program or wallet not initialized. Cannot update merkle root.');
        }
        const resolvedStateAddress = this.getStateAddress();
        const expectedRootHexEarly = root.replace(/^0x/, '').toLowerCase();
        if (expectedRootHexEarly === '0'.repeat(64)) {
            this.logger.warn(`Skipping on-chain update to zero root for state ${resolvedStateAddress}. ` +
                `Zero roots are expected when there is no claimable data.`);
            return 'skipped:zero-root';
        }
        await this.ensureStateInitialized();
        const statePublicKey = new web3_js_1.PublicKey(resolvedStateAddress);
        const rootBytes = this.hexToUint8Array(root);
        this.logger.log(`Updating merkle root on state ${resolvedStateAddress} to ${root}`);
        this.logger.log(`Root bytes length: ${rootBytes.length}, wallet: ${this.wallet.publicKey.toString()}`);
        try {
            const currentState = await this.program.account.state.fetch(statePublicKey);
            const stateAuthority = new web3_js_1.PublicKey(currentState.authority.toString());
            const walletPubkey = this.wallet.publicKey;
            if (!stateAuthority.equals(walletPubkey)) {
                throw new Error(`Authority mismatch: State account authority is ${stateAuthority.toString()}, ` +
                    `but wallet is ${walletPubkey.toString()}. Cannot update merkle root.`);
            }
            this.logger.log(`Authority verified: ${walletPubkey.toString()}`);
            const simulateResult = await this.program.methods
                .updateRoot(Array.from(rootBytes))
                .accounts({
                state: statePublicKey,
            })
                .simulate();
            if (simulateResult.value?.err) {
                throw new Error(`Transaction simulation failed: ${JSON.stringify(simulateResult.value.err)}`);
            }
            const tx = await this.program.methods
                .updateRoot(Array.from(rootBytes))
                .accounts({
                state: statePublicKey,
            })
                .rpc();
            this.logger.log(`Transaction confirmed: ${tx}`);
            const updatedState = await this.program.account.state.fetch(statePublicKey);
            const updatedRootHex = Buffer.from(updatedState.merkleRoot).toString('hex');
            const expectedRootHex = root.replace(/^0x/, '');
            this.logger.log(`Verified updated root: 0x${updatedRootHex}`);
            this.logger.log(`Expected root: 0x${expectedRootHex}`);
            if (updatedRootHex.toLowerCase() !== expectedRootHex.toLowerCase()) {
                throw new Error(`Root mismatch after update. Expected: 0x${expectedRootHex}, Got: 0x${updatedRootHex}. ` +
                    `Transaction: ${tx}. Check transaction logs for errors.`);
            }
            if (updatedRootHex === '0'.repeat(64) &&
                expectedRootHex === '0'.repeat(64)) {
                this.logger.warn(`Updated to zero merkle root. This is expected for tokens with no claimable data. ` +
                    `Transaction: ${tx}`);
            }
            this.logger.log(`Successfully updated merkle root to 0x${updatedRootHex}`);
            return tx;
        }
        catch (error) {
            this.logger.error(`Failed to update merkle root: ${error.message}`, error.stack);
            throw error;
        }
    }
    async getMerkleRoot(stateAddress) {
        if (!this.program) {
            throw new Error('Program not initialized');
        }
        const resolvedStateAddress = this.getStateAddress();
        const statePublicKey = new web3_js_1.PublicKey(resolvedStateAddress);
        try {
            if (!this.connection) {
                throw new Error('Connection not initialized');
            }
            const state = await this.program.account.state.fetch(statePublicKey);
            const rootHex = Buffer.from(state.merkleRoot).toString('hex');
            return '0x' + rootHex;
        }
        catch (error) {
            if (error.message?.includes('Account does not exist') ||
                error.message?.includes('fetch')) {
                this.logger.warn(`State account not found at ${statePublicKey.toString()}, returning zero root`);
                return '0x' + '0'.repeat(64);
            }
            this.logger.error(`Failed to get merkle root: ${error.message}`, error.stack);
            throw error;
        }
    }
    async getMerkleRootVersion(stateAddress) {
        if (!this.program) {
            throw new Error('Program not initialized');
        }
        const resolvedStateAddress = this.getStateAddress();
        const statePublicKey = new web3_js_1.PublicKey(resolvedStateAddress);
        try {
            if (!this.connection) {
                throw new Error('Connection not initialized');
            }
            const state = await this.program.account.state.fetch(statePublicKey);
            return Number(state.version);
        }
        catch (error) {
            if (error.message?.includes('Account does not exist') ||
                error.message?.includes('fetch')) {
                this.logger.warn(`State account not found at ${statePublicKey.toString()}, returning version 0`);
                return 0;
            }
            this.logger.error(`Failed to get merkle root version: ${error.message}`, error.stack);
            throw error;
        }
    }
    async verifyProof(stateAddress, proof, user_id, token, amount_str) {
        if (!this.program) {
            throw new Error('Program not initialized');
        }
        const resolvedStateAddress = this.getStateAddress();
        const statePublicKey = new web3_js_1.PublicKey(resolvedStateAddress);
        const proofBytes = this.parseHexProofArray(proof);
        const proofNumbers = proofBytes.map((p) => Array.from(p));
        try {
            const sim = await this.program.methods
                .verifyProof(user_id, token, amount_str, proofNumbers)
                .accounts({
                state: statePublicKey,
            })
                .simulate();
            const events = sim?.events || [];
            let valid = false;
            if (Array.isArray(events)) {
                for (const event of events) {
                    if (event?.name === 'proofVerified' &&
                        typeof event?.data?.valid === 'boolean') {
                        valid = event.data.valid;
                        break;
                    }
                }
            }
            else {
                this.logger.error(`No events array found in simulation result. ` +
                    `user_id=${user_id}, token=${token}, amount_str=${amount_str}, proofLen=${proof?.length || 0}`);
            }
            if (!valid) {
                this.logger.warn(`SVM proof invalid. user_id=${user_id}, token=${token}, amount_str=${amount_str}, ` +
                    `proofLen=${proof?.length || 0}, state=${resolvedStateAddress}`);
            }
            return valid;
        }
        catch (error) {
            this.logger.error(`Failed to verify proof: ${error.message}`, error.stack);
            throw error;
        }
    }
    isInitialized() {
        return this.connection !== null;
    }
    getWalletAddress() {
        return this.wallet?.publicKey.toString() || null;
    }
};
exports.SvmBlockchainService = SvmBlockchainService;
exports.SvmBlockchainService = SvmBlockchainService = SvmBlockchainService_1 = __decorate([
    (0, common_1.Injectable)()
], SvmBlockchainService);
//# sourceMappingURL=svm-blockchain.service.js.map