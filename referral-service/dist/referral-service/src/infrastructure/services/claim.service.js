"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ClaimService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaimService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/services/prisma.service");
const merkle_tree_service_1 = require("./merkle-tree.service");
const evm_blockchain_service_1 = require("./evm-blockchain.service");
const svm_blockchain_service_1 = require("./svm-blockchain.service");
const chain_constants_1 = require("../../common/chain-constants");
const web3_js_1 = require("@solana/web3.js");
let ClaimService = ClaimService_1 = class ClaimService {
    prisma;
    merkleService;
    evmService;
    svmService;
    logger = new common_1.Logger(ClaimService_1.name);
    constructor(prisma, merkleService, evmService, svmService) {
        this.prisma = prisma;
        this.merkleService = merkleService;
        this.evmService = evmService;
        this.svmService = svmService;
    }
    async claim(userId, chain, token) {
        const rootData = await this.merkleService.getLatestRoot(chain, token);
        if (!rootData) {
            return {
                success: false,
                error: 'No merkle root found. Generate one first.',
            };
        }
        const existingClaim = await this.prisma.claimRecord.findUnique({
            where: {
                userId_chain_token_merkleVersion: {
                    userId,
                    chain,
                    token,
                    merkleVersion: rootData.version,
                },
            },
        });
        if (existingClaim) {
            return {
                success: false,
                error: `Already claimed for merkle root version ${rootData.version}`,
            };
        }
        const balances = await this.merkleService['getClaimableBalances'](chain, token);
        const proof = this.merkleService.generateProof(userId, balances);
        if (!proof || proof.amount === 0) {
            return {
                success: false,
                error: 'No claimable balance found',
            };
        }
        const amount_str = proof.amount.toFixed(8);
        const contractAddress = this.getContractAddress(chain, token);
        var verified = false;
        try {
            this.logger.log(`Verifying proof on ${chain} contract: ${contractAddress}`);
            if (chain === 'EVM') {
                const onChainRoot = await this.evmService.getMerkleRoot(contractAddress);
                const dbRoot = rootData.root;
                this.logger.log(`EVM Merkle root - On-chain: ${onChainRoot}, Database: ${dbRoot}`);
                if (onChainRoot === '0x0000000000000000000000000000000000000000000000000000000000000000') {
                    this.logger.warn('Merkle root on EVM contract is zero - proof verification will fail. Update merkle root first.');
                    return {
                        success: false,
                        error: 'Merkle root not set on contract. Please update merkle root on-chain first.',
                        contractAddress,
                        onChainRoot,
                        databaseRoot: dbRoot,
                    };
                }
                verified = await this.evmService.verifyProof(contractAddress, proof.proof, userId, token, amount_str);
            }
            else if (chain === 'SVM') {
                const onChainRoot = await this.svmService.getMerkleRoot(contractAddress);
                const dbRoot = rootData.root;
                this.logger.log(`SVM Merkle root - On-chain: ${onChainRoot}, Database: ${dbRoot}`);
                if (onChainRoot === '0x0000000000000000000000000000000000000000000000000000000000000000') {
                    this.logger.warn('Merkle root on SVM contract is zero - proof verification will fail. Update merkle root first.');
                    return {
                        success: false,
                        error: 'Merkle root not set on contract. Please update merkle root on-chain first.',
                        contractAddress,
                        onChainRoot,
                        databaseRoot: dbRoot,
                    };
                }
                verified = await this.svmService.verifyProof(contractAddress, proof.proof, userId, token, amount_str);
            }
        }
        catch (error) {
            this.logger.error(`Failed to verify proof: ${error.message}`, error.stack);
            return {
                success: false,
                error: `Proof verification failed: ${error.message}`,
                details: error.stack,
            };
        }
        if (!verified) {
            const onChainRoot = chain === 'EVM'
                ? await this.evmService.getMerkleRoot(contractAddress)
                : await this.svmService.getMerkleRoot(contractAddress);
            const dbRoot = rootData.root;
            this.logger.warn(`Proof invalid for ${chain}/${token}. userId=${userId}, amount_str=${amount_str}, ` +
                `contract=${contractAddress}, onChainRoot=${onChainRoot}, databaseRoot=${dbRoot}, version=${rootData.version}`);
            return {
                success: false,
                error: 'Proof verification failed',
                contractAddress,
                onChainRoot,
                databaseRoot: dbRoot,
                details: `userId=${userId}, amount=${amount_str}, version=${rootData.version}`,
            };
        }
        const claimRecord = await this.prisma.claimRecord.create({
            data: {
                userId,
                chain,
                token,
                amount: proof.amount,
                merkleVersion: rootData.version,
                txHash: null,
            },
        });
        this.logger.log(`User ${userId} claimed ${proof.amount} ${token} on ${chain} (simulated)`);
        return {
            success: true,
            claimId: claimRecord.id,
            amount: Number(proof.amount),
        };
    }
    async transferXP(chain, token, userAddress, amount) {
        this.logger.warn('transferXP called but XP is simulated - no actual transfer');
        return `simulated_${Date.now()}`;
    }
    async updateTreasuryBalance(chain, token, amount) {
        const treasuryAddress = this.getTreasuryAddress(chain);
        const treasury = await this.prisma.treasuryAccount.upsert({
            where: {
                chain_token_address: {
                    chain,
                    token,
                    address: treasuryAddress,
                },
            },
            create: {
                chain,
                token,
                address: treasuryAddress,
                balance: amount,
                claimed: 0,
            },
            update: {
                balance: {
                    increment: amount,
                },
            },
        });
        this.logger.log(`Updated treasury balance: ${chain}/${token} = ${treasury.balance.toString()}`);
    }
    async getTreasuryBalance(chain, token) {
        const treasuryAddress = this.getTreasuryAddress(chain);
        const treasury = await this.prisma.treasuryAccount.findUnique({
            where: {
                chain_token_address: {
                    chain,
                    token,
                    address: treasuryAddress,
                },
            },
        });
        return treasury ? Number(treasury.balance) : 0;
    }
    async transferTreasuryFunds(chain, token) {
        const treasuryAddress = this.getTreasuryAddress(chain);
        const treasury = await this.prisma.treasuryAccount.findUnique({
            where: {
                chain_token_address: {
                    chain,
                    token,
                    address: treasuryAddress,
                },
            },
        });
        if (!treasury || Number(treasury.balance) <= Number(treasury.claimed)) {
            return {
                success: false,
                error: 'No treasury funds to transfer',
            };
        }
        const transferAmount = Number(treasury.balance) - Number(treasury.claimed);
        const txHash = `simulated_treasury_${Date.now()}`;
        await this.prisma.treasuryAccount.update({
            where: {
                id: treasury.id,
            },
            data: {
                claimed: treasury.balance,
            },
        });
        this.logger.log(`Transferred ${transferAmount} ${token} to treasury ${treasuryAddress} on ${chain} (simulated)`);
        return {
            success: true,
            txHash,
        };
    }
    async transferToTreasury(chain, token, treasuryAddress, amount) {
        this.logger.warn('transferToTreasury called but XP is simulated - no actual transfer');
        return `simulated_${Date.now()}`;
    }
    getContractAddress(chain, token) {
        if (chain === 'SVM') {
            const stateAddressEnv = process.env.SVM_STATE_ACCOUNT_ADDRESS || process.env.SVM_STATE_PDA_ADDRESS;
            if (stateAddressEnv) {
                this.logger.log(`Using SVM state account from env: ${stateAddressEnv}`);
                return stateAddressEnv;
            }
            const stateKeypairPath = process.env.SVM_STATE_KEYPAIR_PATH || process.env.STATE_KEYPAIR_PATH;
            if (stateKeypairPath) {
                try {
                    const fs = require('fs');
                    const { Keypair } = require('@solana/web3.js');
                    const keypairData = JSON.parse(fs.readFileSync(stateKeypairPath, 'utf-8'));
                    const stateKeypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
                    const stateAddress = stateKeypair.publicKey.toString();
                    this.logger.log(`Using SVM state account from keypair: ${stateAddress}`);
                    return stateAddress;
                }
                catch (error) {
                    this.logger.warn(`Failed to load state keypair from ${stateKeypairPath}: ${error.message}`);
                }
            }
            const programId = (0, chain_constants_1.getContractAddressForChain)(chain, token);
            try {
                const [statePda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('state')], new web3_js_1.PublicKey(programId));
                this.logger.log(`Derived SVM state PDA from program ID: ${statePda.toString()}`);
                return statePda.toString();
            }
            catch (error) {
                this.logger.warn(`Failed to derive state PDA for ${chain}/${token}, using program ID: ${error.message}`);
                return programId;
            }
        }
        return (0, chain_constants_1.getContractAddressForChain)(chain, token);
    }
    getTreasuryAddress(chain) {
        const envKey = `${chain}_TREASURY_ADDRESS`;
        return process.env[envKey] || (chain === 'EVM' ? '0x0000000000000000000000000000000000000000' : '11111111111111111111111111111111');
    }
};
exports.ClaimService = ClaimService;
exports.ClaimService = ClaimService = ClaimService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        merkle_tree_service_1.MerkleTreeService,
        evm_blockchain_service_1.EvmBlockchainService,
        svm_blockchain_service_1.SvmBlockchainService])
], ClaimService);
//# sourceMappingURL=claim.service.js.map