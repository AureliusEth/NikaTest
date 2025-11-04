export declare class SvmBlockchainService {
    private readonly logger;
    private connection;
    private wallet;
    private provider;
    private program;
    initialize(rpcUrl: string, privateKeyOrPath?: string): void;
    private initializeProgram;
    private hexToUint8Array;
    private parseHexProofArray;
    private ensureStateInitialized;
    private getStateAddress;
    updateMerkleRoot(stateAddress: string, root: string): Promise<string>;
    getMerkleRoot(stateAddress: string): Promise<string>;
    getMerkleRootVersion(stateAddress: string): Promise<number>;
    verifyProof(stateAddress: string, proof: string[], user_id: string, token: string, amount_str: string): Promise<boolean>;
    isInitialized(): boolean;
    getWalletAddress(): string | null;
}
