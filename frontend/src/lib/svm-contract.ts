"use client";

import { useState, useCallback } from 'react';
import { useSvmWallet } from './wallet';
import { api } from './api';

/**
 * SVM Contract Interaction Hook
 * 
 * Provides functions to interact with Solana smart contracts
 */
export function useSvmContract() {
  const { account, wallet, isConnected } = useSvmWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Update merkle root on contract
   */
  const updateMerkleRoot = useCallback(async (
    chain: 'SVM',
    token: string,
    contractAddress: string
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      // First, generate merkle root if needed
      await api('/api/merkle/generate/' + chain + '/' + token, { method: 'POST' });

      // Then update on-chain via backend
      const response = await api<{
        success: boolean;
        txHash: string;
        error?: string;
      }>('/api/merkle/update-on-chain/' + chain + '/' + token, {
        method: 'POST',
      });

      if (response.error) {
        throw new Error(response.error);
      }

      return response.txHash;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Verify proof on-chain
   */
  const verifyProof = useCallback(async (
    chain: 'SVM',
    token: string,
    proof: string[],
    amount: number,
    userAddress: string
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api<{
        valid: boolean;
        error?: string;
      }>('/api/merkle/verify-on-chain/' + chain + '/' + token, {
        method: 'POST',
        body: JSON.stringify({ proof, amount, userAddress }),
      });

      if (response.error) {
        throw new Error(response.error);
      }

      return response.valid;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get merkle proof for user
   */
  const getProof = useCallback(async (
    chain: 'SVM',
    token: string,
    userId?: string
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api<{
        beneficiaryId: string;
        token: string;
        amount: number;
        proof: string[];
        leaf: string;
        root: string;
        verified: boolean;
        error?: string;
      }>('/api/merkle/proof/' + chain + '/' + token + (userId ? `?userId=${userId}` : ''), {
        method: 'GET',
      });

      if (response.error) {
        throw new Error(response.error);
      }

      return response;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get contract status
   */
  const getContractStatus = useCallback(async (
    chain: 'SVM',
    token: string
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api<{
        chain: string;
        token: string;
        contractAddress: string;
        onChainRoot: string;
        onChainVersion: number;
        databaseRoot: string | null;
        databaseVersion: number | null;
        synced: boolean;
        error?: string;
      }>('/api/merkle/contract-status/' + chain + '/' + token, {
        method: 'GET',
      });

      if (response.error) {
        throw new Error(response.error);
      }

      return response;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    account,
    isConnected,
    isLoading,
    error,
    updateMerkleRoot,
    verifyProof,
    getProof,
    getContractStatus,
  };
}

