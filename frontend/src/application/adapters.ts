import { api } from '@/lib/api';
import type { ReferralPort, TradesPort } from './ports';

export class HttpReferralAdapter implements ReferralPort {
	async createOrGetReferralCode(): Promise<{ code: string }> {
		return api('/api/referral/generate', { method: 'POST', body: '{}' });
	}
	async registerByCode(code: string): Promise<{ level: number }> {
		return api('/api/referral/register', { method: 'POST', body: JSON.stringify({ code }) });
	}
	async getNetwork(): Promise<{ level1: string[]; level2: string[]; level3: string[] }> {
		return api('/api/referral/network');
	}
	async getEarnings(): Promise<{ total: number; byLevel: Record<number, number> }> {
		return api('/api/referral/earnings');
	}
	async getDashboard(): Promise<{
		totalXP: number;
		referralsCount: number;
		referrals: Array<{
			refereeId: string;
			level: number;
			totalFeesEarned: number;
			totalXPGenerated: number;
			feePercentage: number;
			email?: string;
		}>;
	}> {
		return api('/api/referral/dashboard');
	}
	async getActivity(limit?: number): Promise<Array<{
		tradeId: string;
		feeAmount: number;
		createdAt: string;
	}>> {
		const url = limit ? `/api/referral/activity?limit=${limit}` : '/api/referral/activity';
		return api(url);
	}
}

export class HttpTradesAdapter implements TradesPort {
	async processMockTrade(input: { tradeId: string; userId: string; feeAmount: number; token?: string }): Promise<{ ok: true }> {
		return api('/api/trades/mock', { method: 'POST', body: JSON.stringify(input) });
	}
}


