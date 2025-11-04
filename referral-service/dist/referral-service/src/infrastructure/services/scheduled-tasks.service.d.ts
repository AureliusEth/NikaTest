import { MerkleTreeService } from '../services/merkle-tree.service';
import { EvmBlockchainService } from '../services/evm-blockchain.service';
import { SvmBlockchainService } from '../services/svm-blockchain.service';
export declare class ScheduledTasksService {
    private readonly merkleService;
    private readonly evmService;
    private readonly svmService;
    private readonly logger;
    constructor(merkleService: MerkleTreeService, evmService: EvmBlockchainService, svmService: SvmBlockchainService);
    handleMerkleRootUpdates(): Promise<void>;
    private updateMerkleRootOnChain;
}
