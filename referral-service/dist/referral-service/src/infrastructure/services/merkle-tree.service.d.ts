import { MerkleTreeService as IMerkleTreeService, ClaimableBalance, MerkleProof, MerkleRootData } from '../../domain/services/merkle-tree.service';
import { PrismaService } from '../prisma/services/prisma.service';
export declare class MerkleTreeService implements IMerkleTreeService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private createLeaf;
    private hashFn;
    generateTree(balances: ClaimableBalance[], chain: 'EVM' | 'SVM'): {
        root: string;
        leaves: Map<string, string>;
    };
    generateProof(beneficiaryId: string, balances: ClaimableBalance[]): MerkleProof | null;
    verifyProof(proof: MerkleProof, root: string): boolean;
    storeMerkleRoot(rootData: MerkleRootData): Promise<void>;
    getLatestRoot(chain: 'EVM' | 'SVM', token: string): Promise<MerkleRootData | null>;
    generateAndStoreRoot(chain: 'EVM' | 'SVM', token: string): Promise<MerkleRootData>;
    private getClaimableBalances;
}
