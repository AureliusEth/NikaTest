'use client';

import { useDashboard, useActivity } from '@/application/providers';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import ClaimModal from '@/components/ClaimModal';
import HourlyEarningsChart from '@/components/HourlyEarningsChart';
import { useToast } from '@/components/Toast';
import { useDarkMode } from '@/components/DarkModeProvider';

interface DashboardData {
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
	const toast = useToast();
	const { isDark, toggleDark } = useDarkMode();
	const [dashboard, setDashboard] = useState<DashboardData | null>(null);
	const [activity, setActivity] = useState<ActivityData[]>([]);
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(true);
	const [showGenerateModal, setShowGenerateModal] = useState(false);
	const [refCode, setRefCode] = useState('');
	const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
	const [generatingRoots, setGeneratingRoots] = useState(false);

	// Theme-aware color functions
	const getGlassmorphicBg = (opacity: number = 0.7) => 
		isDark ? `rgba(30, 30, 30, ${opacity})` : `rgba(255, 255, 255, ${opacity})`;
	
	const getGlassmorphicBorder = (opacity: number = 0.3) =>
		isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(255, 255, 255, ${opacity})`;
	
	const getTextColor = (opacity: number = 1) =>
		isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(29, 29, 31, ${opacity})`;
	
	const getTextSecondary = (opacity: number = 1) =>
		isDark ? `rgba(255, 255, 255, ${opacity * 0.6})` : `rgba(134, 134, 139, ${opacity})`;
	
