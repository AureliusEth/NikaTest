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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var MerkleController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MerkleController = void 0;
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const merkle_tree_service_1 = require("../../infrastructure/services/merkle-tree.service");
const evm_blockchain_service_1 = require("../../infrastructure/services/evm-blockchain.service");
const svm_blockchain_service_1 = require("../../infrastructure/services/svm-blockchain.service");
const claim_service_1 = require("../../infrastructure/services/claim.service");
const prisma_service_1 = require("../../infrastructure/prisma/services/prisma.service");
const session_auth_guard_1 = require("../../common/guards/session-auth.guard");
const chain_constants_1 = require("../../common/chain-constants");
let MerkleController = MerkleController_1 = class MerkleController {
    merkleService;
    evmService;
    svmService;
    claimService;
    prisma;
    logger = new common_2.Logger(MerkleController_1.name);
    constructor(merkleService, evmService, svmService, claimService, prisma) {
        this.merkleService = merkleService;
        this.evmService = evmService;
        this.svmService = svmService;
        this.claimService = claimService;
        this.prisma = prisma;
    }
    async getRoot(chain, token) {
        const root = await this.merkleService.getLatestRoot(chain, token);
        if (!root) {
            return {
                chain,
                token,
                root: null,
                message: 'No merkle root generated yet. Call POST /api/merkle/generate to create one.',
            };
        }
        return root;
    }
    async getProof(chain, token, req) {
        const userId = req.user?.id;
        if (!userId) {
            return {
                error: 'User not authenticated',
            };
        }
        const rootData = await this.merkleService.getLatestRoot(chain, token);
        if (!rootData) {
            return {
                error: 'No merkle root found. Generate one first with POST /api/merkle/generate',
            };
        }
        const balances = await this.merkleService['getClaimableBalances'](chain, token);
        const proof = this.merkleService.generateProof(userId, balances);
        if (!proof) {
            return {
                beneficiaryId: userId,
                token,
                amount: 0,
                message: 'No claimable balance found for this user',
            };
        }
        const verified = this.merkleService.verifyProof(proof, rootData.root);
        return {
            ...proof,
            root: rootData.root,
            rootVersion: rootData.version,
            verified,
        };
    }
    async generateRoot(chain, token, skipUpdate) {
        const rootData = await this.merkleService.generateAndStoreRoot(chain, token);
        let txHash;
        let onChainUpdated = false;
        if (rootData.leafCount === 0) {
            this.logger.warn(`Skipping on-chain update for ${chain}/${token}: zero leafCount`);
            return {
                ...rootData,
                message: `Merkle root version ${rootData.version} generated. No on-chain update (zero leafCount). Contract address: ${this.getContractAddress(chain, token)}`,
                contractUpdateRequired: false,
                txHash: 'skipped:zero-leafcount',
            };
        }
        const shouldUpdate = skipUpdate !== 'false';
        if (shouldUpdate) {
            const contractAddress = this.getContractAddress(chain, token);
            if (contractAddress !== 'NOT_CONFIGURED') {
                try {
                    if (chain === 'EVM' && this.evmService.isInitialized()) {
                        txHash = await this.evmService.updateMerkleRoot(contractAddress, rootData.root);
                        onChainUpdated = true;
                    }
                    else if (chain === 'SVM' && this.svmService.isInitialized()) {
                        txHash = await this.svmService.updateMerkleRoot(contractAddress, rootData.root);
                        onChainUpdated = true;
                    }
                    else {
                        this.logger.warn(`${chain} blockchain service not initialized. Set ${chain}_RPC_URL and ${chain}_PRIVATE_KEY environment variables.`);
                    }
                }
                catch (error) {
                    this.logger.error(`Failed to update merkle root on-chain: ${error.message}`, error.stack);
                }
            }
        }
        return {
            ...rootData,
            message: onChainUpdated
                ? `Merkle root version ${rootData.version} generated and updated on-chain successfully.`
                : `Merkle root version ${rootData.version} generated successfully. ` +
                    (shouldUpdate
                        ? `On-chain update skipped or failed. Contract address: ${this.getContractAddress(chain, token)}`
                        : `On-chain update skipped. Contract address: ${this.getContractAddress(chain, token)}`),
            contractUpdateRequired: !onChainUpdated,
            txHash,
        };
    }
    getContractAddress(chain, token) {
        return (0, chain_constants_1.getContractAddressForChain)(chain, token);
    }
    async updateOnChain(chain, token) {
        const rootData = await this.merkleService.getLatestRoot(chain, token);
        if (!rootData) {
            return {
                error: 'No merkle root found. Generate one first with POST /api/merkle/generate',
            };
        }
        const contractAddress = this.getContractAddress(chain, token);
        if (contractAddress === 'NOT_CONFIGURED') {
            return {
                error: `Contract address not configured for ${chain}/${token}. Set ${chain}_${token}_CONTRACT_ADDRESS environment variable.`,
            };
        }
        try {
            let txHash;
            if (chain === 'EVM') {
                if (!this.evmService.isInitialized()) {
                    return {
                        error: 'EVM blockchain service not initialized. Set EVM_RPC_URL and EVM_PRIVATE_KEY environment variables.',
                    };
                }
                txHash = await this.evmService.updateMerkleRoot(contractAddress, rootData.root);
            }
            else {
                if (!this.svmService.isInitialized()) {
                    return {
                        error: 'SVM blockchain service not initialized. Set SVM_RPC_URL and SVM_PRIVATE_KEY environment variables.',
                    };
                }
                txHash = await this.svmService.updateMerkleRoot(contractAddress, rootData.root);
            }
            return {
                success: true,
                txHash,
                chain: rootData.chain,
                token: rootData.token,
                root: rootData.root,
                version: rootData.version,
                contractAddress,
            };
        }
        catch (error) {
            return {
                error: `Failed to update contract: ${error.message}`,
                chain: rootData.chain,
                token: rootData.token,
                root: rootData.root,
                version: rootData.version,
            };
        }
    }
    async getContractStatus(chain, token) {
        const contractAddress = this.getContractAddress(chain, token);
        if (contractAddress === 'NOT_CONFIGURED') {
            return {
                error: `Contract address not configured for ${chain}/${token}`,
            };
        }
        const databaseRoot = await this.merkleService.getLatestRoot(chain, token);
        try {
            let onChainRoot;
            let onChainVersion;
            if (chain === 'EVM') {
                if (!this.evmService.isInitialized()) {
                    return {
                        error: 'EVM blockchain service not initialized',
                        databaseRoot: databaseRoot || null,
                    };
                }
                onChainRoot = await this.evmService.getMerkleRoot(contractAddress);
                onChainVersion =
                    await this.evmService.getMerkleRootVersion(contractAddress);
            }
            else {
                if (!this.svmService.isInitialized()) {
                    return {
                        error: 'SVM blockchain service not initialized',
                        databaseRoot: databaseRoot || null,
                    };
                }
                onChainRoot = await this.svmService.getMerkleRoot(contractAddress);
                onChainVersion =
                    await this.svmService.getMerkleRootVersion(contractAddress);
            }
            return {
                chain,
                token,
                contractAddress,
                onChainRoot,
                onChainVersion,
                databaseRoot: databaseRoot?.root || null,
                databaseVersion: databaseRoot?.version || null,
                synced: databaseRoot?.root === onChainRoot &&
                    databaseRoot?.version === onChainVersion,
            };
        }
        catch (error) {
            return {
                error: `Failed to read contract status: ${error.message}`,
                chain,
                token,
                contractAddress,
                databaseRoot: databaseRoot || null,
            };
        }
    }
    async verifyOnChain(chain, token, body) {
        const contractAddress = this.getContractAddress(chain, token);
        if (contractAddress === 'NOT_CONFIGURED') {
            return {
                error: `Contract address not configured for ${chain}/${token}`,
            };
        }
        try {
            let isValid;
            const tokenParam = body.token || token;
            const amount_str = body.amount.toFixed(8);
            if (chain === 'EVM') {
                if (!this.evmService.isInitialized()) {
                    return {
                        error: 'EVM blockchain service not initialized',
                    };
                }
                isValid = await this.evmService.verifyProof(contractAddress, body.proof, body.user_id, tokenParam, amount_str);
            }
            else {
                if (!this.svmService.isInitialized()) {
                    return {
                        error: 'SVM blockchain service not initialized',
                    };
                }
                isValid = await this.svmService.verifyProof(contractAddress, body.proof, body.user_id, tokenParam, amount_str);
            }
            return {
                valid: isValid,
                chain,
                token: tokenParam,
                contractAddress,
                user_id: body.user_id,
                amount: body.amount,
                amount_str,
            };
        }
        catch (error) {
            return {
                error: `Failed to verify proof: ${error.message}`,
                chain,
                token,
            };
        }
    }
    async claimPreview(chain, token, req) {
        const userId = req.user?.id;
        if (!userId) {
            return { error: 'User not authenticated' };
        }
        const rootData = await this.merkleService.getLatestRoot(chain, token);
        if (!rootData) {
            return {
                claimableAmount: 0,
                userCashback: 0,
                treasuryAmount: 0,
                evmTreasuryTotal: 0,
                svmTreasuryTotal: 0,
                message: 'No merkle root available. Generate one first.',
            };
        }
        const balances = await this.merkleService['getClaimableBalances'](chain, token);
        const proof = this.merkleService.generateProof(userId, balances);
        const evmTreasuryBalance = await this.claimService.getTreasuryBalance('EVM', token);
        const svmTreasuryBalance = await this.claimService.getTreasuryBalance('SVM', token);
        const cashbackResult = await this.prisma.$queryRaw `
      SELECT COALESCE(SUM(l.amount), 0)::text as "totalCashback"
      FROM "CommissionLedgerEntry" l
      INNER JOIN "Trade" t ON l."sourceTradeId" = t.id
      WHERE l."beneficiaryId" = ${userId}
        AND l.level = 0
        AND l.token = ${token}
        AND l.destination = 'claimable'
        AND t.chain = ${chain}
    `;
        const userCashback = Number(cashbackResult[0]?.totalCashback || 0);
        const commissionResult = await this.prisma.$queryRaw `
      SELECT COALESCE(SUM(l.amount), 0)::text as "totalCommissions"
      FROM "CommissionLedgerEntry" l
      INNER JOIN "Trade" t ON l."sourceTradeId" = t.id
      WHERE l."beneficiaryId" = ${userId}
        AND l.level > 0
        AND l.token = ${token}
        AND l.destination = 'claimable'
        AND t.chain = ${chain}
    `;
        const userCommissions = Number(commissionResult[0]?.totalCommissions || 0);
        return {
            claimableAmount: proof?.amount || 0,
            userCashback,
            userCommissions,
            treasuryAmount: 0,
            evmTreasuryTotal: Number(evmTreasuryBalance),
            svmTreasuryTotal: Number(svmTreasuryBalance),
            chain,
            token,
            canClaim: (proof?.amount || 0) > 0,
            merkleVersion: rootData.version,
        };
    }
    async claim(chain, token, req) {
        const userId = req.user?.id;
        if (!userId) {
            return { error: 'User not authenticated' };
        }
        return await this.claimService.claim(userId, chain, token);
    }
    async getTreasuryBalance(chain, token) {
        const balance = await this.claimService.getTreasuryBalance(chain, token);
        return {
            chain,
            token,
            balance: Number(balance),
        };
    }
    async generateAll(skipUpdate) {
        const chains = ['EVM', 'SVM'];
        const tokens = ['XP', 'USDC'];
        const results = [];
        for (const chain of chains) {
            for (const token of tokens) {
                try {
                    const rootData = await this.generateRoot(chain, token, skipUpdate);
                    results.push({
                        chain,
                        token,
                        success: true,
                        root: rootData.root,
                        version: rootData.version,
                        leafCount: rootData.leafCount,
                        txHash: rootData.txHash,
                        onChainUpdated: !rootData.contractUpdateRequired,
                    });
                }
                catch (error) {
                    results.push({
                        chain,
                        token,
                        success: false,
                        error: error.message,
                    });
                }
            }
        }
        return {
            message: 'Generated all merkle roots',
            results,
            timestamp: new Date().toISOString(),
        };
    }
    async transferTreasury(chain, token) {
        return await this.claimService.transferTreasuryFunds(chain, token);
    }
};
exports.MerkleController = MerkleController;
__decorate([
    (0, common_1.Get)('root/:chain/:token'),
    __param(0, (0, common_1.Param)('chain')),
    __param(1, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MerkleController.prototype, "getRoot", null);
__decorate([
    (0, common_1.Get)('proof/:chain/:token'),
    (0, common_1.UseGuards)(session_auth_guard_1.SessionAuthGuard),
    __param(0, (0, common_1.Param)('chain')),
    __param(1, (0, common_1.Param)('token')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], MerkleController.prototype, "getProof", null);
__decorate([
    (0, common_1.Post)('generate/:chain/:token'),
    __param(0, (0, common_1.Param)('chain')),
    __param(1, (0, common_1.Param)('token')),
    __param(2, (0, common_1.Query)('updateOnChain')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], MerkleController.prototype, "generateRoot", null);
__decorate([
    (0, common_1.Post)('update-on-chain/:chain/:token'),
    __param(0, (0, common_1.Param)('chain')),
    __param(1, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MerkleController.prototype, "updateOnChain", null);
__decorate([
    (0, common_1.Get)('contract-status/:chain/:token'),
    __param(0, (0, common_1.Param)('chain')),
    __param(1, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MerkleController.prototype, "getContractStatus", null);
__decorate([
    (0, common_1.Post)('verify-on-chain/:chain/:token'),
    __param(0, (0, common_1.Param)('chain')),
    __param(1, (0, common_1.Param)('token')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], MerkleController.prototype, "verifyOnChain", null);
__decorate([
    (0, common_1.Get)('claim-preview/:chain/:token'),
    (0, common_1.UseGuards)(session_auth_guard_1.SessionAuthGuard),
    __param(0, (0, common_1.Param)('chain')),
    __param(1, (0, common_1.Param)('token')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], MerkleController.prototype, "claimPreview", null);
__decorate([
    (0, common_1.Post)('claim/:chain/:token'),
    (0, common_1.UseGuards)(session_auth_guard_1.SessionAuthGuard),
    __param(0, (0, common_1.Param)('chain')),
    __param(1, (0, common_1.Param)('token')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], MerkleController.prototype, "claim", null);
__decorate([
    (0, common_1.Get)('treasury-balance/:chain/:token'),
    __param(0, (0, common_1.Param)('chain')),
    __param(1, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MerkleController.prototype, "getTreasuryBalance", null);
__decorate([
    (0, common_1.Post)('generate-all'),
    __param(0, (0, common_1.Query)('updateOnChain')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MerkleController.prototype, "generateAll", null);
__decorate([
    (0, common_1.Post)('transfer-treasury/:chain/:token'),
    __param(0, (0, common_1.Param)('chain')),
    __param(1, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MerkleController.prototype, "transferTreasury", null);
exports.MerkleController = MerkleController = MerkleController_1 = __decorate([
    (0, common_1.Controller)('api/merkle'),
    __metadata("design:paramtypes", [merkle_tree_service_1.MerkleTreeService,
        evm_blockchain_service_1.EvmBlockchainService,
        svm_blockchain_service_1.SvmBlockchainService,
        claim_service_1.ClaimService,
        prisma_service_1.PrismaService])
], MerkleController);
//# sourceMappingURL=merkle.controller.js.map