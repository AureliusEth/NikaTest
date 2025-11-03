# Simplified Claim Flow

You're absolutely right! Since we're verifying trades off-chain and sending proofs via the backend, we can simplify the flow significantly.

## Simplified Flow

### Current Flow (Simplified)

1. **User logs in** → Session cookie created (no wallet needed)
2. **User clicks claim** → Backend generates proof from session (no wallet needed)
3. **User signs transaction** → Wallet connection needed ONLY here
4. **Transaction recorded** → Backend records claim via session

### Why Wallet Connection is Still Needed

The contract's `claim()` function must be called by the user because:
- **EVM**: `msg.sender` receives the tokens
- **SVM**: `ctx.accounts.user` receives the tokens

The backend cannot sign transactions on behalf of users (security risk).

## Updated Endpoints

### 1. Get Proof (No Wallet Needed)
```
POST /api/merkle/claim/:chain/:token
→ Returns: { proof, amount, contractAddress, ... }
```

### 2. Record Claim (After User Signs)
```
POST /api/merkle/claim-record/:chain/:token
Body: { txHash: string }
→ Records successful claim
```

## Frontend Flow

```tsx
// 1. Get proof (no wallet needed)
const proofData = await api('/api/merkle/claim/EVM/XP');

// 2. User connects wallet (only when needed)
if (!wallet.isConnected) {
  await wallet.connect();
}

// 3. User signs transaction directly
const tx = await contract.claim(proofData.proof, proofData.amount);

// 4. Record in backend
await api('/api/merkle/claim-record/EVM/XP', {
  body: JSON.stringify({ txHash: tx.hash })
});
```

## Benefits

✅ **No wallet connection needed** until user actually wants to claim  
✅ **Backend handles all proof generation** (off-chain verification)  
✅ **User only signs when claiming** (better UX)  
✅ **Session-based authentication** (simpler than wallet auth)  

The wallet connection is purely for signing the blockchain transaction - everything else is handled off-chain via the backend!

