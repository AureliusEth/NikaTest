"use client";

import { useState, useCallback } from 'react';
import { api } from './api';

/**
 * Simplified Claim Hook (No Wallet Needed!)
 * 
 * Since XP is simulated (database-only, not real tokens),
 * we just verify proof off-chain and record the claim.
 * 
 * Flow:
 * 1. User clicks claim
 * 2. Backend verifies proof off-chain
 * 3. Backend records claim in database
 * 4. Done - no wallet connection needed!
 */
export function useClaim(chain: 'EVM' | 'SVM', token: string = 'XP') {
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [claimId, setClaimId] = useState<string | null>(null);

  const claim = useCallback(async () => {
    setIsClaiming(true);
    setError(null);
    setSuccess(false);
    setClaimId(null);

    try {
      // Claim XP (simulated - no wallet needed)
      const response = await api<{
        success: boolean;
        claimId?: string;
        error?: string;
      }>(`/api/merkle/claim/${chain}/${token}`, {
        method: 'POST',
      });

      if (response.error) {
        throw new Error(response.error);
      }

      if (response.success && response.claimId) {
        setSuccess(true);
        setClaimId(response.claimId);
      } else {
        throw new Error('Claim failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to claim');
      setSuccess(false);
    } finally {
      setIsClaiming(false);
    }
  }, [chain, token, api]);

  return {
    claim,
    isClaiming,
    error,
    success,
    claimId,
  };
}
