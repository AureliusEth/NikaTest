import { OnModuleInit } from '@nestjs/common';
import { EvmBlockchainService } from '../services/evm-blockchain.service';
import { SvmBlockchainService } from '../services/svm-blockchain.service';
export declare class BlockchainModule implements OnModuleInit {
    private readonly evmService;
    private readonly svmService;
    constructor(evmService: EvmBlockchainService, svmService: SvmBlockchainService);
    onModuleInit(): void;
}
