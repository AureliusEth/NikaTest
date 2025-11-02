export interface ReferralPort {
	createOrGetReferralCode(): Promise<{ code: string }>
	registerByCode(code: string): Promise<{ level: number }>
	getNetwork(): Promise<{ level1: string[]; level2: string[]; level3: string[] }>
	getEarnings(): Promise<{ total: number; byLevel: Record<number, number> }>
}

export interface TradesPort {
	processMockTrade(input: { tradeId: string; userId: string; feeAmount: number; token?: string }): Promise<{ ok: true }>
}


