import { MerkleTreeService } from '../../infrastructure/services/merkle-tree.service';
export declare class MerkleController {
    private readonly merkleService;
    constructor(merkleService: MerkleTreeService);
    getRoot(chain: 'EVM' | 'SVM', token: string): Promise<import("../../domain/services/merkle-tree.service").MerkleRootData | {
        chain: "EVM" | "SVM";
        token: string;
        root: null;
        message: string;
    }>;
    getProof(chain: 'EVM' | 'SVM', token: string, userId?: string): Promise<{
        error: string;
        beneficiaryId?: undefined;
        token?: undefined;
        amount?: undefined;
        message?: undefined;
    } | {
        beneficiaryId: string | undefined;
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
    generateRoot(chain: 'EVM' | 'SVM', token: string): Promise<{
        message: string;
        contractUpdateRequired: boolean;
        chain: "EVM" | "SVM";
        token: string;
        root: string;
        version: number;
        leafCount: number;
        createdAt: Date;
    }>;
    private getContractAddress;
}
