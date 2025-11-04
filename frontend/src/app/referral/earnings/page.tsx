"use client";

import { useEarnings } from '@/application/providers';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import ClaimModal from '@/components/ClaimModal';
import { useToast } from '@/components/Toast';

export default function EarningsPage() {
	const { load } = useEarnings();
	const toast = useToast();
	const [data, setData] = useState<{ total: number; byLevel: Record<number, number> } | null>(null);
	const [err, setErr] = useState('');
	const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
	const [selectedChain, setSelectedChain] = useState<'EVM' | 'SVM'>('EVM');
	const [generatingRoots, setGeneratingRoots] = useState(false);
	
	useEffect(() => {
		loadData();
	}, [load]);

	const loadData = () => {
		load().then(setData).catch(e=>setErr(e?.message || 'Failed'));
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
				console.log('Generated merkle roots:', result);
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

	const openClaimModal = (chain: 'EVM' | 'SVM') => {
		setSelectedChain(chain);
		setIsClaimModalOpen(true);
	};
	
	return (
		<div className="min-h-screen" style={{ background: 'var(--background)' }}>
			<div className="max-w-3xl mx-auto px-4 py-12">
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
						Earnings
					</h1>
					<p style={{ color: 'var(--muted)' }}>
						Track your commission income
					</p>
				</div>

				{/* Testing Tools */}
				<div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
					<h3 className="font-semibold text-yellow-900 mb-2">🧪 Testing Tools</h3>
					<p className="text-sm text-yellow-800 mb-3">
						Generate merkle roots manually to make your earnings claimable
					</p>
					<button
						onClick={generateAllRoots}
						disabled={generatingRoots}
						className="px-4 py-2 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 disabled:bg-gray-300"
					>
						{generatingRoots ? 'Generating...' : '🔄 Generate All Merkle Roots'}
					</button>
				</div>

				{err && (
					<div className="p-4 rounded-lg mb-6" style={{ background: '#fef2f2', border: '1px solid #fca5a5' }}>
						<p className="text-center" style={{ color: '#dc2626' }}>{err}</p>
					</div>
				)}

				{data && (
					<>
						{/* Total Earnings Card */}
						<div className="card p-8 mb-6">
							<div className="text-center">
								<p className="text-sm mb-2" style={{ color: 'var(--muted)' }}>Total Earnings</p>
								<p className="text-4xl font-bold mb-1" style={{ color: 'var(--foreground)' }}>
									{data.total.toFixed(8)}
								</p>
								<p className="text-sm" style={{ color: 'var(--muted)' }}>XP</p>
							</div>
						</div>

						{/* Breakdown */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
							<div className="card p-6">
								<div className="flex justify-between items-center mb-2">
									<span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Cashback</span>
									<span className="text-xs px-2 py-1 rounded" style={{ background: 'var(--input-bg)', color: 'var(--muted)' }}>
										Your trades
									</span>
								</div>
								<p className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>
									{(data.byLevel[0] ?? 0).toFixed(8)}
								</p>
							</div>

							<div className="card p-6">
								<div className="flex justify-between items-center mb-2">
									<span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Level 1</span>
									<span className="text-xs px-2 py-1 rounded" style={{ background: 'var(--input-bg)', color: 'var(--muted)' }}>
										30%
									</span>
								</div>
								<p className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>
									{(data.byLevel[1] ?? 0).toFixed(8)}
								</p>
							</div>

							<div className="card p-6">
								<div className="flex justify-between items-center mb-2">
									<span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Level 2</span>
									<span className="text-xs px-2 py-1 rounded" style={{ background: 'var(--input-bg)', color: 'var(--muted)' }}>
										3%
									</span>
								</div>
								<p className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>
									{(data.byLevel[2] ?? 0).toFixed(8)}
								</p>
							</div>

							<div className="card p-6">
								<div className="flex justify-between items-center mb-2">
									<span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Level 3</span>
									<span className="text-xs px-2 py-1 rounded" style={{ background: 'var(--input-bg)', color: 'var(--muted)' }}>
										2%
									</span>
								</div>
								<p className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>
									{(data.byLevel[3] ?? 0).toFixed(8)}
								</p>
							</div>
						</div>

						{/* Claim Buttons */}
						{data.total > 0 && (
							<div>
								<h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
									Claim Your Earnings
								</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<button
										onClick={() => openClaimModal('EVM')}
										className="card p-6 text-left hover:shadow-lg transition-shadow cursor-pointer border-0"
									>
										<div className="flex items-center justify-between mb-2">
											<span className="font-semibold text-lg">EVM Chain</span>
											<span className="text-sm text-gray-500">Arbitrum</span>
										</div>
										<p className="text-sm text-gray-600 mb-3">
											Claim your XP on Ethereum Virtual Machine chains
										</p>
										<div className="flex items-center justify-between">
											<span className="text-2xl font-bold text-indigo-600">{data.total.toFixed(2)} XP</span>
											<span className="text-indigo-600">→</span>
										</div>
									</button>

									<button
										onClick={() => openClaimModal('SVM')}
										className="card p-6 text-left hover:shadow-lg transition-shadow cursor-pointer border-0"
									>
										<div className="flex items-center justify-between mb-2">
											<span className="font-semibold text-lg">SVM Chain</span>
											<span className="text-sm text-gray-500">Solana</span>
										</div>
										<p className="text-sm text-gray-600 mb-3">
											Claim your XP on Solana Virtual Machine
										</p>
										<div className="flex items-center justify-between">
											<span className="text-2xl font-bold text-purple-600">{data.total.toFixed(2)} XP</span>
											<span className="text-purple-600">→</span>
										</div>
									</button>
								</div>
							</div>
						)}
					</>
				)}

				{/* Claim Modal */}
				<ClaimModal
					isOpen={isClaimModalOpen}
					onClose={() => {
						setIsClaimModalOpen(false);
						loadData(); // Refresh earnings after claim
					}}
					chain={selectedChain}
					token="XP"
				/>
			</div>
		</div>
	);
}
