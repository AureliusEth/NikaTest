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
var ScheduledTasksService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduledTasksService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const merkle_tree_service_1 = require("../services/merkle-tree.service");
const evm_blockchain_service_1 = require("../services/evm-blockchain.service");
const svm_blockchain_service_1 = require("../services/svm-blockchain.service");
const chain_constants_1 = require("../../common/chain-constants");
let ScheduledTasksService = ScheduledTasksService_1 = class ScheduledTasksService {
    merkleService;
    evmService;
    svmService;
    logger = new common_1.Logger(ScheduledTasksService_1.name);
    constructor(merkleService, evmService, svmService) {
        this.merkleService = merkleService;
        this.evmService = evmService;
        this.svmService = svmService;
    }
    async handleMerkleRootUpdates() {
        this.logger.log('Starting scheduled merkle root updates...');
        const chains = ['EVM', 'SVM'];
        const tokens = ['XP', 'USDC'];
        for (const chain of chains) {
            for (const token of tokens) {
                try {
                    this.logger.log(`Generating merkle root for ${chain}/${token}...`);
                    const rootData = await this.merkleService.generateAndStoreRoot(chain, token);
                    this.logger.log(`Generated merkle root v${rootData.version} for ${chain}/${token}: ${rootData.root}`);
                    const autoUpdate = process.env.AUTO_UPDATE_MERKLE_ROOTS === 'true';
                    if (autoUpdate) {
                        await this.updateMerkleRootOnChain(chain, token, rootData.root);
                    }
                    else {
                        this.logger.log(`Skipping on-chain update (set AUTO_UPDATE_MERKLE_ROOTS=true to enable). ` +
                            `Manual update required at: ${(0, chain_constants_1.getContractAddressForChain)(chain, token)}`);
                    }
                }
                catch (error) {
                    this.logger.error(`Failed to update merkle root for ${chain}/${token}: ${error.message}`, error.stack);
                }
            }
        }
        this.logger.log('Completed scheduled merkle root updates');
    }
    async updateMerkleRootOnChain(chain, token, root) {
        const contractAddress = (0, chain_constants_1.getContractAddressForChain)(chain, token);
        if (contractAddress === 'NOT_CONFIGURED') {
            this.logger.warn(`Contract address not configured for ${chain}/${token}`);
            return;
        }
        try {
            let txHash;
            if (chain === 'EVM') {
                if (!this.evmService.isInitialized()) {
                    this.logger.warn('EVM service not initialized, skipping update');
                    return;
                }
                txHash = await this.evmService.updateMerkleRoot(contractAddress, root);
            }
            else {
                if (!this.svmService.isInitialized()) {
                    this.logger.warn('SVM service not initialized, skipping update');
                    return;
                }
                txHash = await this.svmService.updateMerkleRoot(contractAddress, root);
            }
            this.logger.log(`Successfully updated merkle root on-chain for ${chain}/${token}: ${txHash}`);
        }
        catch (error) {
            this.logger.error(`Failed to update merkle root on-chain for ${chain}/${token}: ${error.message}`, error.stack);
        }
    }
};
exports.ScheduledTasksService = ScheduledTasksService;
__decorate([
    (0, schedule_1.Cron)(process.env.MERKLE_UPDATE_INTERVAL_CRON || schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ScheduledTasksService.prototype, "handleMerkleRootUpdates", null);
exports.ScheduledTasksService = ScheduledTasksService = ScheduledTasksService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [merkle_tree_service_1.MerkleTreeService,
        evm_blockchain_service_1.EvmBlockchainService,
        svm_blockchain_service_1.SvmBlockchainService])
], ScheduledTasksService);
//# sourceMappingURL=scheduled-tasks.service.js.map