# Simulated XP Claim Flow

## Overview

Since XP is **simulated** (tracked in database, not real tokens), we don't need wallet connections or on-chain transactions. The merkle root contract is used for **verification/proof only**, not for actual token transfers.

## Simplified Flow

1. **User logs in** → Session cookie created
2. **User clicks claim** → Backend verifies proof off-chain
3. **Backend records claim** → Database updated
4. **Done!** → No wallet needed, no transactions needed

## Implementation

### Backend Endpoint

```
POST /api/merkle/claim/:chain/:token
→ Verifies proof off-chain
→ Records claim in database
→ Returns: { success: true, claimId: "..." }
```

### Frontend Usage

```tsx
import { ClaimButton } from '@/components/ClaimButton';

// No wallet connection needed!
<ClaimButton chain="EVM" token="XP" />
```

### How It Works

1. **Merkle Root Contract** - Used for verification/proof only
   - Stores merkle root for proof verification
   - Can verify proofs on-chain if needed
   - But doesn't transfer tokens (XP is simulated)

2. **Backend Verification** - Off-chain proof verification
   - Generates merkle proof from database
   - Verifies proof against stored root
   - Records claim in `ClaimRecord` table

3. **XP Tracking** - Database-only
   - XP amounts tracked in `CommissionLedgerEntry`
   - Claims tracked in `ClaimRecord`
   - No actual token transfers needed

## Benefits

✅ **No wallet connection needed** - Much simpler UX  
✅ **Instant claims** - No waiting for blockchain confirmations  
✅ **No gas fees** - Everything is off-chain  
✅ **Backend controls everything** - Simple session-based auth  

## When Real Tokens Are Added

If you later want to add real token transfers:
1. Update contracts to include token transfer logic
2. Add wallet connection back to frontend
3. Call contract's `claim()` function after proof verification
4. Record transaction hash in `ClaimRecord.txHash`

For now, XP is simulated and tracked entirely in the database!

