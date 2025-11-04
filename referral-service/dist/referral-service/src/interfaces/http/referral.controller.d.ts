import { ReferralAppService } from '../../application/referral.app.service';
import { ReferralRegisterDto } from './dto/referral-register.dto';
export declare class ReferralController {
    private readonly app;
    constructor(app: ReferralAppService);
    generate(req: any): Promise<{
        code: string;
    }>;
    register(req: any, body: ReferralRegisterDto): Promise<{
        level: number;
    }>;
    network(req: any): Promise<{
        level1: string[];
        level2: string[];
        level3: string[];
    }>;
    earnings(req: any): Promise<{
        total: number;
        byLevel: Record<number, number>;
    }>;
    dashboard(req: any): Promise<{
        totalXP: number;
        totalEarned: number;
        totalClaimed: number;
        unclaimedXP: number;
        referrals: Array<{
            userId: string;
            level: number;
            totalEarned: number;
            tradeCount: number;
            percentage: number;
        }>;
    }>;
    activity(req: any): Promise<{
        tradeId: string;
        userId: string;
        feeAmount: number;
        earnedAmount: number;
        level: number;
        createdAt: Date;
    }[]>;
    hourlyEarnings(req: any): Promise<{
        hour: string;
        timestamp: number;
        earnings: number;
    }[]>;
}
