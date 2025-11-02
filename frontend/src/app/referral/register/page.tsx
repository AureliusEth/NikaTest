"use client";

import { useReferral } from '@/application/providers';
import { useState } from 'react';
import Link from 'next/link';

export default function RegisterReferralPage() {
	const { register } = useReferral();
	const [code, setCode] = useState('');
	const [result, setResult] = useState<string>('');
	const [err, setErr] = useState<string>('');
	
	return (
		<div className="min-h-screen" style={{ background: 'var(--background)' }}>
			<div className="max-w-2xl mx-auto px-4 py-12">
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
						Register with Referral Code
					</h1>
					<p style={{ color: 'var(--muted)' }}>
						Enter an invite code to join a network
					</p>
				</div>

				{/* Main Card */}
				<div className="card p-8">
					<div className="space-y-6">
						<div>
							<label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
								Invite Code (optional)
							</label>
							<input 
								className="input" 
								placeholder="Enter invite code" 
								value={code} 
								onChange={e=>setCode(e.target.value)} 
							/>
						</div>
						<button 
							className="w-full btn btn-primary" 
							onClick={async ()=>{
								setErr(''); setResult('');
								try {
									const res = await register(code);
									setResult(`✓ Registered at level ${res.level}`);
								} catch (e:any) { setErr(e?.message || 'Failed to register'); }
							}}
						>
							Next
						</button>
						{result && (
							<div className="p-4 rounded-lg" style={{ background: '#f0fdf4', border: '1px solid #86efac' }}>
								<p className="text-center" style={{ color: '#16a34a' }}>{result}</p>
							</div>
						)}
						{err && (
							<div className="p-4 rounded-lg" style={{ background: '#fef2f2', border: '1px solid #fca5a5' }}>
								<p className="text-center" style={{ color: '#dc2626' }}>{err}</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

