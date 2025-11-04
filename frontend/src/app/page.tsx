'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDarkMode } from '@/components/DarkModeProvider';

export default function Home() {
  const [email, setEmail] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [mounted, setMounted] = useState(false);
  const [showAccountExistsModal, setShowAccountExistsModal] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [refCode, setRefCode] = useState<string>('');
  const [isSignIn, setIsSignIn] = useState(false); // Toggle between sign up and sign in
  const router = useRouter();
  const { isDark, toggleDark } = useDarkMode();

  useEffect(() => {
    setMounted(true);
  }, []);

  const getBackground = () =>
    isDark ? 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)' : '#f5f5f7';
  
  const getCardBg = () =>
    isDark ? 'rgba(30, 30, 30, 0.8)' : 'rgba(255, 255, 255, 0.9)';
  
  const getTextColor = () =>
    isDark ? 'rgba(255, 255, 255, 0.95)' : 'rgba(29, 29, 31, 1)';
  
  const getTextSecondary = () =>
    isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(134, 134, 139, 1)';
  
  const getBorderColor = () =>
    isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(229, 229, 231, 1)';

  const handleSubmit = async () => {
    setError('');
    try {
      setLoading(true);
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
      
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          email: email.trim(),
          inviteCode: !isSignIn && inviteCode.trim() ? inviteCode.trim() : undefined
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to authenticate');
      
      localStorage.setItem('x-user-id', data.userId);
      
      // Backend tells us if user already exists via DB lookup
      const accountExists = data.isExistingUser;
      
      if (!isSignIn && accountExists) {
        // User tried to sign up but account already exists
        setError('This account already exists. Please sign in instead.');
        setLoading(false);
        return;
      }
      
      if (isSignIn) {
        // Sign in flow
        if (accountExists) {
          setShowAccountExistsModal(true);
        } else {
          router.push('/dashboard');
        }
      } else {
        // Sign up flow - new account
        if (data.level) {
          // User registered with a referral code
          setShowWelcomeModal(true);
        } else {
          // New user without referral
          setShowWelcomeModal(true);
        }
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to authenticate');
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
    return <div className="min-h-screen" style={{ background: getBackground() }} />;
  }

  return (
    <div className="min-h-screen" style={{ background: getBackground(), transition: 'background 0.3s ease' }}>
      {/* Top bar */}
      <div className="px-4" style={{ maxWidth: 1120, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 20, color: '#8b5cf6' }}>Nika</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button 
              onClick={toggleDark}
              style={{ 
                background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)', 
                color: getTextColor(),
                padding: '0.5rem 0.9rem',
                border: `1px solid ${getBorderColor()}`,
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500
              }}
            >
              {isDark ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </div>

      {/* Centered auth card */}
      <div className="mx-auto" style={{ maxWidth: 480, padding: '0 16px' }}>
        <div style={{ paddingTop: 80, paddingBottom: 24 }}>
          <div 
            style={{ 
              padding: 32, 
              background: getCardBg(),
              backdropFilter: 'blur(20px)',
              borderRadius: 16,
              border: `1px solid ${getBorderColor()}`,
              boxShadow: isDark 
                ? '0 20px 60px rgba(0, 0, 0, 0.5)' 
                : '0 10px 40px rgba(0, 0, 0, 0.08)',
              transition: 'all 0.3s ease'
            }}
          >
            <h1 style={{ 
              fontSize: 28, 
              fontWeight: 600, 
              marginBottom: 8,
              color: getTextColor()
            }}>
              {isSignIn ? 'Welcome back' : 'Create your account'}
            </h1>
            <p style={{ 
              fontSize: 14, 
              color: getTextSecondary(),
              marginBottom: 24 
            }}>
              {isSignIn ? 'Sign in to your Nika account' : 'Join Nika and start earning commissions'}
            </p>

            {/* Email input */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ 
                display: 'block', 
                fontSize: 14, 
                fontWeight: 500,
                marginBottom: 8,
                color: getTextColor()
              }}>
                Email
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: 15,
                  border: `1px solid ${getBorderColor()}`,
                  borderRadius: 8,
                  background: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.5)',
                  color: getTextColor(),
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Invite code input - only shown for sign up */}
            {!isSignIn && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: 14, 
                  fontWeight: 500,
                  marginBottom: 8,
                  color: getTextColor()
                }}>
                  Invite Code <span style={{ color: getTextSecondary(), fontWeight: 400 }}>(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="ref_abc123"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: 15,
                    border: `1px solid ${getBorderColor()}`,
                    borderRadius: 8,
                    background: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.5)',
                    color: getTextColor(),
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            )}

            {/* Submit button */}
            <button
              disabled={loading || !email}
              onClick={handleSubmit}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: 15,
                fontWeight: 600,
                border: 'none',
                borderRadius: 8,
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                color: 'white',
                cursor: loading || !email ? 'not-allowed' : 'pointer',
                opacity: loading || !email ? 0.6 : 1,
                transition: 'all 0.2s ease',
                marginBottom: 16
              }}
            >
              {loading ? (isSignIn ? 'Signing in…' : 'Signing up…') : (isSignIn ? 'Sign in' : 'Sign up')}
            </button>

            {error && (
              <div style={{ 
                padding: 12, 
                borderRadius: 8, 
                background: error.includes('already exists') ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                border: error.includes('already exists') ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                marginBottom: 16
              }}>
                <p style={{ fontSize: 14, color: error.includes('already exists') ? '#f59e0b' : '#ef4444', margin: 0 }}>
                  {error}
                  {error.includes('already exists') && (
                    <button
                      onClick={() => {
                        setIsSignIn(true);
                        setError('');
                      }}
                      style={{
                        marginLeft: 8,
                        color: '#8b5cf6',
                        fontWeight: 600,
                        textDecoration: 'underline',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      Switch to Sign In
                    </button>
                  )}
                </p>
              </div>
            )}

            {/* Toggle between sign in and sign up */}
            <div style={{ 
              textAlign: 'center',
              fontSize: 14,
              color: getTextSecondary()
            }}>
              <span>{isSignIn ? "Don't have an account?" : 'Already have an account?'}</span>
              {' '}
              <button
                onClick={() => {
                  setIsSignIn(!isSignIn);
                  setError('');
                  setInviteCode('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8b5cf6',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: 14
                }}
              >
                {isSignIn ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer links */}
        <div style={{ 
          display: 'flex', 
          gap: 12, 
          justifyContent: 'center',
          fontSize: 14,
          color: getTextSecondary(),
          paddingBottom: 48
        }}>
          <Link href="/dashboard" style={{ color: getTextSecondary(), textDecoration: 'none' }}>Dashboard</Link>
          <span>•</span>
          <Link href="/referral/network" style={{ color: getTextSecondary(), textDecoration: 'none' }}>Network</Link>
          <span>•</span>
          <Link href="/referral/earnings" style={{ color: getTextSecondary(), textDecoration: 'none' }}>Earnings</Link>
        </div>
      </div>

      {/* Welcome Modal (for sign ups) */}
      {showWelcomeModal && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: 16, 
            zIndex: 1000 
          }}
          onClick={() => setShowWelcomeModal(false)}
        >
          <div 
            style={{ 
              width: 480, 
              padding: 32,
              background: getCardBg(),
              backdropFilter: 'blur(20px)',
              borderRadius: 16,
              border: `1px solid ${getBorderColor()}`,
              boxShadow: isDark 
                ? '0 25px 80px rgba(0, 0, 0, 0.6)' 
                : '0 25px 80px rgba(0, 0, 0, 0.15)'
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
              <h2 style={{ 
                fontSize: 24, 
                fontWeight: 600, 
                marginBottom: 8,
                color: getTextColor()
              }}>
                Welcome to Nika!
              </h2>
              <p style={{ 
                fontSize: 15, 
                color: getTextSecondary(),
                lineHeight: 1.5
              }}>
                Trade securely with low fees. Invite friends and earn up to 30% commission when your network trades.
              </p>
            </div>
            
            {refCode ? (
              <div style={{ marginBottom: 24 }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: 12, 
                  fontWeight: 500,
                  marginBottom: 8,
                  color: getTextSecondary(),
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Your referral code
                </label>
                <input 
                  readOnly 
                  value={refCode}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: 16,
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    border: `1px solid ${getBorderColor()}`,
                    borderRadius: 8,
                    background: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.5)',
                    color: getTextColor(),
                    textAlign: 'center',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            ) : null}
            
            <div style={{ display: 'flex', gap: 12 }}>
              {!refCode && (
                <button 
                  style={{ 
                    flex: 1,
                    padding: '12px 16px',
                    fontSize: 15,
                    fontWeight: 500,
                    border: `1px solid ${getBorderColor()}`,
                    borderRadius: 8,
                    background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                    color: getTextColor(),
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }} 
                  onClick={generateReferral}
                  disabled={loading}
                >
                  {loading ? 'Generating...' : 'Get Referral Code'}
                </button>
              )}
              {refCode && (
                <button 
                  style={{ 
                    flex: 1,
                    padding: '12px 16px',
                    fontSize: 15,
                    fontWeight: 500,
                    border: `1px solid ${getBorderColor()}`,
                    borderRadius: 8,
                    background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                    color: getTextColor(),
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }} 
                  onClick={() => {
                    navigator.clipboard.writeText(refCode);
                  }}
                >
                  Copy Code
                </button>
              )}
              <button 
                style={{ 
                  flex: 1,
                  padding: '12px 16px',
                  fontSize: 15,
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => router.push('/dashboard')}
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Exists Modal (for sign ins) */}
      {showAccountExistsModal && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: 16, 
            zIndex: 1000 
          }}
          onClick={() => setShowAccountExistsModal(false)}
        >
          <div 
            style={{ 
              width: 480, 
              padding: 32,
              background: getCardBg(),
              backdropFilter: 'blur(20px)',
              borderRadius: 16,
              border: `1px solid ${getBorderColor()}`,
              boxShadow: isDark 
                ? '0 25px 80px rgba(0, 0, 0, 0.6)' 
                : '0 25px 80px rgba(0, 0, 0, 0.15)'
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>👋</div>
              <h2 style={{ 
                fontSize: 24, 
                fontWeight: 600, 
                marginBottom: 8,
                color: getTextColor()
              }}>
                Welcome back!
              </h2>
              <p style={{ 
                fontSize: 15, 
                color: getTextSecondary(),
                lineHeight: 1.5
              }}>
                We found your existing account. Ready to continue?
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                style={{ 
                  flex: 1,
                  padding: '12px 16px',
                  fontSize: 15,
                  fontWeight: 500,
                  border: `1px solid ${getBorderColor()}`,
                  borderRadius: 8,
                  background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                  color: getTextColor(),
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }} 
                onClick={() => setShowAccountExistsModal(false)}
              >
                Cancel
              </button>
              <button 
                style={{ 
                  flex: 1,
                  padding: '12px 16px',
                  fontSize: 15,
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => router.push('/dashboard')}
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
