import { Module, Global, OnModuleInit } from '@nestjs/common';
import { EvmBlockchainService } from '../services/evm-blockchain.service';
import { SvmBlockchainService } from '../services/svm-blockchain.service';

/**
 * Blockchain Module
 *
 * Manages blockchain connections and contract interactions for both EVM and SVM chains.
 * Initializes services on module startup based on environment configuration.
 */
@Global()
@Module({
  providers: [EvmBlockchainService, SvmBlockchainService],
  exports: [EvmBlockchainService, SvmBlockchainService],
})
export class BlockchainModule implements OnModuleInit {
  constructor(
    private readonly evmService: EvmBlockchainService,
    private readonly svmService: SvmBlockchainService,
  ) {}

  onModuleInit() {
    // Initialize EVM service
    const evmRpcUrl = process.env.EVM_RPC_URL;
    const evmPrivateKey = process.env.EVM_PRIVATE_KEY;

    if (evmRpcUrl) {
      this.evmService.initialize(evmRpcUrl, evmPrivateKey);
    }

    // Initialize SVM service
    const svmRpcUrl = process.env.SVM_RPC_URL;
    const svmPrivateKey = process.env.SVM_PRIVATE_KEY;

    if (svmRpcUrl) {
      try {
        this.svmService.initialize(svmRpcUrl, svmPrivateKey);
      } catch (error) {
        console.error('Failed to initialize SVM service:', error);
        // Continue without SVM - backend can still function for EVM-only operations
      }
    }
  }
}
