export declare class AuthService {
    private readonly secret;
    createSession(userId: string): Promise<string>;
    verifySession(token: string): Promise<{
        userId: string;
    } | null>;
}
