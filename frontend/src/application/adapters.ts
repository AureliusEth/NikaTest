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
		referrals: Array<{
			userId: string;
			level: number;
			totalEarned: number;
			tradeCount: number;
			percentage: number;
		}>;
	}> {
		return api('/api/referral/dashboard');
	}
	async getActivity(): Promise<Array<{
		tradeId: string;
		userId: string;
		feeAmount: number;
		earnedAmount: number;
		level: number;
		createdAt: string;
	}>> {
		return api('/api/referral/activity');
	}
}

export class HttpTradesAdapter implements TradesPort {
	async processMockTrade(input: { tradeId: string; userId: string; feeAmount: number; token?: string }): Promise<{ ok: true }> {
		return api('/api/trades/mock', { method: 'POST', body: JSON.stringify(input) });
	}
}


