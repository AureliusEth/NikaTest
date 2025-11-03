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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MerkleController = void 0;
const common_1 = require("@nestjs/common");
const merkle_tree_service_1 = require("../../infrastructure/services/merkle-tree.service");
const session_auth_guard_1 = require("../../common/guards/session-auth.guard");
let MerkleController = class MerkleController {
    merkleService;
    constructor(merkleService) {
        this.merkleService = merkleService;
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
    async getProof(chain, token, userId) {
        const rootData = await this.merkleService.getLatestRoot(chain, token);
        if (!rootData) {
            return {
                error: 'No merkle root found. Generate one first with POST /api/merkle/generate',
            };
        }
        const balances = await this.merkleService['getClaimableBalances'](chain, token);
        const proof = this.merkleService.generateProof(userId || '', balances);
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
    async generateRoot(chain, token) {
        const rootData = await this.merkleService.generateAndStoreRoot(chain, token);
        return {
            ...rootData,
            message: `Merkle root version ${rootData.version} generated successfully. ` +
                `This root should be submitted to the smart contract at: ${this.getContractAddress(chain, token)}`,
            contractUpdateRequired: true,
        };
    }
    getContractAddress(chain, token) {
        const addresses = {
            EVM: {
                XP: '0x0000000000000000000000000000000000000000',
                USDC: '0x0000000000000000000000000000000000000000',
            },
            SVM: {
                XP: '11111111111111111111111111111111',
                USDC: '11111111111111111111111111111111',
            },
        };
        return addresses[chain]?.[token] || 'NOT_CONFIGURED';
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
    __param(2, (0, common_1.Query)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], MerkleController.prototype, "getProof", null);
__decorate([
    (0, common_1.Post)('generate/:chain/:token'),
    __param(0, (0, common_1.Param)('chain')),
    __param(1, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MerkleController.prototype, "generateRoot", null);
exports.MerkleController = MerkleController = __decorate([
    (0, common_1.Controller)('api/merkle'),
    __metadata("design:paramtypes", [merkle_tree_service_1.MerkleTreeService])
], MerkleController);
//# sourceMappingURL=merkle.controller.js.map