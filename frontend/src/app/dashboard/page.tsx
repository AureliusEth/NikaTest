'use client';

import { useDashboard, useActivity } from '@/application/providers';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DashboardData {
	totalXP: number;
	referrals: Array<{
		userId: string;
		level: number;
		totalEarned: number;
		tradeCount: number;
		percentage: number;
	}>;
}

interface ActivityData {
	tradeId: string;
	userId: string;
	feeAmount: number;
	earnedAmount: number;
	level: number;
	createdAt: string;
}

export default function DashboardPage() {
	const { load: loadDashboard } = useDashboard();
	const { load: loadActivity } = useActivity();
	const [dashboard, setDashboard] = useState<DashboardData | null>(null);
	const [activity, setActivity] = useState<ActivityData[]>([]);
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(true);
	const [showGenerateModal, setShowGenerateModal] = useState(false);
	const [refCode, setRefCode] = useState('');

	useEffect(() => {
		const fetchData = async () => {
			try {
				setLoading(true);
				const [dashData, activityData] = await Promise.all([
					loadDashboard(),
					loadActivity(),
				]);
				setDashboard(dashData);
				setActivity(activityData);
			} catch (e: any) {
				setError(e?.message || 'Failed to load dashboard');
			} finally {
				setLoading(false);
			}
		};
		fetchData();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const getLevelBadgeColor = (level: number) => {
		switch (level) {
			case 1: return '#8b5cf6'; // purple
			case 2: return '#3b82f6'; // blue
			case 3: return '#10b981'; // green
			default: return '#6b7280'; // gray
		}
	};

	const getLevelRate = (level: number) => {
		switch (level) {
			case 1: return '30%';
			case 2: return '3%';
			case 3: return '2%';
			default: return '0%';
		}
	};

	const formatDate = (dateStr: string) => {
		const date = new Date(dateStr);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 7) return `${diffDays}d ago`;
		return date.toLocaleDateString();
	};

	return (
		<div style={{ minHeight: '100vh', background: '#f5f5f7' }}>
			{/* Top Bar */}
			<div style={{ background: 'white', borderBottom: '1px solid #e5e5e7', padding: '16px 0' }}>
				<div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
						<Link href="/" style={{ fontSize: '20px', fontWeight: 700, color: '#5b21b6', textDecoration: 'none' }}>
							Nika
						</Link>
						<div style={{ height: '24px', width: '1px', background: '#e5e5e7' }}></div>
						<span style={{ fontSize: '15px', fontWeight: 600, color: '#1d1d1f' }}>Dashboard</span>
					</div>
					<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
						<button 
							onClick={async () => {
								try {
									const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('x-user-id') : '';
									const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
									
									// 1. Generate or get referral code for current user (use current session)
									let refCode;
									try {
										const refRes = await fetch(`${baseUrl}/api/referral/generate`, {
											method: 'POST',
											headers: { 'x-user-id': currentUserId || '', 'Content-Type': 'application/json' },
											credentials: 'include'
										});
										const refData = await refRes.json();
										refCode = refData.code;
									} catch (e) {
										console.error('Failed to generate referral code', e);
										alert('Failed to generate referral code');
										return;
									}
									
									// 2. Create a new random user (NO session cookie - use only x-user-id header)
									const newUserId = `USER_${Date.now()}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
									try {
										await fetch(`${baseUrl}/api/user/email`, {
											method: 'POST',
											headers: { 'Content-Type': 'application/json', 'x-user-id': newUserId },
											body: JSON.stringify({ email: `${newUserId.toLowerCase()}@demo.com` })
										});
									} catch (e) {
										console.error('Failed to create user', e);
									}
									
									// Small delay
									await new Promise(r => setTimeout(r, 100));
									
									// 3. Register the new user with current user's referral code (NO session cookie)
									try {
										const regRes = await fetch(`${baseUrl}/api/referral/register`, {
											method: 'POST',
											headers: { 'Content-Type': 'application/json', 'x-user-id': newUserId },
											body: JSON.stringify({ code: refCode })
										});
										if (!regRes.ok) {
											const errorData = await regRes.json();
											console.error('Registration failed:', errorData);
											throw new Error(`Registration failed: ${errorData.message}`);
										}
									} catch (e) {
										console.error('Failed to register referral', e);
										throw e;
									}
									
									// Small delay
									await new Promise(r => setTimeout(r, 100));
									
									// 4. Generate a trade for the new user (NO session cookie)
									const feeAmount = Math.floor(Math.random() * 950) + 50;
									const tradeId = `TRADE_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
									try {
										await fetch(`${baseUrl}/api/trades/mock`, {
											method: 'POST',
											headers: { 'Content-Type': 'application/json', 'x-user-id': newUserId },
											body: JSON.stringify({ tradeId, userId: newUserId, feeAmount, token: 'XP' })
										});
									} catch (e) {
										console.error('Failed to generate trade', e);
									}
									
									// Reload page
									setTimeout(() => window.location.reload(), 500);
								} catch (e) {
									console.error('Failed to populate', e);
									alert(`Failed to populate: ${e.message || 'Check console for details'}`);
								}
							}}
							className="btn"
							style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 600, background: '#10b981', color: 'white' }}
						>
							Populate
						</button>
						<button 
							onClick={async () => {
								try {
									const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('x-user-id') : '';
									const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
									
									// Fetch current user's referral network
									const networkRes = await fetch(`${baseUrl}/api/referral/network`, {
										headers: { 'x-user-id': currentUserId || '' },
										credentials: 'include'
									});
									const network = await networkRes.json();
									
									// Get all referees (direct and indirect)
									const allReferees = [
										...(network.level1 || network.direct || []),
										...(network.level2 || []),
										...(network.level3 || [])
									];
									
									if (allReferees.length === 0) {
										alert('You need referrals first! Use the Populate button to create one.');
										return;
									}
									
									// Pick a random referee
									const randomReferee = allReferees[Math.floor(Math.random() * allReferees.length)];
									const feeAmount = Math.floor(Math.random() * 950) + 50;
									const tradeId = `TRADE_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
									
									// Generate trade for the referee (not the current user)
									await fetch(`${baseUrl}/api/trades/mock`, {
										method: 'POST',
										headers: { 'Content-Type': 'application/json', 'x-user-id': randomReferee },
										credentials: 'include',
										body: JSON.stringify({ tradeId, userId: randomReferee, feeAmount, token: 'XP' })
									});
									
									window.location.reload();
								} catch (e) {
									console.error('Failed to generate trade', e);
									alert('Failed to generate trade. Check console for details.');
								}
							}}
							className="btn btn-primary"
							style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 600 }}
						>
							Generate Trade
						</button>
						<Link href="/" style={{ fontSize: '14px', color: '#86868b', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
							<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
							</svg>
							Back
						</Link>
					</div>
				</div>
			</div>

			{/* Main Content */}
			<div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>

				{error && (
					<div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
						<p style={{ color: '#dc2626', textAlign: 'center', margin: 0 }}>{error}</p>
					</div>
				)}

				{loading ? (
					<div style={{ textAlign: 'center', padding: '80px 0' }}>
						<div style={{ display: 'inline-block', width: '48px', height: '48px', border: '4px solid #5b21b6', borderRightColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
						<style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
						<p style={{ marginTop: '16px', color: '#86868b', fontSize: '15px' }}>Loading dashboard...</p>
					</div>
				) : dashboard ? (
					<>
						{/* XP Display - Prominent at the top */}
						<div style={{ 
							background: 'linear-gradient(135deg, #5b21b6 0%, #7c3aed 100%)', 
							borderRadius: '16px', 
							padding: '48px 32px',
							marginBottom: '32px',
							boxShadow: '0 4px 24px rgba(91, 33, 182, 0.15)'
						}}>
							<div style={{ textAlign: 'center' }}>
								<p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', fontWeight: 500, marginBottom: '12px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
									Total XP Earned
								</p>
								<p style={{ color: 'white', fontSize: '64px', fontWeight: 700, margin: '0', lineHeight: '1.1' }}>
									{dashboard.totalXP.toFixed(2)}
								</p>
								<p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '16px', marginTop: '8px' }}>XP</p>
							</div>
						</div>

						{/* Stats Overview */}
						<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '32px' }}>
							<div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', transition: 'all 0.2s' }}>
								<p style={{ color: '#86868b', fontSize: '13px', fontWeight: 500, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
									Total Referrals
								</p>
								<p style={{ color: '#1d1d1f', fontSize: '36px', fontWeight: 700, margin: 0 }}>
									{dashboard.referrals.length}
								</p>
							</div>

							<div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', transition: 'all 0.2s' }}>
								<p style={{ color: '#86868b', fontSize: '13px', fontWeight: 500, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
									Active Traders
								</p>
								<p style={{ color: '#1d1d1f', fontSize: '36px', fontWeight: 700, margin: 0 }}>
									{dashboard.referrals.filter(r => r.tradeCount > 0).length}
								</p>
							</div>

							<div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', transition: 'all 0.2s' }}>
								<p style={{ color: '#86868b', fontSize: '13px', fontWeight: 500, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
									Recent Activity
								</p>
								<p style={{ color: '#1d1d1f', fontSize: '36px', fontWeight: 700, margin: 0 }}>
									{activity.length}
								</p>
							</div>
						</div>

						{/* Referrals Table */}
						<div style={{ background: 'white', borderRadius: '12px', padding: '32px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
							<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
								<h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1d1d1f', margin: 0 }}>
									Referred Users & Earnings
								</h2>
								<div style={{ fontSize: '14px', color: '#86868b', fontWeight: 500 }}>
									{dashboard.referrals.length} referrals
								</div>
							</div>

							{dashboard.referrals.length === 0 ? (
							<div style={{ textAlign: 'center', padding: '64px 24px' }}>
								<p style={{ fontSize: '18px', fontWeight: 600, color: '#1d1d1f', marginBottom: '8px' }}>No referrals yet</p>
								<p style={{ color: '#86868b', marginBottom: '24px' }}>Share your referral code to start earning</p>
								<button onClick={() => setShowGenerateModal(true)} className="btn btn-primary">
									Get Referral Code
								</button>
							</div>
							) : (
								<div style={{ overflowX: 'auto' }}>
									<table style={{ width: '100%', borderCollapse: 'collapse' }}>
										<thead>
											<tr style={{ borderBottom: '2px solid #f5f5f7' }}>
												<th style={{ textAlign: 'left', padding: '16px 12px', color: '#86868b', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>User ID</th>
												<th style={{ textAlign: 'left', padding: '16px 12px', color: '#86868b', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Level</th>
												<th style={{ textAlign: 'right', padding: '16px 12px', color: '#86868b', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trades</th>
												<th style={{ textAlign: 'right', padding: '16px 12px', color: '#86868b', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Earned</th>
												<th style={{ textAlign: 'right', padding: '16px 12px', color: '#86868b', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>% of Total</th>
											</tr>
										</thead>
										<tbody>
											{dashboard.referrals.map((ref, idx) => (
												<tr key={idx} style={{ borderBottom: '1px solid #f5f5f7', transition: 'background 0.15s' }}>
													<td style={{ padding: '18px 12px' }}>
														<span style={{ fontFamily: 'monospace', fontSize: '14px', color: '#1d1d1f', fontWeight: 500 }}>{ref.userId}</span>
													</td>
													<td style={{ padding: '18px 12px' }}>
														<span 
															style={{ 
																display: 'inline-block',
																padding: '6px 12px',
																borderRadius: '6px',
																fontSize: '13px',
																fontWeight: 600,
																background: `${getLevelBadgeColor(ref.level)}15`,
																color: getLevelBadgeColor(ref.level)
															}}
														>
															Level {ref.level} • {getLevelRate(ref.level)}
														</span>
													</td>
													<td style={{ padding: '18px 12px', textAlign: 'right', color: '#1d1d1f', fontWeight: 500 }}>
														{ref.tradeCount}
													</td>
													<td style={{ padding: '18px 12px', textAlign: 'right' }}>
														<span style={{ color: '#1d1d1f', fontWeight: 600 }}>
															{ref.totalEarned.toFixed(2)} XP
														</span>
													</td>
													<td style={{ padding: '18px 12px', textAlign: 'right' }}>
														<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
															<div style={{ width: '80px', height: '6px', borderRadius: '3px', background: '#f5f5f7', overflow: 'hidden' }}>
																<div 
																	style={{ 
																		height: '100%',
																		width: `${Math.min(ref.percentage, 100)}%`,
																		background: getLevelBadgeColor(ref.level),
																		transition: 'width 0.3s'
																	}}
																></div>
															</div>
															<span style={{ fontSize: '14px', fontWeight: 600, color: '#1d1d1f', minWidth: '45px' }}>
																{ref.percentage.toFixed(1)}%
															</span>
														</div>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</div>

						{/* Activity Feed */}
						<div style={{ background: 'white', borderRadius: '12px', padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
							<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
								<h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1d1d1f', margin: 0 }}>
									Recent Activity
								</h2>
								<div style={{ fontSize: '14px', color: '#86868b', fontWeight: 500 }}>
									Last {activity.length} transactions
								</div>
							</div>

							{activity.length === 0 ? (
								<div style={{ textAlign: 'center', padding: '64px 24px' }}>
									<p style={{ fontSize: '18px', fontWeight: 600, color: '#1d1d1f', marginBottom: '8px' }}>No activity yet</p>
									<p style={{ color: '#86868b' }}>Activity from your referrals will appear here</p>
								</div>
							) : (
								<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
									{activity.map((act, idx) => (
										<div 
											key={idx}
											style={{ 
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'space-between',
												padding: '16px',
												borderRadius: '8px',
												background: '#fafafa',
												border: '1px solid #f5f5f7',
												transition: 'all 0.15s'
											}}
										>
											<div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
												<div 
													style={{ 
														width: '40px',
														height: '40px',
														borderRadius: '50%',
														display: 'flex',
														alignItems: 'center',
														justifyContent: 'center',
														background: `${getLevelBadgeColor(act.level)}15`,
														flexShrink: 0
													}}
												>
													<svg width="18" height="18" fill="none" stroke={getLevelBadgeColor(act.level)} viewBox="0 0 24 24" strokeWidth="2.5">
														<path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
													</svg>
												</div>
												<div>
													<div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
														<span style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 600, color: '#1d1d1f' }}>
															{act.userId}
														</span>
														<span 
															style={{ 
																padding: '4px 8px',
																borderRadius: '4px',
																fontSize: '12px',
																fontWeight: 600,
																background: `${getLevelBadgeColor(act.level)}15`,
																color: getLevelBadgeColor(act.level)
															}}
														>
															L{act.level}
														</span>
													</div>
													<p style={{ fontSize: '13px', color: '#86868b', margin: 0 }}>
														Trade fee: {act.feeAmount.toFixed(2)} XP
													</p>
												</div>
											</div>
											<div style={{ textAlign: 'right' }}>
												<p style={{ fontSize: '16px', fontWeight: 700, color: '#10b981', marginBottom: '2px' }}>
													+{act.earnedAmount.toFixed(2)} XP
												</p>
												<p style={{ fontSize: '12px', color: '#86868b' }}>
													{formatDate(act.createdAt)}
												</p>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
				</>
			) : null}
		</div>

		{/* Generate Code Modal */}
		{showGenerateModal && (
			<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000 }} onClick={() => setShowGenerateModal(false)}>
				<div className="card" style={{ width: 520, padding: 24, background: 'white', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={(e) => e.stopPropagation()}>
					<h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1d1d1f', marginBottom: '8px' }}>Generate Referral Code</h2>
					<p style={{ color: '#86868b', fontSize: '15px', marginBottom: '16px' }}>
						Share your referral code to earn up to 30%/3%/2% commission across three levels.
					</p>
					{refCode ? (
						<div>
							<label style={{ display: 'block', marginBottom: '6px', color: '#86868b', fontSize: '13px', fontWeight: 500 }}>Your referral code</label>
							<input className="input" value={refCode} readOnly style={{ marginBottom: '12px' }} />
							<div style={{ display: 'flex', gap: '8px' }}>
								<button className="btn" style={{ background: '#f2f2f5', flex: 1 }} onClick={() => { 
									navigator.clipboard.writeText(refCode);
									alert('Code copied to clipboard!');
								}}>
									Copy Code
								</button>
								<button className="btn btn-primary" style={{ flex: 1 }} onClick={() => {
									setShowGenerateModal(false);
									setRefCode('');
								}}>
									Done
								</button>
							</div>
						</div>
					) : (
						<div>
							{error && (
								<div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
									<p style={{ color: '#dc2626', fontSize: '14px', margin: 0 }}>{error}</p>
								</div>
							)}
							<div style={{ display: 'flex', gap: '12px' }}>
								<button className="btn" style={{ background: '#f2f2f5', flex: 1 }} onClick={() => setShowGenerateModal(false)}>
									Cancel
								</button>
								<button className="btn btn-primary" style={{ flex: 1 }} onClick={async () => {
									try {
										setLoading(true);
										setError('');
										const userId = typeof window !== 'undefined' ? localStorage.getItem('x-user-id') : '';
										const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
										const res = await fetch(`${baseUrl}/api/referral/generate`, {
											method: 'POST',
											headers: { 'x-user-id': userId || '', 'Content-Type': 'application/json' },
											credentials: 'include'
										});
										const body = await res.json();
										if (!res.ok) throw new Error(body?.message || 'Failed to generate');
										setRefCode(body.code);
									} catch (e: any) {
										setError(e?.message || 'Failed to generate code');
									} finally {
										setLoading(false);
									}
								}} disabled={loading}>
									{loading ? 'Generating…' : 'Generate Code'}
								</button>
							</div>
						</div>
					)}
				</div>
			</div>
		)}
	</div>
	);
}

