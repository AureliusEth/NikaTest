"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var EvmBlockchainService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvmBlockchainService = void 0;
const common_1 = require("@nestjs/common");
const ethers_1 = require("ethers");
let EvmBlockchainService = EvmBlockchainService_1 = class EvmBlockchainService {
    logger = new common_1.Logger(EvmBlockchainService_1.name);
    provider = null;
    signer = null;
    initialize(rpcUrl, privateKey) {
        this.provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl);
        if (privateKey) {
            this.signer = new ethers_1.ethers.Wallet(privateKey, this.provider);
            this.logger.log(`EVM service initialized with signer: ${this.signer.address}`);
        }
        else {
            this.logger.warn('EVM service initialized without signer (read-only mode)');
        }
    }
    getContract(address) {
        if (!this.provider) {
            throw new Error('EVM provider not initialized. Call initialize() first.');
        }
        const abi = [
            'function updateMerkleRoot(bytes32 newRoot) external',
            'function merkleRoot() public view returns (bytes32)',
            'function merkleRootVersion() public view returns (uint256)',
            'function verifyProof(bytes32[] memory proof, string memory user_id, string memory token, string memory amount_str) public view returns (bool)',
            'event MerkleRootUpdated(bytes32 newRoot)',
        ];
        if (this.signer) {
            return new ethers_1.ethers.Contract(address, abi, this.signer);
        }
        return new ethers_1.ethers.Contract(address, abi, this.provider);
    }
    async updateMerkleRoot(contractAddress, root) {
        if (!this.signer) {
            throw new Error('No signer configured. Cannot update merkle root.');
        }
        const contract = this.getContract(contractAddress);
        this.logger.log(`Updating merkle root on contract ${contractAddress} to ${root}`);
        try {
            const tx = await contract.updateMerkleRoot(root);
            this.logger.log(`Transaction sent: ${tx.hash}`);
            const receipt = await tx.wait();
            this.logger.log(`Transaction confirmed in block ${receipt.blockNumber}`);
            return receipt.hash;
        }
        catch (error) {
            this.logger.error(`Failed to update merkle root: ${error.message}`, error.stack);
            throw error;
        }
    }
    async getMerkleRoot(contractAddress) {
        const contract = this.getContract(contractAddress);
        try {
            const root = await contract.merkleRoot();
            return root;
        }
        catch (error) {
            this.logger.error(`Failed to get merkle root: ${error.message}`, error.stack);
            throw error;
        }
    }
    async getMerkleRootVersion(contractAddress) {
        const contract = this.getContract(contractAddress);
        try {
            const version = await contract.merkleRootVersion();
            return Number(version);
        }
        catch (error) {
            this.logger.error(`Failed to get merkle root version: ${error.message}`, error.stack);
            throw error;
        }
    }
    async verifyProof(contractAddress, proof, user_id, token, amount_str) {
        const contract = this.getContract(contractAddress);
        try {
            const isValid = await contract.verifyProof(proof, user_id, token, amount_str);
            if (!isValid) {
                this.logger.warn(`EVM proof invalid. user_id=${user_id}, token=${token}, amount_str=${amount_str}, ` +
                    `proofLen=${proof?.length || 0}, contract=${contractAddress}`);
            }
            return isValid;
        }
        catch (error) {
            this.logger.error(`Failed to verify proof: ${error.message}`, error.stack);
            throw error;
        }
    }
    isInitialized() {
        return this.provider !== null;
    }
    getSignerAddress() {
        return this.signer?.address || null;
    }
};
exports.EvmBlockchainService = EvmBlockchainService;
exports.EvmBlockchainService = EvmBlockchainService = EvmBlockchainService_1 = __decorate([
    (0, common_1.Injectable)()
], EvmBlockchainService);
//# sourceMappingURL=evm-blockchain.service.js.map