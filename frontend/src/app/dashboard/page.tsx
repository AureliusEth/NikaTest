"use client";

import { useDashboard, useActivity } from '@/application/providers';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
	const { load: loadDashboard } = useDashboard();
	const { load: loadActivity } = useActivity();
	const [dashboardData, setDashboardData] = useState<{
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
	} | null>(null);
	const [activityData, setActivityData] = useState<Array<{
		tradeId: string;
		feeAmount: number;
		createdAt: string;
	}> | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string>('');

	useEffect(() => {
		const fetchData = async () => {
			try {
				setLoading(true);
				setError('');
				const [dashboard, activity] = await Promise.all([
					loadDashboard(),
					loadActivity(50),
				]);
				setDashboardData(dashboard);
				setActivityData(activity);
			} catch (e: any) {
				setError(e?.message || 'Failed to load dashboard');
			} finally {
				setLoading(false);
			}
		};
		fetchData();
	}, [loadDashboard, loadActivity]);

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	};

	const formatNumber = (num: number) => {
		return new Intl.NumberFormat('en-US', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(num);
	};

	return (
		<div className="min-h-screen" style={{ background: 'var(--background)' }}>
			<div className="max-w-7xl mx-auto px-4 py-12">
				{/* Back Button */}
				<Link href="/" className="inline-flex items-center mb-8 hover:no-underline" style={{ color: 'var(--muted)' }}>
					<svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
					</svg>
					Back to Home
				</Link>

				{/* Header */}
				<div className="text-center mb-12">
					<h1 className="text-4xl font-bold mb-3" style={{ color: 'var(--foreground)' }}>
						Dashboard
					</h1>
					<p style={{ color: 'var(--muted)' }}>
						Track your XP, referrals, and trading activity
					</p>
				</div>

				{error && (
					<div className="p-4 rounded-lg mb-6" style={{ background: '#fef2f2', border: '1px solid #fca5a5' }}>
						<p className="text-center" style={{ color: '#dc2626' }}>{error}</p>
					</div>
				)}

				{loading ? (
					<div className="text-center py-12">
						<p style={{ color: 'var(--muted)' }}>Loading...</p>
					</div>
				) : dashboardData && (
					<>
						{/* XP Display Card */}
						<div className="card mb-8" style={{ padding: '32px' }}>
							<div className="text-center">
								<div className="text-sm mb-2" style={{ color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
									Total XP
								</div>
								<div className="text-5xl font-bold mb-2" style={{ color: 'var(--primary)' }}>
									{formatNumber(dashboardData.totalXP)}
								</div>
								<div className="text-sm" style={{ color: 'var(--muted)' }}>
									{dashboardData.referralsCount} {dashboardData.referralsCount === 1 ? 'referral' : 'referrals'}
								</div>
							</div>
						</div>

						{/* Referrals Table */}
						<div className="card mb-8" style={{ overflow: 'hidden' }}>
							<div style={{ padding: '24px', borderBottom: '1px solid var(--border)' }}>
								<h2 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>
									Referrals
								</h2>
								<p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
									Earnings breakdown by referral
								</p>
							</div>
							
							{dashboardData.referrals.length === 0 ? (
								<div className="p-8 text-center" style={{ color: 'var(--muted)' }}>
									No referrals yet. Start inviting users to earn XP!
								</div>
							) : (
								<div style={{ overflowX: 'auto' }}>
									<table style={{ width: '100%', borderCollapse: 'collapse' }}>
										<thead>
											<tr style={{ background: 'var(--background)', borderBottom: '1px solid var(--border)' }}>
												<th style={{ padding: '16px', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>
													User
												</th>
												<th style={{ padding: '16px', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>
													Level
												</th>
												<th style={{ padding: '16px', textAlign: 'right', fontSize: '0.875rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>
													Total Fees
												</th>
												<th style={{ padding: '16px', textAlign: 'right', fontSize: '0.875rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>
													Fee %
												</th>
												<th style={{ padding: '16px', textAlign: 'right', fontSize: '0.875rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>
													XP Generated
												</th>
											</tr>
										</thead>
										<tbody>
											{dashboardData.referrals.map((ref, idx) => (
												<tr 
													key={ref.refereeId}
													style={{ 
														borderBottom: idx < dashboardData.referrals.length - 1 ? '1px solid var(--border)' : 'none',
														transition: 'background 0.15s ease',
													}}
													className="hover:bg-gray-50"
												>
													<td style={{ padding: '16px' }}>
														<div>
															<div className="font-medium" style={{ color: 'var(--foreground)' }}>
																{ref.email || ref.refereeId}
															</div>
															{ref.email && (
																<div className="text-sm" style={{ color: 'var(--muted)' }}>
																	{ref.refereeId}
																</div>
															)}
														</div>
													</td>
													<td style={{ padding: '16px' }}>
														<span 
															className="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
															style={{ 
																background: ref.level === 1 ? '#ede9fe' : ref.level === 2 ? '#f3e8ff' : '#faf5ff',
																color: ref.level === 1 ? '#7c3aed' : ref.level === 2 ? '#a855f7' : '#c084fc',
															}}
														>
															Level {ref.level}
														</span>
													</td>
													<td style={{ padding: '16px', textAlign: 'right', color: 'var(--foreground)' }}>
														{formatNumber(ref.totalFeesEarned)}
													</td>
													<td style={{ padding: '16px', textAlign: 'right', color: 'var(--foreground)' }}>
														{formatNumber(ref.feePercentage)}%
													</td>
													<td style={{ padding: '16px', textAlign: 'right', fontWeight: 600, color: 'var(--primary)' }}>
														{formatNumber(ref.totalXPGenerated)}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</div>

						{/* Activity Table */}
						<div className="card" style={{ overflow: 'hidden' }}>
							<div style={{ padding: '24px', borderBottom: '1px solid var(--border)' }}>
								<h2 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>
									Recent Activity
								</h2>
								<p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
									Your recent trades
								</p>
							</div>
							
							{activityData && activityData.length === 0 ? (
								<div className="p-8 text-center" style={{ color: 'var(--muted)' }}>
									No trades yet. Start trading to see activity!
								</div>
							) : activityData && (
								<div style={{ overflowX: 'auto' }}>
									<table style={{ width: '100%', borderCollapse: 'collapse' }}>
										<thead>
											<tr style={{ background: 'var(--background)', borderBottom: '1px solid var(--border)' }}>
												<th style={{ padding: '16px', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>
													Trade ID
												</th>
												<th style={{ padding: '16px', textAlign: 'right', fontSize: '0.875rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>
													Fee Amount
												</th>
												<th style={{ padding: '16px', textAlign: 'right', fontSize: '0.875rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>
													Date
												</th>
											</tr>
										</thead>
										<tbody>
											{activityData.map((trade, idx) => (
												<tr 
													key={trade.tradeId}
													style={{ 
														borderBottom: idx < activityData.length - 1 ? '1px solid var(--border)' : 'none',
														transition: 'background 0.15s ease',
													}}
													className="hover:bg-gray-50"
												>
													<td style={{ padding: '16px', fontFamily: 'monospace', fontSize: '0.875rem', color: 'var(--foreground)' }}>
														{trade.tradeId}
													</td>
													<td style={{ padding: '16px', textAlign: 'right', color: 'var(--foreground)' }}>
														{formatNumber(trade.feeAmount)}
													</td>
													<td style={{ padding: '16px', textAlign: 'right', color: 'var(--muted)', fontSize: '0.875rem' }}>
														{formatDate(trade.createdAt)}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</div>
					</>
				)}
			</div>
		</div>
	);
}

