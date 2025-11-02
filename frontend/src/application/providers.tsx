"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReferralPort, TradesPort } from './ports';
import { HttpReferralAdapter, HttpTradesAdapter } from './adapters';

const ReferralCtx = createContext<ReferralPort | null>(null);
const TradesCtx = createContext<TradesPort | null>(null);

export function ApplicationProvider({ children }: { children: React.ReactNode }) {
	const referral = useMemo(() => new HttpReferralAdapter(), []);
	const trades = useMemo(() => new HttpTradesAdapter(), []);
	return (
		<ReferralCtx.Provider value={referral}>
			<TradesCtx.Provider value={trades}>{children}</TradesCtx.Provider>
		</ReferralCtx.Provider>
	);
}

export function useReferralPort() {
	const ctx = useContext(ReferralCtx);
	if (!ctx) throw new Error('ReferralPort not available. Wrap with ApplicationProvider.');
	return ctx;
}

export function useTradesPort() {
	const ctx = useContext(TradesCtx);
	if (!ctx) throw new Error('TradesPort not available. Wrap with ApplicationProvider.');
	return ctx;
}

// Higher-level hooks aggregating UI state
export function useReferral() {
	const port = useReferralPort();
	const [code, setCode] = useState<string>('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const generate = useCallback(async () => {
		setLoading(true); setError(null);
		try {
			const res = await port.createOrGetReferralCode();
			setCode(res.code);
			return res.code;
		} catch (e: any) {
			setError(e?.message || 'Failed');
			throw e;
		} finally { setLoading(false); }
	}, [port]);

	const register = useCallback(async (invite: string) => {
		setLoading(true); setError(null);
		try {
			return await port.registerByCode(invite);
		} catch (e: any) { setError(e?.message || 'Failed'); throw e; } finally { setLoading(false); }
	}, [port]);

	return { code, loading, error, generate, register };
}

export function useNetwork() {
	const port = useReferralPort();
	return {
		load: () => port.getNetwork(),
	};
}

export function useEarnings() {
	const port = useReferralPort();
	return {
		load: () => port.getEarnings(),
	};
}

export function useDashboard() {
	const port = useReferralPort();
	return {
		load: () => port.getDashboard(),
	};
}

export function useActivity() {
	const port = useReferralPort();
	return {
		load: (limit?: number) => port.getActivity(limit),
	};
}


