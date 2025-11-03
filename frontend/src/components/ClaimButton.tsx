"use client";

import { useClaim } from '@/lib/use-claim';

interface ClaimButtonProps {
  chain: 'EVM' | 'SVM';
  token?: string;
  className?: string;
}

/**
 * Claim Button Component (No Wallet Needed!)
 * 
 * Since XP is simulated (database-only), we just verify proof
 * off-chain and record the claim - no wallet connection needed.
 */
export function ClaimButton({ chain, token = 'XP', className = '' }: ClaimButtonProps) {
  const { claim, isClaiming, error, success, claimId } = useClaim(chain, token);

  if (success && claimId) {
    return (
      <div className={`p-4 bg-green-50 border border-green-200 rounded ${className}`}>
        <p className="text-green-800 font-semibold">XP Claimed Successfully!</p>
        <p className="text-sm text-green-600 mt-1">
          Claim ID: {claimId.slice(0, 8)}...
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <button
        onClick={claim}
        disabled={isClaiming}
        className={`
          px-6 py-2 rounded-lg font-semibold transition-colors
          bg-blue-600 hover:bg-blue-700 text-white
          ${isClaiming ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {isClaiming ? 'Claiming...' : `Claim ${token}`}
      </button>
      
      {error && (
        <p className="mt-2 text-red-600 text-sm">{error}</p>
      )}
    </div>
  );
}

