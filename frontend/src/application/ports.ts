export interface ReferralPort {
	createOrGetReferralCode(): Promise<{ code: string }>
	registerByCode(code: string): Promise<{ level: number }>
	getNetwork(): Promise<{ level1: string[]; level2: string[]; level3: string[] }>
	getEarnings(): Promise<{ total: number; byLevel: Record<number, number> }>
	getDashboard(): Promise<{
		totalXP: number;
		referrals: Array<{
			userId: string;
			level: number;
			totalEarned: number;
			tradeCount: number;
			percentage: number;
		}>;
	}>
	getActivity(): Promise<Array<{
		tradeId: string;
		userId: string;
		feeAmount: number;
		earnedAmount: number;
		level: number;
		createdAt: string;
	}>>
}

export interface TradesPort {
	processMockTrade(input: { tradeId: string; userId: string; feeAmount: number; token?: string }): Promise<{ ok: true }>
}


