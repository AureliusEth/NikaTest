import { PrismaService } from '../prisma/services/prisma.service';
import { MerkleTreeService } from './merkle-tree.service';
import { EvmBlockchainService } from './evm-blockchain.service';
import { SvmBlockchainService } from './svm-blockchain.service';
export declare class ClaimService {
    private readonly prisma;
    private readonly merkleService;
    private readonly evmService;
    private readonly svmService;
    private readonly logger;
    constructor(prisma: PrismaService, merkleService: MerkleTreeService, evmService: EvmBlockchainService, svmService: SvmBlockchainService);
    claim(userId: string, chain: 'EVM' | 'SVM', token: string): Promise<{
        success: boolean;
        claimId?: string;
        amount?: number;
        error?: string;
        contractAddress?: string;
        onChainRoot?: string;
        databaseRoot?: string;
        details?: string;
    }>;
    private transferXP;
    updateTreasuryBalance(chain: 'EVM' | 'SVM', token: string, amount: number): Promise<void>;
    getTreasuryBalance(chain: 'EVM' | 'SVM', token: string): Promise<number>;
    transferTreasuryFunds(chain: 'EVM' | 'SVM', token: string): Promise<{
        success: boolean;
        txHash?: string;
        error?: string;
    }>;
    private transferToTreasury;
    private getContractAddress;
    private getTreasuryAddress;
}
