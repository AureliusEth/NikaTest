'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [email, setEmail] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [showWelcome, setShowWelcome] = useState(false);
  const [refCode, setRefCode] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // keep current user if already set
    const storedUserId = localStorage.getItem('x-user-id');
    if (storedUserId) setSuccess(`Current User: ${storedUserId}`);
  }, []);

  const handleNext = async () => {
    setError('');
    setSuccess('');
    // derive a valid user id from email (min 6 chars)
    const base = (email || '').trim().toUpperCase();
    const userId = base.length >= 6 ? base : `USER_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    localStorage.setItem('x-user-id', userId);
    try {
      setLoading(true);
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
      // persist email
      if (email.trim()) {
        await fetch(`${baseUrl}/api/user/email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
          body: JSON.stringify({ email: email.trim() })
        });
      }
      // optional register by invite
      if (inviteCode.trim()) {
        const res = await fetch(`${baseUrl}/api/referral/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
          body: JSON.stringify({ code: inviteCode.trim() })
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body?.message || 'Failed to register');
        setSuccess(`✓ Registered (level ${body.level}) as ${userId}`);
      }
      // show welcome modal
      setShowWelcome(true);
    } catch (e: any) {
      setError(e?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const generateReferral = async () => {
    try {
      setLoading(true);
      setError('');
      const userId = localStorage.getItem('x-user-id') || '';
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
      const res = await fetch(`${baseUrl}/api/referral/generate`, {
        method: 'POST',
        headers: { 'x-user-id': userId },
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.message || 'Failed to generate');
      setRefCode(body.code);
    } catch (e: any) {
      setError(e?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return <div className="min-h-screen" style={{ background: 'var(--background)' }} />;
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      {/* Top utility bar */}
      <div className="px-4" style={{ maxWidth: 1120, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 }}>
          <div style={{ fontWeight: 700, color: '#6d28d9' }}>kraken</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn" style={{ background: '#f2f2f5', color: 'var(--foreground)', padding: '0.5rem 0.9rem' }}>U.S. English</button>
            <button className="btn" style={{ background: '#f2f2f5', color: 'var(--foreground)', padding: '0.5rem 0.9rem' }}>Sign in</button>
          </div>
        </div>
      </div>

      {/* Centered narrow card like Kraken */}
      <div className="mx-auto" style={{ maxWidth: 560 }}>
        <div className="px-4 pt-16 pb-6">
          <div className="card" style={{ padding: '28px 28px' }}>
            <div className="form-title" style={{ marginBottom: 16 }}>Create a personal account</div>
            {/* Segmented */}
            <div className="segmented" style={{ marginBottom: 16 }}>
              <button className="active">Personal</button>
              <button>Business</button>
            </div>

            {/* Inputs */}
            <div style={{ display: 'grid', gap: 12 }}>
              <input
                className="input"
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                className="input"
                placeholder="Invite Code (optional)"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
              />
              <button
                disabled={loading}
                className="btn btn-primary"
                onClick={handleNext}
                style={{ width: '100%' }}
              >
                {loading ? 'Please wait…' : 'Next'}
              </button>
            </div>

            {success && (
              <div className="mt-3 p-3 rounded" style={{ background: '#f0fdf4', border: '1px solid #86efac', marginTop: 12 }}>
                <p className="text-sm" style={{ color: '#16a34a' }}>{success}</p>
              </div>
            )}
            {error && (
              <div className="mt-3 p-3 rounded" style={{ background: '#fef2f2', border: '1px solid #fca5a5', marginTop: 12 }}>
                <p className="text-sm" style={{ color: '#dc2626' }}>{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Minimal links row, aligned with Kraken footer spacing */}
        <div className="px-4 pb-16" style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link href="/referral" className="form-subtle">Generate code</Link>
          <span className="form-subtle">•</span>
          <Link href="/referral/register" className="form-subtle">Register</Link>
          <span className="form-subtle">•</span>
          <Link href="/referral/network" className="form-subtle">Network</Link>
          <span className="form-subtle">•</span>
          <Link href="/referral/earnings" className="form-subtle">Earnings</Link>
        </div>
      </div>

    {/* Welcome Modal */}
    {showWelcome && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div className="card" style={{ width: 520, padding: 24 }}>
          <h2 className="form-title" style={{ marginBottom: 8 }}>Welcome to Nika Finance</h2>
          <p className="form-subtle" style={{ marginBottom: 16 }}>
            Trade securely with low fees. Invite friends and earn up to 30%/3%/2% commission across three levels when your network trades.
          </p>
          {refCode ? (
            <div>
              <label className="form-subtle" style={{ display: 'block', marginBottom: 6 }}>Your referral code</label>
              <input className="input" value={refCode} readOnly />
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <button className="btn" style={{ background: '#f2f2f5' }} onClick={() => { navigator.clipboard.writeText(refCode); }}>
                  Copy
                </button>
                <Link href="/referral" className="btn btn-primary" style={{ padding: '0.875rem 1.25rem' }}>View details</Link>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn" style={{ background: '#f2f2f5' }} onClick={() => setShowWelcome(false)}>Close</button>
              <button className="btn btn-primary" onClick={generateReferral} disabled={loading}>
                {loading ? 'Generating…' : 'Generate code'}
              </button>
            </div>
          )}
        </div>
      </div>
    )}
    </div>
  );
}
