import { Response, Request } from 'express';
import { AuthService } from '../../common/auth/auth.service';
import { ReferralAppService } from '../../application/referral.app.service';
declare class LoginDto {
    email: string;
    inviteCode?: string;
}
export declare class AuthController {
    private readonly authService;
    private readonly referralApp;
    constructor(authService: AuthService, referralApp: ReferralAppService);
    login(body: LoginDto, res: Response): Promise<{
        userId: string;
        level: number | undefined;
        message: string;
    }>;
    logout(res: Response): Promise<{
        message: string;
    }>;
    getSession(req: Request): Promise<{
        userId: string | null;
    }>;
}
export {};
