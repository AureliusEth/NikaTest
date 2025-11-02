import { ReferralAppService } from '../../application/referral.app.service';
declare class SetEmailDto {
    email: string;
}
export declare class UserController {
    private readonly app;
    constructor(app: ReferralAppService);
    setEmail(req: any, body: SetEmailDto): Promise<{
        ok: boolean;
    }>;
}
export {};
