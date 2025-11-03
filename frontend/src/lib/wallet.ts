"use client";

import { useState, useEffect, useCallback } from 'react';

/**
 * EVM Wallet Hook
 * 
 * Provides wallet connection and interaction for EVM chains (Ethereum, Arbitrum, etc.)
 */
export function useEvmWallet() {
  const [account, setAccount] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<any>(null);

  useEffect(() => {
    // Check if wallet is already connected
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      checkConnection();
    }
  }, []);

  const checkConnection = async () => {
    try {
      const ethereum = (window as any).ethereum;
      if (!ethereum) return;

      const accounts = await ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setIsConnected(true);
        setProvider(ethereum);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const ethereum = (window as any).ethereum;
      
      if (!ethereum) {
        throw new Error('Please install MetaMask or another EVM wallet');
      }

      // Request account access
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setIsConnected(true);
        setProvider(ethereum);
      }
    } catch (err: any) {
      setError(err.message);
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAccount(null);
    setIsConnected(false);
    setProvider(null);
    setError(null);
  }, []);

  return {
    account,
    isConnected,
    isConnecting,
    error,
    provider,
    connect,
    disconnect,
  };
}

/**
 * SVM Wallet Hook (Solana)
 * 
 * Provides wallet connection and interaction for Solana
 */
export function useSvmWallet() {
  const [account, setAccount] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<any>(null);

  useEffect(() => {
    // Check if wallet is already connected
    if (typeof window !== 'undefined' && (window as any).solana) {
      checkConnection();
    }
  }, []);

  const checkConnection = async () => {
    try {
      const solana = (window as any).solana;
      if (!solana || !solana.isPhantom) return;

      if (solana.isConnected) {
        setAccount(solana.publicKey.toString());
        setIsConnected(true);
        setWallet(solana);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const solana = (window as any).solana;
      
      if (!solana || !solana.isPhantom) {
        throw new Error('Please install Phantom wallet');
      }

      // Request connection
      const response = await solana.connect();
      
      if (response.publicKey) {
        setAccount(response.publicKey.toString());
        setIsConnected(true);
        setWallet(solana);
      }
    } catch (err: any) {
      setError(err.message);
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      if (wallet) {
        await wallet.disconnect();
      }
    } catch (err) {
      // Ignore disconnect errors
    } finally {
      setAccount(null);
      setIsConnected(false);
      setWallet(null);
      setError(null);
    }
  }, [wallet]);

  return {
    account,
    isConnected,
    isConnecting,
    error,
    wallet,
    connect,
    disconnect,
  };
}

