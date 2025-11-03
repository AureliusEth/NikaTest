export interface ClaimableBalance {
    beneficiaryId: string;
    token: string;
    totalAmount: number;
}
export interface MerkleProof {
    beneficiaryId: string;
    token: string;
    amount: number;
    proof: string[];
    leaf: string;
}
export interface MerkleRootData {
    chain: 'EVM' | 'SVM';
    token: string;
    root: string;
    version: number;
    leafCount: number;
    createdAt: Date;
}
export interface MerkleTreeService {
    generateTree(balances: ClaimableBalance[], chain: 'EVM' | 'SVM'): {
        root: string;
        leaves: Map<string, string>;
    };
    generateProof(beneficiaryId: string, balances: ClaimableBalance[]): MerkleProof | null;
    verifyProof(proof: MerkleProof, root: string): boolean;
    storeMerkleRoot(rootData: MerkleRootData): Promise<void>;
    getLatestRoot(chain: 'EVM' | 'SVM', token: string): Promise<MerkleRootData | null>;
}
