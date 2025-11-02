'use client';

import { useState } from 'react';
import { useReferral } from '../../application/providers';
import Link from 'next/link';

export default function ReferralPage() {
  const { generate, referralCode, isLoading } = useReferral();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (referralCode) {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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
            Your Referral Code
          </h1>
          <p style={{ color: 'var(--muted)' }}>
            Share this code to grow your network
          </p>
        </div>

        {/* Main Card */}
        <div className="card p-8">
          {!referralCode ? (
            /* Generate State */
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
                Generate Your Referral Code
              </h2>
              <p className="mb-8" style={{ color: 'var(--muted)' }}>
                Click the button below to create your unique referral code
              </p>
              <button
                onClick={generate}
                disabled={isLoading}
                className="btn btn-primary"
              >
                {isLoading ? 'Generating...' : 'Next'}
              </button>
            </div>
          ) : (
            /* Code Display State */
            <div>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-3" style={{ color: 'var(--foreground)' }}>
                  Your Referral Code
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={referralCode}
                    readOnly
                    className="flex-1 p-4 rounded-lg border text-lg font-mono"
                    style={{ 
                      background: 'var(--input-bg)', 
                      borderColor: 'var(--border)',
                      color: 'var(--foreground)'
                    }}
                  />
                  <button
                    onClick={handleCopy}
                    className="px-6 py-4 rounded-lg font-medium"
                    style={{ 
                      background: copied ? 'var(--success)' : 'var(--primary)',
                      color: 'white'
                    }}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                {copied && (
                  <p className="text-sm mt-2" style={{ color: 'var(--success)' }}>
                    ✓ Copied to clipboard!
                  </p>
                )}
              </div>

              {/* Info Box */}
              <div className="p-4 rounded-lg mt-6" style={{ background: '#f0f0f5', border: '1px solid var(--border)' }}>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  Share this code with people you want to refer. When they register and trade, you earn commission: 30% from Level 1, 3% from Level 2, and 2% from Level 3.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold mb-1" style={{ color: 'var(--primary)' }}>30%</div>
            <div className="text-sm" style={{ color: 'var(--muted)' }}>Level 1</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold mb-1" style={{ color: 'var(--primary)' }}>3%</div>
            <div className="text-sm" style={{ color: 'var(--muted)' }}>Level 2</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold mb-1" style={{ color: 'var(--primary)' }}>2%</div>
            <div className="text-sm" style={{ color: 'var(--muted)' }}>Level 3</div>
          </div>
        </div>
      </div>
    </div>
  );
}
