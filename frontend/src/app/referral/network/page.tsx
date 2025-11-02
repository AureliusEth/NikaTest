"use client";

import { useNetwork } from '@/application/providers';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function NetworkPage() {
	const { load } = useNetwork();
	const [data, setData] = useState<{ level1: string[]; level2: string[]; level3: string[] } | null>(null);
	const [err, setErr] = useState('');
	
	useEffect(() => {
		load().then(setData).catch(e=>setErr(e?.message || 'Failed'));
	}, [load]);
	
	return (
		<div className="min-h-screen" style={{ background: 'var(--background)' }}>
			<div className="max-w-4xl mx-auto px-4 py-12">
				{/* Back Button */}
				<Link href="/" className="inline-flex items-center mb-8 hover:no-underline" style={{ color: 'var(--muted)' }}>
					<svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
					</svg>
					Back to Dashboard
				</Link>

				{/* Header */}
				<div className="text-center mb-12">
					<h1 className="text-3xl font-bold mb-3" style={{ color: 'var(--foreground)' }}>
						Your Network
					</h1>
					<p style={{ color: 'var(--muted)' }}>
						View your 3-level referral tree
					</p>
				</div>

				{err && (
					<div className="p-4 rounded-lg mb-6" style={{ background: '#fef2f2', border: '1px solid #fca5a5' }}>
						<p className="text-center" style={{ color: '#dc2626' }}>{err}</p>
					</div>
				)}

				{data && (
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						<div className="card p-6">
							<h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--primary)' }}>
								Level 1 (30%)
							</h2>
							<div style={{ color: 'var(--foreground)' }}>
								{data.level1.length > 0 ? (
									<ul className="space-y-2">
										{data.level1.map(id => (
											<li key={id} className="text-sm py-2 px-3 rounded" style={{ background: 'var(--input-bg)' }}>
												{id}
											</li>
										))}
									</ul>
								) : (
									<p className="text-sm" style={{ color: 'var(--muted)' }}>No referrals yet</p>
								)}
							</div>
						</div>
						<div className="card p-6">
							<h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--primary)' }}>
								Level 2 (3%)
							</h2>
							<div style={{ color: 'var(--foreground)' }}>
								{data.level2.length > 0 ? (
									<ul className="space-y-2">
										{data.level2.map(id => (
											<li key={id} className="text-sm py-2 px-3 rounded" style={{ background: 'var(--input-bg)' }}>
												{id}
											</li>
										))}
									</ul>
								) : (
									<p className="text-sm" style={{ color: 'var(--muted)' }}>No referrals yet</p>
								)}
							</div>
						</div>
						<div className="card p-6">
							<h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--primary)' }}>
								Level 3 (2%)
							</h2>
							<div style={{ color: 'var(--foreground)' }}>
								{data.level3.length > 0 ? (
									<ul className="space-y-2">
										{data.level3.map(id => (
											<li key={id} className="text-sm py-2 px-3 rounded" style={{ background: 'var(--input-bg)' }}>
												{id}
											</li>
										))}
									</ul>
								) : (
									<p className="text-sm" style={{ color: 'var(--muted)' }}>No referrals yet</p>
								)}
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