	const getBackground = () =>
		isDark ? 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)' : '#f5f5f7';
	
	const getCardBg = () =>
		isDark ? 'rgba(30, 30, 30, 0.6)' : 'rgba(255, 255, 255, 0.7)';
	
	const getBorderColor = () =>
		isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(229, 229, 231, 1)';
	
	const getDividerColor = () =>
		isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(245, 245, 247, 1)';
	
	const getHoverBg = () =>
		isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)';

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

	const generateAllRoots = async () => {
		setGeneratingRoots(true);
		try {
			const response = await fetch('http://localhost:3000/api/merkle/generate-all', {
				method: 'POST',
				credentials: 'include',
			});

			if (response.ok) {
				const result = await response.json();
				const successMessages = result.results.map((r: any) => {
					if (r.success) {
						let msg = `${r.chain}/${r.token}: ✓ v${r.version}`;
						if (r.onChainUpdated && r.txHash) {
							msg += ` (on-chain: ${r.txHash.substring(0, 10)}...)`;
						} else if (r.onChainUpdated === false) {
							msg += ` (on-chain update skipped/failed)`;
						}
						return msg;
					} else {
						return `${r.chain}/${r.token}: ✗ ${r.error}`;
					}
				});
				const hasErrors = result.results.some((r: any) => !r.success);
				if (hasErrors) {
					toast.addToast(`⚠️ Some roots failed to generate:\n${successMessages.join('\n')}`, 'warning', 8000);
				} else {
					toast.addToast(`✅ Generated all merkle roots!\n\n${successMessages.join('\n')}`, 'success', 8000);
				}
			} else {
				const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
				toast.addToast(`Failed to generate merkle roots: ${errorData.error || 'Unknown error'}`, 'error');
			}
		} catch (error: any) {
			console.error('Failed to generate roots:', error);
			toast.addToast(`Error generating merkle roots: ${error.message || 'Network error'}`, 'error');
		} finally {
			setGeneratingRoots(false);
		}
	};


	return (
		<div style={{ 
			minHeight: '100vh', 
			background: getBackground(),
			transition: 'background 0.3s ease',
		}}>
			{/* Top Bar - Glassmorphic */}
			<div style={{ 
				background: getGlassmorphicBg(0.8),
				backdropFilter: 'blur(20px)',
				borderBottom: `1px solid ${getGlassmorphicBorder(0.2)}`,
				padding: '16px 0',
				boxShadow: isDark ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.05)',
			}}>
				<div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
						<Link href="/" style={{ fontSize: '20px', fontWeight: 700, color: isDark ? '#a78bfa' : '#5b21b6', textDecoration: 'none' }}>
							Nika
						</Link>
						<div style={{ height: '24px', width: '1px', background: getDividerColor() }}></div>
						<span style={{ fontSize: '15px', fontWeight: 600, color: getTextColor() }}>Dashboard</span>
					</div>
					<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
						{/* Dark Mode Toggle */}
						<button
							onClick={toggleDark}
							style={{
								background: getGlassmorphicBg(0.6),
								backdropFilter: 'blur(10px)',
								border: `1px solid ${getGlassmorphicBorder(0.2)}`,
								borderRadius: '8px',
								padding: '8px 12px',
								cursor: 'pointer',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								color: getTextColor(),
								transition: 'all 0.2s',
							}}
							title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
						>
							{isDark ? (
								<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
								</svg>
							) : (
								<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
								</svg>
							)}
						</button>
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
									
								// 4. Generate trades for the new user (both EVM and SVM)
								const chains: ('EVM' | 'SVM')[] = ['EVM', 'SVM'];
								for (const chain of chains) {
									const feeAmount = Math.floor(Math.random() * 950) + 50;
									const tradeId = `TRADE_${Date.now()}_${chain}_${Math.random().toString(36).slice(2, 8)}`;
									try {
										await fetch(`${baseUrl}/api/trades/mock`, {
											method: 'POST',
											headers: { 'Content-Type': 'application/json', 'x-user-id': newUserId },
											body: JSON.stringify({ tradeId, userId: newUserId, feeAmount, token: 'XP', chain })
										});
									} catch (e) {
										console.error(`Failed to generate ${chain} trade`, e);
									}
									}
									
									// Reload page
									setTimeout(() => window.location.reload(), 500);
								} catch (e) {
									console.error('Failed to populate', e);
									alert(`Failed to populate: ${e.message || 'Check console for details'}`);
								}
							}}
							className="btn"
							style={{ 
								padding: '8px 16px', 
								fontSize: '14px', 
								fontWeight: 600, 
								background: '#10b981', 
								color: 'white',
								border: 'none',
								borderRadius: '8px',
								cursor: 'pointer',
								backdropFilter: 'blur(10px)',
							}}
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
									
							// Pick a random referee and random chain
									const randomReferee = allReferees[Math.floor(Math.random() * allReferees.length)];
							const randomChain = Math.random() > 0.5 ? 'EVM' : 'SVM';
									const feeAmount = Math.floor(Math.random() * 950) + 50;
							const tradeId = `TRADE_${Date.now()}_${randomChain}_${Math.random().toString(36).slice(2, 8)}`;
							
							console.log(`[Generate Trade] Creating trade for ${randomReferee} on ${randomChain} with fee ${feeAmount}`);
									
									// Generate trade for the referee (not the current user)
							const tradeRes = await fetch(`${baseUrl}/api/trades/mock`, {
										method: 'POST',
										headers: { 'Content-Type': 'application/json', 'x-user-id': randomReferee },
										credentials: 'include',
								body: JSON.stringify({ tradeId, userId: randomReferee, feeAmount, token: 'XP', chain: randomChain })
									});
									
							if (!tradeRes.ok) {
								const errorData = await tradeRes.json();
								throw new Error(errorData.error || 'Failed to generate trade');
							}
							
							console.log('[Generate Trade] Trade created successfully, reloading page...');
							
							// Force reload with a slight delay
							setTimeout(() => {
								window.location.href = window.location.href;
							}, 100);
								} catch (e) {
									console.error('Failed to generate trade', e);
									alert('Failed to generate trade. Check console for details.');
								}
							}}
							className="btn btn-primary"
							style={{ 
								padding: '8px 16px', 
								fontSize: '14px', 
								fontWeight: 600,
								background: isDark ? 'rgba(99, 102, 241, 0.8)' : '#6366f1',
								color: 'white',
								border: 'none',
								borderRadius: '8px',
								cursor: 'pointer',
								backdropFilter: 'blur(10px)',
							}}
						>
							Generate Trade
						</button>
						<Link href="/" style={{ fontSize: '14px', color: getTextSecondary(), textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
					<div style={{ 
						background: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fef2f2', 
						border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.3)' : '#fca5a5'}`, 
						borderRadius: '12px', 
						padding: '16px', 
						marginBottom: '24px',
						backdropFilter: 'blur(10px)',
					}}>
						<p style={{ color: isDark ? '#fca5a5' : '#dc2626', textAlign: 'center', margin: 0 }}>{error}</p>
					</div>
				)}

				{loading ? (
					<div style={{ textAlign: 'center', padding: '80px 0' }}>
						<div style={{ 
							display: 'inline-block', 
							width: '48px', 
							height: '48px', 
							borderWidth: '4px',
							borderStyle: 'solid',
							borderColor: isDark ? '#a78bfa' : '#5b21b6',
							borderRightColor: 'transparent',
							borderRadius: '50%', 
							animation: 'spin 1s linear infinite' 
						}}></div>
						<style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
						<p style={{ marginTop: '16px', color: getTextSecondary(), fontSize: '15px' }}>Loading dashboard...</p>
					</div>
				) : dashboard ? (
					<>
						{/* Hourly Earnings Chart - Above everything else */}
						<HourlyEarningsChart />

						{/* XP Display - Glassmorphic */}
						<div style={{ 
							background: getCardBg(),
							backdropFilter: 'blur(20px)',
							border: `1px solid ${getGlassmorphicBorder(0.2)}`,
							borderRadius: '16px', 
							padding: '48px 32px',
							marginBottom: '32px',
							boxShadow: isDark ? '0 8px 32px rgba(0, 0, 0, 0.3)' : '0 8px 32px rgba(0, 0, 0, 0.1)',
						}}>
							<div style={{ textAlign: 'center' }}>
								<p style={{ color: getTextSecondary(), fontSize: '14px', fontWeight: 500, marginBottom: '12px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
									Unclaimed XP
								</p>
								<p style={{ color: getTextColor(), fontSize: '64px', fontWeight: 700, margin: '0', lineHeight: '1.1' }}>
									{dashboard.unclaimedXP.toFixed(2)}
								</p>
								<p style={{ color: getTextSecondary(), fontSize: '16px', marginTop: '8px' }}>XP</p>
								
								{/* Lifetime Stats */}
								<div style={{ 
									marginTop: '24px', 
									paddingTop: '24px', 
									borderTop: `1px solid ${getDividerColor()}`,
									display: 'flex',
									justifyContent: 'center',
									gap: '48px'
								}}>
									<div>
										<p style={{ color: getTextSecondary(), fontSize: '12px', marginBottom: '4px' }}>Total Earned</p>
										<p style={{ color: getTextColor(), fontSize: '18px', fontWeight: 600, margin: 0 }}>{dashboard.totalEarned.toFixed(2)} XP</p>
									</div>
									<div>
										<p style={{ color: getTextSecondary(), fontSize: '12px', marginBottom: '4px' }}>Total Claimed</p>
										<p style={{ color: getTextColor(), fontSize: '18px', fontWeight: 600, margin: 0 }}>{dashboard.totalClaimed.toFixed(2)} XP</p>
									</div>
								</div>
								
                                {/* Unified Claim Button */}
                                <div style={{ marginTop: '32px', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
									<button
										onClick={() => setIsClaimModalOpen(true)}
										className="btn"
										style={{ 
											background: isDark ? 'rgba(99, 102, 241, 0.8)' : '#6366f1', 
											color: 'white',
											border: 'none',
											padding: '14px 32px',
											fontSize: '16px',
											fontWeight: 700,
											borderRadius: '8px',
											cursor: 'pointer',
											backdropFilter: 'blur(10px)',
											boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
										}}
									>
										💎 Claim XP
									</button>
									<button
										onClick={generateAllRoots}
										disabled={generatingRoots}
										className="btn"
										style={{ 
											background: isDark ? 'rgba(245, 158, 11, 0.8)' : '#f59e0b', 
											color: 'white',
											border: 'none',
											padding: '12px 24px',
											fontSize: '15px',
											fontWeight: 600,
											borderRadius: '8px',
											cursor: 'pointer',
										}}
									>
										{generatingRoots ? 'Generating...' : '🔄 Generate Roots'}
									</button>
                                </div>
							</div>
						</div>

						{/* Stats Overview - Glassmorphic Cards */}
						<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '32px' }}>
							<div style={{ 
								background: getCardBg(),
								backdropFilter: 'blur(20px)',
								border: `1px solid ${getGlassmorphicBorder(0.2)}`,
								borderRadius: '16px', 
								padding: '24px', 
								boxShadow: isDark ? '0 8px 32px rgba(0, 0, 0, 0.3)' : '0 8px 32px rgba(0, 0, 0, 0.1)',
								transition: 'all 0.2s',
							}}>
								<p style={{ color: getTextSecondary(), fontSize: '13px', fontWeight: 500, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
									Total Referrals
								</p>
								<p style={{ color: getTextColor(), fontSize: '36px', fontWeight: 700, margin: 0 }}>
									{dashboard.referrals.length}
								</p>
							</div>

							<div style={{ 
								background: getCardBg(),
								backdropFilter: 'blur(20px)',
								border: `1px solid ${getGlassmorphicBorder(0.2)}`,
								borderRadius: '16px', 
								padding: '24px', 
								boxShadow: isDark ? '0 8px 32px rgba(0, 0, 0, 0.3)' : '0 8px 32px rgba(0, 0, 0, 0.1)',
								transition: 'all 0.2s',
							}}>
								<p style={{ color: getTextSecondary(), fontSize: '13px', fontWeight: 500, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
									Active Traders
								</p>
								<p style={{ color: getTextColor(), fontSize: '36px', fontWeight: 700, margin: 0 }}>
									{dashboard.referrals.filter(r => r.tradeCount > 0).length}
								</p>
							</div>

							<div style={{ 
								background: getCardBg(),
								backdropFilter: 'blur(20px)',
								border: `1px solid ${getGlassmorphicBorder(0.2)}`,
								borderRadius: '16px', 
								padding: '24px', 
								boxShadow: isDark ? '0 8px 32px rgba(0, 0, 0, 0.3)' : '0 8px 32px rgba(0, 0, 0, 0.1)',
								transition: 'all 0.2s',
							}}>
								<p style={{ color: getTextSecondary(), fontSize: '13px', fontWeight: 500, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
									Recent Activity
								</p>
								<p style={{ color: getTextColor(), fontSize: '36px', fontWeight: 700, margin: 0 }}>
									{activity.length}
								</p>
							</div>
						</div>

						{/* Referrals Table - Glassmorphic */}
						<div style={{ 
							background: getCardBg(),
							backdropFilter: 'blur(20px)',
							border: `1px solid ${getGlassmorphicBorder(0.2)}`,
							borderRadius: '16px', 
							padding: '32px', 
							marginBottom: '24px', 
							boxShadow: isDark ? '0 8px 32px rgba(0, 0, 0, 0.3)' : '0 8px 32px rgba(0, 0, 0, 0.1)',
						}}>
							<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
								<h2 style={{ fontSize: '24px', fontWeight: 700, color: getTextColor(), margin: 0 }}>
									Referred Users & Earnings
								</h2>
								<div style={{ fontSize: '14px', color: getTextSecondary(), fontWeight: 500 }}>
									{dashboard.referrals.length} referrals
								</div>
							</div>

							{dashboard.referrals.length === 0 ? (
							<div style={{ textAlign: 'center', padding: '64px 24px' }}>
								<p style={{ fontSize: '18px', fontWeight: 600, color: getTextColor(), marginBottom: '8px' }}>No referrals yet</p>
								<p style={{ color: getTextSecondary(), marginBottom: '24px' }}>Share your referral code to start earning</p>
								<button onClick={() => setShowGenerateModal(true)} className="btn btn-primary">
									Get Referral Code
								</button>
							</div>
							) : (
								<div style={{ overflowX: 'auto' }}>
									<table style={{ width: '100%', borderCollapse: 'collapse' }}>
										<thead>
											<tr style={{ borderBottom: `2px solid ${getDividerColor()}` }}>
												<th style={{ textAlign: 'left', padding: '16px 12px', color: getTextSecondary(), fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>User ID</th>
												<th style={{ textAlign: 'left', padding: '16px 12px', color: getTextSecondary(), fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Level</th>
												<th style={{ textAlign: 'right', padding: '16px 12px', color: getTextSecondary(), fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trades</th>
												<th style={{ textAlign: 'right', padding: '16px 12px', color: getTextSecondary(), fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Earned</th>
												<th style={{ textAlign: 'right', padding: '16px 12px', color: getTextSecondary(), fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>% of Total</th>
											</tr>
										</thead>
										<tbody>
											{dashboard.referrals.map((ref, idx) => (
												<tr 
													key={idx} 
													style={{ 
														borderBottom: `1px solid ${getDividerColor()}`, 
														transition: 'background 0.15s',
													}}
													onMouseEnter={(e) => {
														e.currentTarget.style.background = getHoverBg();
													}}
													onMouseLeave={(e) => {
														e.currentTarget.style.background = 'transparent';
													}}
												>
													<td style={{ padding: '18px 12px' }}>
														<span style={{ fontFamily: 'monospace', fontSize: '14px', color: getTextColor(), fontWeight: 500 }}>{ref.userId}</span>
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
													<td style={{ padding: '18px 12px', textAlign: 'right', color: getTextColor(), fontWeight: 500 }}>
														{ref.tradeCount}
													</td>
													<td style={{ padding: '18px 12px', textAlign: 'right' }}>
														<span style={{ color: getTextColor(), fontWeight: 600 }}>
															{ref.totalEarned.toFixed(2)} XP
														</span>
													</td>
													<td style={{ padding: '18px 12px', textAlign: 'right' }}>
														<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
															<div style={{ width: '80px', height: '6px', borderRadius: '3px', background: getDividerColor(), overflow: 'hidden' }}>
																<div 
																	style={{ 
																		height: '100%',
																		width: `${Math.min(ref.percentage, 100)}%`,
																		background: getLevelBadgeColor(ref.level),
																		transition: 'width 0.3s'
																	}}
																></div>
															</div>
															<span style={{ fontSize: '14px', fontWeight: 600, color: getTextColor(), minWidth: '45px' }}>
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

						{/* Activity Feed - Glassmorphic */}
						<div style={{ 
							background: getCardBg(),
							backdropFilter: 'blur(20px)',
							border: `1px solid ${getGlassmorphicBorder(0.2)}`,
							borderRadius: '16px', 
							padding: '32px', 
							boxShadow: isDark ? '0 8px 32px rgba(0, 0, 0, 0.3)' : '0 8px 32px rgba(0, 0, 0, 0.1)',
						}}>
							<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
								<h2 style={{ fontSize: '24px', fontWeight: 700, color: getTextColor(), margin: 0 }}>
									Recent Activity
								</h2>
								<div style={{ fontSize: '14px', color: getTextSecondary(), fontWeight: 500 }}>
									Last {activity.length} transactions
								</div>
							</div>

							{activity.length === 0 ? (
								<div style={{ textAlign: 'center', padding: '64px 24px' }}>
									<p style={{ fontSize: '18px', fontWeight: 600, color: getTextColor(), marginBottom: '8px' }}>No activity yet</p>
									<p style={{ color: getTextSecondary() }}>Activity from your referrals will appear here</p>
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
												borderRadius: '12px',
												background: getHoverBg(),
												border: `1px solid ${getGlassmorphicBorder(0.1)}`,
												backdropFilter: 'blur(10px)',
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
														<span style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 600, color: getTextColor() }}>
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
													<p style={{ fontSize: '13px', color: getTextSecondary(), margin: 0 }}>
														Trade fee: {act.feeAmount.toFixed(2)} XP
													</p>
												</div>
											</div>
											<div style={{ textAlign: 'right' }}>
												<p style={{ fontSize: '16px', fontWeight: 700, color: '#10b981', marginBottom: '2px' }}>
													+{act.earnedAmount.toFixed(2)} XP
												</p>
												<p style={{ fontSize: '12px', color: getTextSecondary() }}>
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

		{/* Claim Modal */}
		<ClaimModal
			isOpen={isClaimModalOpen}
			onClose={() => {
				setIsClaimModalOpen(false);
			}}
			onClaimSuccess={async () => {
				// Refresh dashboard data immediately after successful claim
				// This updates unclaimed XP even while modal is still open
				try {
					const [dashData, activityData] = await Promise.all([
						loadDashboard(),
						loadActivity(),
					]);
					setDashboard(dashData);
					setActivity(activityData);
				} catch (e: any) {
					console.error('Failed to reload dashboard:', e);
				}
			}}
		/>

		{/* Generate Code Modal - Glassmorphic */}
		{showGenerateModal && (
			<div 
				style={{ 
					position: 'fixed', 
					inset: 0, 
					background: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.3)', 
					backdropFilter: 'blur(4px)',
					display: 'flex', 
					alignItems: 'center', 
					justifyContent: 'center', 
					padding: 16, 
					zIndex: 1000 
				}} 
				onClick={() => setShowGenerateModal(false)}
			>
				<div 
					className="card" 
					style={{ 
						width: 520, 
						padding: 24, 
						background: getCardBg(),
						backdropFilter: 'blur(20px)',
						border: `1px solid ${getGlassmorphicBorder(0.2)}`,
						borderRadius: '16px', 
						boxShadow: isDark ? '0 20px 60px rgba(0, 0, 0, 0.5)' : '0 20px 60px rgba(0, 0, 0, 0.3)',
					}} 
					onClick={(e) => e.stopPropagation()}
				>
					<h2 style={{ fontSize: '24px', fontWeight: 700, color: getTextColor(), marginBottom: '8px' }}>Generate Referral Code</h2>
					<p style={{ color: getTextSecondary(), fontSize: '15px', marginBottom: '16px' }}>
						Share your referral code to earn up to 30%/3%/2% commission across three levels.
					</p>
					{refCode ? (
						<div>
							<label style={{ display: 'block', marginBottom: '6px', color: getTextSecondary(), fontSize: '13px', fontWeight: 500 }}>Your referral code</label>
							<input 
								className="input" 
								value={refCode} 
								readOnly 
								style={{ 
									marginBottom: '12px',
									background: getHoverBg(),
									border: `1px solid ${getGlassmorphicBorder(0.2)}`,
									color: getTextColor(),
								}} 
							/>
							<div style={{ display: 'flex', gap: '8px' }}>
								<button 
									className="btn" 
									style={{ 
										background: getHoverBg(),
										color: getTextColor(),
										border: `1px solid ${getGlassmorphicBorder(0.2)}`,
										flex: 1 
									}} 
									onClick={() => { 
										navigator.clipboard.writeText(refCode);
										toast.addToast('Code copied to clipboard!', 'success');
									}}
								>
									Copy Code
								</button>
								<button 
									className="btn btn-primary" 
									style={{ 
										flex: 1,
										background: isDark ? 'rgba(99, 102, 241, 0.8)' : '#6366f1',
										color: 'white',
									}} 
									onClick={() => {
										setShowGenerateModal(false);
										setRefCode('');
									}}
								>
									Done
								</button>
							</div>
						</div>
					) : (
						<div>
							{error && (
								<div style={{ 
									background: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fef2f2', 
									border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.3)' : '#fca5a5'}`, 
									borderRadius: '8px', 
									padding: '12px', 
									marginBottom: '12px',
									backdropFilter: 'blur(10px)',
								}}>
									<p style={{ color: isDark ? '#fca5a5' : '#dc2626', fontSize: '14px', margin: 0 }}>{error}</p>
								</div>
							)}
							<div style={{ display: 'flex', gap: '12px' }}>
								<button 
									className="btn" 
									style={{ 
										background: getHoverBg(),
										color: getTextColor(),
										border: `1px solid ${getGlassmorphicBorder(0.2)}`,
										flex: 1 
									}} 
									onClick={() => setShowGenerateModal(false)}
								>
									Cancel
								</button>
								<button 
									className="btn btn-primary" 
									style={{ 
										flex: 1,
										background: isDark ? 'rgba(99, 102, 241, 0.8)' : '#6366f1',
										color: 'white',
									}} 
									onClick={async () => {
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
									}} 
									disabled={loading}
								>
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

