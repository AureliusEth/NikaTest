export declare class EvmBlockchainService {
    private readonly logger;
    private provider;
    private signer;
    initialize(rpcUrl: string, privateKey?: string): void;
    private getContract;
    updateMerkleRoot(contractAddress: string, root: string): Promise<string>;
    getMerkleRoot(contractAddress: string): Promise<string>;
    getMerkleRootVersion(contractAddress: string): Promise<number>;
    verifyProof(contractAddress: string, proof: string[], user_id: string, token: string, amount_str: string): Promise<boolean>;
    isInitialized(): boolean;
    getSignerAddress(): string | null;
}
