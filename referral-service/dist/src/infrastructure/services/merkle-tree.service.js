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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MerkleTreeService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const merkletreejs_1 = __importDefault(require("merkletreejs"));
const prisma_service_1 = require("../prisma/services/prisma.service");
let MerkleTreeService = class MerkleTreeService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    createLeaf(balance) {
        const data = `${balance.beneficiaryId}:${balance.token}:${balance.totalAmount.toFixed(8)}`;
        return Buffer.from((0, crypto_1.createHash)('sha256').update(data).digest('hex'), 'hex');
    }
    hashFn(data) {
        return Buffer.from((0, crypto_1.createHash)('sha256').update(data).digest('hex'), 'hex');
    }
    generateTree(balances, chain) {
        if (balances.length === 0) {
            return {
                root: '0x' + '0'.repeat(64),
                leaves: new Map(),
            };
        }
        const sortedBalances = [...balances].sort((a, b) => a.beneficiaryId.localeCompare(b.beneficiaryId));
        const leaves = sortedBalances.map(balance => this.createLeaf(balance));
        const tree = new merkletreejs_1.default(leaves, this.hashFn, { sortPairs: true });
        const root = tree.getRoot();
        const leafMap = new Map();
        sortedBalances.forEach((balance, index) => {
            leafMap.set(balance.beneficiaryId, '0x' + leaves[index].toString('hex'));
        });
        return {
            root: '0x' + root.toString('hex'),
            leaves: leafMap,
        };
    }
    generateProof(beneficiaryId, balances) {
        const userBalance = balances.find(b => b.beneficiaryId === beneficiaryId);
        if (!userBalance) {
            return null;
        }
        const sortedBalances = [...balances].sort((a, b) => a.beneficiaryId.localeCompare(b.beneficiaryId));
        const leaves = sortedBalances.map(balance => this.createLeaf(balance));
        const tree = new merkletreejs_1.default(leaves, this.hashFn, { sortPairs: true });
        const userIndex = sortedBalances.findIndex(b => b.beneficiaryId === beneficiaryId);
        if (userIndex === -1) {
            return null;
        }
        const userLeaf = leaves[userIndex];
        const proof = tree.getProof(userLeaf);
        return {
            beneficiaryId: userBalance.beneficiaryId,
            token: userBalance.token,
            amount: userBalance.totalAmount,
            proof: proof.map(p => '0x' + p.data.toString('hex')),
            leaf: '0x' + userLeaf.toString('hex'),
        };
    }
    verifyProof(proof, root) {
        const leaf = Buffer.from(proof.leaf.slice(2), 'hex');
        const proofBuffers = proof.proof.map(p => Buffer.from(p.slice(2), 'hex'));
        const rootBuffer = Buffer.from(root.slice(2), 'hex');
        return merkletreejs_1.default.verify(proofBuffers, leaf, rootBuffer, this.hashFn, { sortPairs: true });
    }
    async storeMerkleRoot(rootData) {
        await this.prisma.merkleRoot.create({
            data: {
                chain: rootData.chain,
                token: rootData.token,
                root: rootData.root,
                version: rootData.version,
                leafCount: rootData.leafCount,
                createdAt: rootData.createdAt,
            },
        });
    }
    async getLatestRoot(chain, token) {
        const root = await this.prisma.merkleRoot.findFirst({
            where: { chain, token },
            orderBy: { version: 'desc' },
        });
        if (!root) {
            return null;
        }
        return {
            chain: root.chain,
            token: root.token,
            root: root.root,
            version: root.version,
            leafCount: root.leafCount,
            createdAt: root.createdAt,
        };
    }
    async generateAndStoreRoot(chain, token) {
        const balances = await this.getClaimableBalances(chain, token);
        const { root } = this.generateTree(balances, chain);
        const latestRoot = await this.getLatestRoot(chain, token);
        const version = (latestRoot?.version ?? 0) + 1;
        const rootData = {
            chain,
            token,
            root,
            version,
            leafCount: balances.length,
            createdAt: new Date(),
        };
        await this.storeMerkleRoot(rootData);
        return rootData;
    }
    async getClaimableBalances(chain, token) {
        const results = await this.prisma.$queryRaw `
      SELECT 
        l."beneficiaryId",
        SUM(l.amount)::text as "totalAmount"
      FROM "CommissionLedgerEntry" l
      INNER JOIN "Trade" t ON l."sourceTradeId" = t.id
      WHERE l.destination = 'claimable'
        AND l.token = ${token}
        AND t.chain = ${chain}
      GROUP BY l."beneficiaryId"
      HAVING SUM(l.amount) > 0
    `;
        return results.map(r => ({
            beneficiaryId: r.beneficiaryId,
            token,
            totalAmount: parseFloat(r.totalAmount),
        }));
    }
};
exports.MerkleTreeService = MerkleTreeService;
exports.MerkleTreeService = MerkleTreeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MerkleTreeService);
//# sourceMappingURL=merkle-tree.service.js.map