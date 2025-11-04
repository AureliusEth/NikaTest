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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockchainModule = void 0;
const common_1 = require("@nestjs/common");
const evm_blockchain_service_1 = require("../services/evm-blockchain.service");
const svm_blockchain_service_1 = require("../services/svm-blockchain.service");
let BlockchainModule = class BlockchainModule {
    evmService;
    svmService;
    constructor(evmService, svmService) {
        this.evmService = evmService;
        this.svmService = svmService;
    }
    onModuleInit() {
        const evmRpcUrl = process.env.EVM_RPC_URL;
        const evmPrivateKey = process.env.EVM_PRIVATE_KEY;
        if (evmRpcUrl) {
            this.evmService.initialize(evmRpcUrl, evmPrivateKey);
        }
        const svmRpcUrl = process.env.SVM_RPC_URL;
        const svmPrivateKey = process.env.SVM_PRIVATE_KEY;
        if (svmRpcUrl) {
            try {
                this.svmService.initialize(svmRpcUrl, svmPrivateKey);
            }
            catch (error) {
                console.error('Failed to initialize SVM service:', error);
            }
        }
    }
};
exports.BlockchainModule = BlockchainModule;
exports.BlockchainModule = BlockchainModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [evm_blockchain_service_1.EvmBlockchainService, svm_blockchain_service_1.SvmBlockchainService],
        exports: [evm_blockchain_service_1.EvmBlockchainService, svm_blockchain_service_1.SvmBlockchainService],
    }),
    __metadata("design:paramtypes", [evm_blockchain_service_1.EvmBlockchainService,
        svm_blockchain_service_1.SvmBlockchainService])
], BlockchainModule);
//# sourceMappingURL=blockchain.module.js.map