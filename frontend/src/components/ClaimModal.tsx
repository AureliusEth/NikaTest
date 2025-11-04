'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClaimSuccess?: () => void; // Callback to refresh dashboard after claim
}

interface ChainPreview {
  claimableAmount: number;
  userCashback: number;
  treasuryAmount: number;
  evmTreasuryTotal: number;
  svmTreasuryTotal: number;
  chain: 'EVM' | 'SVM';
  token: string;
  canClaim: boolean;
  merkleVersion?: number;
  message?: string;
}

interface ClaimReceipt {
  evmClaimed: number;
  svmClaimed: number;
  totalClaimed: number;
  cashbackAmount: number;
  commissions: number;
  evmTreasuryBalance: number;
  svmTreasuryBalance: number;
  totalTreasury: number;
  evmExplorerUrl?: string;
  svmExplorerUrl?: string;
}

export default function ClaimModal({ isOpen, onClose, onClaimSuccess }: ClaimModalProps) {
  const [step, setStep] = useState<'preview' | 'confirming' | 'success'>('preview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [evmPreview, setEvmPreview] = useState<ChainPreview | null>(null);
  const [svmPreview, setSvmPreview] = useState<ChainPreview | null>(null);
  const [receipt, setReceipt] = useState<ClaimReceipt | null>(null);
  const [revealeWords, setRevealedWords] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setStep('preview');
      setLoading(true);
      setError(null);
      fetchPreviews();
    }
  }, [isOpen]);

  const fetchPreviews = async () => {
    try {
      const [evmRes, svmRes] = await Promise.all([
        fetch(`/api/merkle/claim-preview/EVM/XP`, { credentials: 'include' }),
        fetch(`/api/merkle/claim-preview/SVM/XP`, { credentials: 'include' }),
      ]);

      if (!evmRes.ok || !svmRes.ok) throw new Error('Failed to load claim preview');
      
      const [evmData, svmData] = await Promise.all([evmRes.json(), svmRes.json()]);
      setEvmPreview(evmData);
      setSvmPreview(svmData);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    const canClaimEvm = evmPreview?.canClaim && evmPreview.claimableAmount > 0;
    const canClaimSvm = svmPreview?.canClaim && svmPreview.claimableAmount > 0;
    
    if (!canClaimEvm && !canClaimSvm) return;
    
    setStep('confirming');
    setError(null);

    try {
      const claimPromises = [];
      
      if (canClaimEvm) {
        claimPromises.push(
          fetch(`/api/merkle/claim/EVM/XP`, {
            method: 'POST',
            credentials: 'include',
          }).then(res => res.ok ? res.json() : Promise.reject(new Error('EVM claim failed')))
        );
      }
      
      if (canClaimSvm) {
        claimPromises.push(
          fetch(`/api/merkle/claim/SVM/XP`, {
            method: 'POST',
            credentials: 'include',
          }).then(res => res.ok ? res.json() : Promise.reject(new Error('SVM claim failed')))
        );
      }

      const results = await Promise.all(claimPromises);
      
      const evmResult = canClaimEvm ? results[0] : null;
      const svmResult = canClaimSvm ? results[canClaimEvm ? 1 : 0] : null;
      
      // Per-chain error capture
      const evmError = canClaimEvm && !evmResult?.success ? (evmResult?.error || 'EVM claim failed') : null;
      const svmError = canClaimSvm && !svmResult?.success ? (svmResult?.error || 'SVM claim failed') : null;
      
      // If both chains failed, show detailed error and abort
      if (evmError && svmError) {
        throw new Error(`EVM: ${evmError}; SVM: ${svmError}`);
      }
      
      // Build receipt with partial success allowed
      const nextReceipt: ClaimReceipt = {
        evmClaimed: evmResult?.amount || evmPreview?.claimableAmount || 0,
        svmClaimed: svmResult?.amount || svmPreview?.claimableAmount || 0,
        totalClaimed: (evmResult?.amount || evmPreview?.claimableAmount || 0) + 
                      (svmResult?.amount || svmPreview?.claimableAmount || 0),
        cashbackAmount: (evmPreview?.userCashback || 0) + (svmPreview?.userCashback || 0),
        commissions: (evmPreview?.claimableAmount || 0) - (evmPreview?.userCashback || 0) +
                     (svmPreview?.claimableAmount || 0) - (svmPreview?.userCashback || 0),
        evmTreasuryBalance: evmPreview?.evmTreasuryTotal || 0,
        svmTreasuryBalance: svmPreview?.svmTreasuryTotal || 0,
        totalTreasury: (evmPreview?.evmTreasuryTotal || 0) + (svmPreview?.svmTreasuryTotal || 0),
      };
      
      // Fetch contract addresses to build explorer links (best-effort)
      try {
        const [evmStatus, svmStatus] = await Promise.all([
          fetch(`/api/merkle/contract-status/EVM/XP`, { credentials: 'include' }).then(r => r.ok ? r.json() : null),
          fetch(`/api/merkle/contract-status/SVM/XP`, { credentials: 'include' }).then(r => r.ok ? r.json() : null),
        ]);
        
        if (evmStatus?.contractAddress) {
          // Arbitrum Sepolia explorer
          nextReceipt.evmExplorerUrl = `https://sepolia.arbiscan.io/address/${evmStatus.contractAddress}`;
        }
        if (svmStatus?.contractAddress) {
          // Solana devnet explorer (program or state address)
          nextReceipt.svmExplorerUrl = `https://explorer.solana.com/address/${svmStatus.contractAddress}?cluster=devnet`;
        }
      } catch {}

      setReceipt(nextReceipt);

      setStep('success');
      setRevealedWords(0);
      
      // Immediately refresh dashboard data after successful claim
      // This ensures the unclaimed XP updates even while the modal is still open
      if (onClaimSuccess) {
        setTimeout(() => {
          onClaimSuccess(); // Refresh dashboard without closing modal
        }, 500); // Small delay to ensure claim is fully processed in DB
      }
    } catch (e: any) {
      setError(e.message);
      setStep('preview');
    }
  };

  const handleClose = () => {
    setStep('preview');
    setRevealedWords(0);
    onClose();
  };

  useEffect(() => {
    if (step === 'success' && revealeWords < 50) {
      const timer = setTimeout(() => setRevealedWords(revealeWords + 1), 80);
      return () => clearTimeout(timer);
    }
  }, [step, revealeWords]);

  if (!isOpen || !mounted) return null;

  const totalClaimable = (evmPreview?.claimableAmount || 0) + (svmPreview?.claimableAmount || 0);
  const canClaim = totalClaimable > 0;
  const totalCashback = (evmPreview?.userCashback || 0) + (svmPreview?.userCashback || 0);
  const totalCommissions = totalClaimable - totalCashback;

  const modalContent = (
    <div 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        zIndex: 9999, 
        padding: '16px',
        background: 'rgba(0, 0, 0, 0.8)', 
        backdropFilter: 'blur(8px)' 
      }}
    >
      {/* Modal Card */}
      <div 
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '32rem',
          background: '#0f172a',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), inset 0 0 0 1px rgba(99, 102, 241, 0.3)',
          overflow: 'hidden',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Gradient Glow */}
        <div style={{
          position: 'absolute',
          inset: '-2px',
          background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
          opacity: 0.25,
          filter: 'blur(20px)',
          zIndex: -1,
        }}></div>

        {/* Content Container */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
          
          {/* Preview Step */}
          {step === 'preview' && (
            <div style={{ padding: '32px', overflowY: 'auto' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <svg style={{ width: '24px', height: '24px', color: 'white' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white', margin: 0 }}>
                    Claim XP
                  </h2>
                </div>
                <button
                  onClick={handleClose}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#94a3b8',
                    fontSize: '24px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.color = '#94a3b8';
                  }}
                >
                  ×
                </button>
              </div>

              {/* Loading State */}
              {loading && (
                <div style={{ textAlign: 'center', padding: '48px 0' }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    border: '4px solid rgba(99, 102, 241, 0.2)',
                    borderTopColor: '#6366f1',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 24px',
                  }}></div>
                  <p style={{ color: '#94a3b8', fontSize: '15px', fontWeight: 500 }}>Loading claim details...</p>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div style={{
                  padding: '16px 20px',
                  borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  marginBottom: '24px',
                }}>
                  <p style={{ color: '#ef4444', fontSize: '14px', margin: 0 }}>{error}</p>
                </div>
              )}

              {/* Preview Content */}
              {!loading && evmPreview && svmPreview && (
                <>
                  {(!canClaim && (evmPreview.message || svmPreview.message)) && (
                    <div style={{
                      padding: '16px 20px',
                      borderRadius: '12px',
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      marginBottom: '24px',
                    }}>
                      <p style={{ color: '#f59e0b', fontSize: '14px', margin: 0 }}>
                        {evmPreview.message || svmPreview.message}
                      </p>
                    </div>
                  )}

                  {/* Total Claimable Amount */}
                  <div style={{
                    padding: '32px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    marginBottom: '24px',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(45deg, transparent 30%, rgba(236, 72, 153, 0.3) 100%)',
                    }}></div>
                    <div style={{ position: 'relative', textAlign: 'center' }}>
                      <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '12px', fontWeight: 500 }}>
                        Total Available
                      </p>
                      <p style={{ fontSize: '56px', fontWeight: 800, color: 'white', margin: '0 0 8px 0', lineHeight: 1 }}>
                        {totalClaimable}
                      </p>
                      <p style={{ fontSize: '18px', color: 'rgba(255, 255, 255, 0.8)', margin: 0, fontWeight: 600 }}>
                        XP (EVM + SVM)
                      </p>
                    </div>
                  </div>

                  {/* Chain Breakdown */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '16px',
                    marginBottom: '24px',
                  }}>
                    <div style={{
                      padding: '20px',
                      borderRadius: '12px',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(99, 102, 241, 0.2)',
                    }}>
                      <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px', fontWeight: 500 }}>EVM Chain</p>
                      <p style={{ fontSize: '20px', fontWeight: 700, color: 'white', margin: 0 }}>{evmPreview.claimableAmount} XP</p>
                    </div>
                    <div style={{
                      padding: '20px',
                      borderRadius: '12px',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(168, 85, 247, 0.2)',
                    }}>
                      <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px', fontWeight: 500 }}>SVM Chain</p>
                      <p style={{ fontSize: '20px', fontWeight: 700, color: 'white', margin: 0 }}>{svmPreview.claimableAmount} XP</p>
                    </div>
                  </div>

                  {/* Earnings Breakdown */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '16px',
                    marginBottom: '24px',
                  }}>
                    <div style={{
                      padding: '20px',
                      borderRadius: '12px',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(148, 163, 184, 0.1)',
                    }}>
                      <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px', fontWeight: 500 }}>Cashback Earnings</p>
                      <p style={{ fontSize: '20px', fontWeight: 700, color: 'white', margin: 0 }}>{totalCashback} XP</p>
                    </div>
                    <div style={{
                      padding: '20px',
                      borderRadius: '12px',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(148, 163, 184, 0.1)',
                    }}>
                      <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px', fontWeight: 500 }}>Commission Earnings</p>
                      <p style={{ fontSize: '20px', fontWeight: 700, color: 'white', margin: 0 }}>{totalCommissions} XP</p>
                    </div>
                  </div>

                  {/* Treasury Status */}
                  <div style={{
                    padding: '24px',
                    borderRadius: '14px',
                    background: 'rgba(15, 23, 42, 0.4)',
                    border: '1px solid rgba(148, 163, 184, 0.15)',
                    marginBottom: '32px',
                  }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'white', marginBottom: '20px' }}>
                      Treasury Status
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 500 }}>EVM Treasury</span>
                        <span style={{ color: 'white', fontSize: '16px', fontWeight: 700 }}>{evmPreview.evmTreasuryTotal.toLocaleString()} XP</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 500 }}>SVM Treasury</span>
                        <span style={{ color: 'white', fontSize: '16px', fontWeight: 700 }}>{svmPreview.svmTreasuryTotal.toLocaleString()} XP</span>
                      </div>
                      <div style={{ height: '1px', background: 'rgba(148, 163, 184, 0.2)', margin: '6px 0' }}></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#a78bfa', fontSize: '15px', fontWeight: 600 }}>Total Treasury</span>
                        <span style={{ color: '#a78bfa', fontSize: '18px', fontWeight: 800 }}>
                          {((evmPreview.evmTreasuryTotal || 0) + (svmPreview.svmTreasuryTotal || 0)).toLocaleString()} XP
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={handleClose}
                      style={{
                        flex: 1,
                        padding: '16px 24px',
                        borderRadius: '12px',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        background: 'rgba(15, 23, 42, 0.5)',
                        color: 'white',
                        fontSize: '16px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(15, 23, 42, 0.8)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(15, 23, 42, 0.5)'}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleClaim}
                      disabled={!canClaim}
                      style={{
                        flex: 1,
                        padding: '16px 24px',
                        borderRadius: '12px',
                        border: 'none',
                        background: canClaim ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'rgba(148, 163, 184, 0.3)',
                        color: 'white',
                        fontSize: '16px',
                        fontWeight: 700,
                        cursor: canClaim ? 'pointer' : 'not-allowed',
                        opacity: canClaim ? 1 : 0.5,
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (canClaim) e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      {canClaim ? 'Confirm Claim' : 'No Balance'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Confirming Step */}
          {step === 'confirming' && (
            <div style={{ padding: '64px 32px', textAlign: 'center' }}>
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: '32px' }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  border: '5px solid rgba(99, 102, 241, 0.2)',
                  borderTopColor: '#6366f1',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}></div>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 70%)',
                  filter: 'blur(10px)',
                }}></div>
              </div>
              <h3 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '12px' }}>
                Processing Claim...
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '15px' }}>Please wait while we process your claim</p>
            </div>
          )}

          {/* Success Step */}
          {step === 'success' && receipt && (
            <div style={{ padding: '32px' }}>
              {/* Success Icon */}
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div style={{
                  width: '96px',
                  height: '96px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '3px solid #10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                  animation: 'scaleIn 0.5s ease-out',
                }}>
                  <svg style={{ width: '48px', height: '48px', color: '#10b981' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>

              {/* Receipt */}
              <div style={{
                padding: '28px',
                borderRadius: '14px',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                marginBottom: '24px',
              }}>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: '#10b981',
                  marginBottom: '24px',
                  textAlign: 'center',
                  opacity: revealeWords > 0 ? 1 : 0,
                  transition: 'opacity 0.3s',
                }}>
                  ✓ Claim Successful
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    opacity: revealeWords > 2 ? 1 : 0,
                    transition: 'opacity 0.3s',
                  }}>
                    <span style={{ color: '#94a3b8', fontSize: '14px' }}>Total Claimed</span>
                    <span style={{ color: 'white', fontSize: '16px', fontWeight: 700 }}>{receipt.totalClaimed} XP</span>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    opacity: revealeWords > 4 ? 1 : 0,
                    transition: 'opacity 0.3s',
                  }}>
                    <span style={{ color: '#94a3b8', fontSize: '13px', paddingLeft: '12px' }}>• EVM Chain</span>
                    <span style={{ color: 'white', fontSize: '14px', fontWeight: 600 }}>{receipt.evmClaimed} XP</span>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    opacity: revealeWords > 6 ? 1 : 0,
                    transition: 'opacity 0.3s',
                  }}>
                    <span style={{ color: '#94a3b8', fontSize: '13px', paddingLeft: '12px' }}>• SVM Chain</span>
                    <span style={{ color: 'white', fontSize: '14px', fontWeight: 600 }}>{receipt.svmClaimed} XP</span>
                  </div>
                  
                  <div style={{ height: '1px', background: 'rgba(148, 163, 184, 0.2)', margin: '8px 0' }}></div>
                  
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    opacity: revealeWords > 8 ? 1 : 0,
                    transition: 'opacity 0.3s',
                  }}>
                    <span style={{ color: '#94a3b8', fontSize: '14px' }}>Cashback</span>
                    <span style={{ color: 'white', fontSize: '16px', fontWeight: 700 }}>{receipt.cashbackAmount} XP</span>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    opacity: revealeWords > 10 ? 1 : 0,
                    transition: 'opacity 0.3s',
                  }}>
                    <span style={{ color: '#94a3b8', fontSize: '14px' }}>Commissions</span>
                    <span style={{ color: 'white', fontSize: '16px', fontWeight: 700 }}>{receipt.commissions} XP</span>
                  </div>
                  
                  <div style={{ height: '1px', background: 'rgba(148, 163, 184, 0.2)', margin: '8px 0' }}></div>
                  
                  <div style={{
                    opacity: revealeWords > 12 ? 1 : 0,
                    transition: 'opacity 0.3s',
                  }}>
                    <p style={{ color: '#a78bfa', fontSize: '13px', marginBottom: '12px', fontWeight: 600 }}>Treasury Balances</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: '#94a3b8', fontSize: '13px' }}>EVM Treasury</span>
                      <span style={{ color: 'white', fontSize: '14px', fontWeight: 600 }}>{receipt.evmTreasuryBalance.toLocaleString()} XP</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: '#94a3b8', fontSize: '13px' }}>SVM Treasury</span>
                      <span style={{ color: 'white', fontSize: '14px', fontWeight: 600 }}>{receipt.svmTreasuryBalance.toLocaleString()} XP</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid rgba(148, 163, 184, 0.2)' }}>
                      <span style={{ color: '#a78bfa', fontSize: '14px', fontWeight: 600 }}>Total Treasury</span>
                      <span style={{ color: '#a78bfa', fontSize: '15px', fontWeight: 700 }}>{receipt.totalTreasury.toLocaleString()} XP</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Explorer Links */}
              {(receipt.evmExplorerUrl || receipt.svmExplorerUrl) && (
                <div style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: 'rgba(15, 23, 42, 0.5)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  marginBottom: '20px',
                }}>
                  <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 8px 0' }}>Contracts</p>
                  {receipt.evmExplorerUrl && (
                    <a href={receipt.evmExplorerUrl} target="_blank" rel="noreferrer" style={{
                      display: 'block', color: '#60a5fa', fontSize: '14px', textDecoration: 'underline', marginBottom: '6px'
                    }}>
                      View EVM contract on Arbiscan
                    </a>
                  )}
                  {receipt.svmExplorerUrl && (
                    <a href={receipt.svmExplorerUrl} target="_blank" rel="noreferrer" style={{
                      display: 'block', color: '#60a5fa', fontSize: '14px', textDecoration: 'underline'
                    }}>
                      View SVM address on Solana Explorer
                    </a>
                  )}
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={handleClose}
                style={{
                  width: '100%',
                  padding: '16px 24px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Inline Animations */}
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes scaleIn {
          from {
            transform: scale(0.5);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );

  return createPortal(modalContent, document.body);
}
