import 'dotenv/config';
export interface ApiResponse {
    ok?: boolean;
    error?: string;
    [key: string]: any;
}
export interface UserCookie {
    userId: string;
    cookie: string;
    email: string;
}
export declare function extractCookie(setCookieHeader: string | null): string;
export declare function apiCall(method: string, path: string, userId?: string, body?: any, extraHeaders?: Record<string, string>): Promise<ApiResponse>;
export declare function authenticateUser(userId: string): Promise<UserCookie>;
export declare function createUserChain(userIds: string[]): Promise<Map<string, UserCookie>>;
export declare function makeTrade(userId: string, feeAmount: number, chain?: 'EVM' | 'SVM', token?: string, userCookie?: UserCookie): Promise<string>;
export declare function getEarnings(userCookie: UserCookie): Promise<{
    total: number;
    byLevel: Record<number, number>;
}>;
export declare function getNetwork(userCookie: UserCookie): Promise<{
    level1: string[];
    level2: string[];
    level3: string[];
}>;
export declare function assertEarnings(actual: number, expected: number, tolerance?: number, context?: string): void;
export declare function generateAndUpdateRoot(chain: 'EVM' | 'SVM', token?: string): Promise<{
    root: string;
    version: number;
    txHash?: string;
}>;
export declare function getMerkleProof(userId: string, chain: 'EVM' | 'SVM', token?: string, userCookie?: UserCookie): Promise<{
    amount: number;
    proof: string[];
    root: string;
}>;
export declare function claimAndVerify(userId: string, chain: 'EVM' | 'SVM', expectedAmount: number, userCookie: UserCookie, token?: string): Promise<{
    claimed: boolean;
    amount: number;
    txHash?: string;
}>;
export declare function sleep(ms: number): Promise<void>;
export declare function step(name: string, fn: () => Promise<void>): Promise<void>;
export declare function getTreasuryBalance(chain: 'EVM' | 'SVM', token?: string): Promise<number>;
export declare function getContractStatus(chain: 'EVM' | 'SVM', token?: string): Promise<{
    onChainRoot: string;
    onChainVersion: number;
    isSynced: boolean;
}>;
export declare function expectError(fn: () => Promise<any>, expectedMessageFragment: string): Promise<void>;
export declare function cleanupTestUsers(userIdPattern: string): Promise<void>;
export declare function disconnectDatabase(): Promise<void>;
