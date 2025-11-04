import { MerkleTreeService } from '../../infrastructure/services/merkle-tree.service';
import { EvmBlockchainService } from '../../infrastructure/services/evm-blockchain.service';
import { SvmBlockchainService } from '../../infrastructure/services/svm-blockchain.service';
import { ClaimService } from '../../infrastructure/services/claim.service';
import { PrismaService } from '../../infrastructure/prisma/services/prisma.service';
export declare class MerkleController {
    private readonly merkleService;
    private readonly evmService;
    private readonly svmService;
    private readonly claimService;
    private readonly prisma;
    private readonly logger;
    constructor(merkleService: MerkleTreeService, evmService: EvmBlockchainService, svmService: SvmBlockchainService, claimService: ClaimService, prisma: PrismaService);
    getRoot(chain: 'EVM' | 'SVM', token: string): Promise<import("../../domain/services/merkle-tree.service").MerkleRootData | {
        chain: "EVM" | "SVM";
        token: string;
        root: null;
        message: string;
    }>;
    getProof(chain: 'EVM' | 'SVM', token: string, req: any): Promise<{
        error: string;
        beneficiaryId?: undefined;
        token?: undefined;
        amount?: undefined;
        message?: undefined;
    } | {
        beneficiaryId: any;
        token: string;
        amount: number;
        message: string;
        error?: undefined;
    } | {
        root: string;
        rootVersion: number;
        verified: boolean;
        beneficiaryId: string;
        token: string;
        amount: number;
        proof: string[];
        leaf: string;
        error?: undefined;
        message?: undefined;
    }>;
    generateRoot(chain: 'EVM' | 'SVM', token: string, skipUpdate?: string): Promise<{
        message: string;
        contractUpdateRequired: boolean;
        txHash: string | undefined;
        chain: "EVM" | "SVM";
        token: string;
        root: string;
        version: number;
        leafCount: number;
        createdAt: Date;
    }>;
    private getContractAddress;
    updateOnChain(chain: 'EVM' | 'SVM', token: string): Promise<{
        error: string;
        success?: undefined;
        txHash?: undefined;
        chain?: undefined;
        token?: undefined;
        root?: undefined;
        version?: undefined;
        contractAddress?: undefined;
    } | {
        success: boolean;
        txHash: string;
        chain: "EVM" | "SVM";
        token: string;
        root: string;
        version: number;
        contractAddress: string;
        error?: undefined;
    } | {
        error: string;
        chain: "EVM" | "SVM";
        token: string;
        root: string;
        version: number;
        success?: undefined;
        txHash?: undefined;
        contractAddress?: undefined;
    }>;
    getContractStatus(chain: 'EVM' | 'SVM', token: string): Promise<{
        error: string;
        databaseRoot?: undefined;
        chain?: undefined;
        token?: undefined;
        contractAddress?: undefined;
        onChainRoot?: undefined;
        onChainVersion?: undefined;
        databaseVersion?: undefined;
        synced?: undefined;
    } | {
        error: string;
        databaseRoot: import("../../domain/services/merkle-tree.service").MerkleRootData | null;
        chain?: undefined;
        token?: undefined;
        contractAddress?: undefined;
        onChainRoot?: undefined;
        onChainVersion?: undefined;
        databaseVersion?: undefined;
        synced?: undefined;
    } | {
        chain: "EVM" | "SVM";
        token: string;
        contractAddress: string;
        onChainRoot: string;
        onChainVersion: number;
        databaseRoot: string | null;
        databaseVersion: number | null;
        synced: boolean;
        error?: undefined;
    } | {
        error: string;
        chain: "EVM" | "SVM";
        token: string;
        contractAddress: string;
        databaseRoot: import("../../domain/services/merkle-tree.service").MerkleRootData | null;
        onChainRoot?: undefined;
        onChainVersion?: undefined;
        databaseVersion?: undefined;
        synced?: undefined;
    }>;
    verifyOnChain(chain: 'EVM' | 'SVM', token: string, body: {
        proof: string[];
        user_id: string;
        amount: number;
        token?: string;
    }): Promise<{
        error: string;
        valid?: undefined;
        chain?: undefined;
        token?: undefined;
        contractAddress?: undefined;
        user_id?: undefined;
        amount?: undefined;
        amount_str?: undefined;
    } | {
        valid: boolean;
        chain: "EVM" | "SVM";
        token: string;
        contractAddress: string;
        user_id: string;
        amount: number;
        amount_str: string;
        error?: undefined;
    } | {
        error: string;
        chain: "EVM" | "SVM";
        token: string;
        valid?: undefined;
        contractAddress?: undefined;
        user_id?: undefined;
        amount?: undefined;
        amount_str?: undefined;
    }>;
    claimPreview(chain: 'EVM' | 'SVM', token: string, req: any): Promise<{
        error: string;
        claimableAmount?: undefined;
        userCashback?: undefined;
        treasuryAmount?: undefined;
        evmTreasuryTotal?: undefined;
        svmTreasuryTotal?: undefined;
        message?: undefined;
        userCommissions?: undefined;
        chain?: undefined;
        token?: undefined;
        canClaim?: undefined;
        merkleVersion?: undefined;
    } | {
        claimableAmount: number;
        userCashback: number;
        treasuryAmount: number;
        evmTreasuryTotal: number;
        svmTreasuryTotal: number;
        message: string;
        error?: undefined;
        userCommissions?: undefined;
        chain?: undefined;
        token?: undefined;
        canClaim?: undefined;
        merkleVersion?: undefined;
    } | {
        claimableAmount: number;
        userCashback: number;
        userCommissions: number;
        treasuryAmount: number;
        evmTreasuryTotal: number;
        svmTreasuryTotal: number;
        chain: "EVM" | "SVM";
        token: string;
        canClaim: boolean;
        merkleVersion: number;
        error?: undefined;
        message?: undefined;
    }>;
    claim(chain: 'EVM' | 'SVM', token: string, req: any): Promise<{
        success: boolean;
        claimId?: string;
        amount?: number;
        error?: string;
        contractAddress?: string;
        onChainRoot?: string;
        databaseRoot?: string;
        details?: string;
    } | {
        error: string;
    }>;
    getTreasuryBalance(chain: 'EVM' | 'SVM', token: string): Promise<{
        chain: "EVM" | "SVM";
        token: string;
        balance: number;
    }>;
    generateAll(skipUpdate?: string): Promise<{
        message: string;
        results: {
            chain: string;
            token: string;
            success: boolean;
            root?: string;
            version?: number;
            leafCount?: number;
            txHash?: string;
            onChainUpdated?: boolean;
            error?: string;
        }[];
        timestamp: string;
    }>;
    transferTreasury(chain: 'EVM' | 'SVM', token: string): Promise<{
        success: boolean;
        txHash?: string;
        error?: string;
    }>;
}
