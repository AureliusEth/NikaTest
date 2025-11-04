'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDarkMode } from '@/components/DarkModeProvider';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [mounted, setMounted] = useState(false);
  const [showAccountExistsModal, setShowAccountExistsModal] = useState(false);
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

  const handleLogin = async () => {
    setError('');
    try {
      setLoading(true);
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
      
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim() })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to login');
      
      localStorage.setItem('x-user-id', data.userId);
      
      // Check if user already has an account (has referral code or network)
      const hasAccountRes = await fetch(`${baseUrl}/api/referral/generate`, {
        method: 'POST',
        headers: { 'x-user-id': data.userId },
      });
      
      if (hasAccountRes.ok) {
        // User has an existing account
        setShowAccountExistsModal(true);
      } else {
        // New user, go to dashboard
        router.push('/dashboard');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to login');
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
            <Link 
              href="/"
              style={{ 
                background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)', 
                color: getTextColor(),
                padding: '0.5rem 0.9rem',
                border: `1px solid ${getBorderColor()}`,
                borderRadius: 8,
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: 500
              }}
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>

      {/* Centered login card */}
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
              Welcome back
            </h1>
            <p style={{ 
              fontSize: 14, 
              color: getTextSecondary(),
              marginBottom: 24 
            }}>
              Sign in to your Nika account
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
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
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

            {/* Login button */}
            <button
              disabled={loading || !email}
              onClick={handleLogin}
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
              {loading ? 'Signing in…' : 'Sign in'}
            </button>

            {error && (
              <div style={{ 
                padding: 12, 
                borderRadius: 8, 
                background: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid rgba(239, 68, 68, 0.3)',
                marginBottom: 16
              }}>
                <p style={{ fontSize: 14, color: '#ef4444', margin: 0 }}>{error}</p>
              </div>
            )}

            {/* Links */}
            <div style={{ 
              display: 'flex', 
              gap: 16, 
              justifyContent: 'center',
              fontSize: 14,
              color: getTextSecondary()
            }}>
              <span>Don't have an account?</span>
              <Link 
                href="/" 
                style={{ 
                  color: '#8b5cf6', 
                  textDecoration: 'none',
                  fontWeight: 500
                }}
              >
                Sign up
              </Link>
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

      {/* Account Exists Modal */}
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
                We found your account. Ready to continue?
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

