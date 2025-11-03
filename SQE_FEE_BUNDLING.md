# SQE Fee Bundling & Treasury Tracking

**Date:** November 3, 2025  
**Status:** ✅ Implemented

---

## Overview

The SQE (Spot Mechanism) fee bundling system splits trading fees into three destinations:
1. **Treasury** - Direct to Nika treasury (remainder after cashback + commissions)
2. **Cashback** - Returns to the trader (configurable per user)
3. **Referral Commissions** - Distributed to the referral chain (up to 3 levels)

Cashback and commissions are tracked in a **merkle root smart contract** for user claims, while treasury funds go directly to Nika.

---

## Fee Split Breakdown

### Example: 100 USDC Fee with 10% Cashback

| Destination | Beneficiary | Level | Rate | Amount | Goes To |
|------------|-------------|-------|------|--------|---------|
| **Claimable** | Trader | 0 (cashback) | 10% | 10 USDC | Smart Contract |
| **Claimable** | Referrer L1 | 1 | 30% | 30 USDC | Smart Contract |
| **Claimable** | Referrer L2 | 2 | 3% | 3 USDC | Smart Contract |
| **Claimable** | Referrer L3 | 3 | 2% | 2 USDC | Smart Contract |
| **Treasury** | NIKA_TREASURY | -1 | 55% | 55 USDC | Nika Direct |
| **TOTAL** | | | 100% | **100 USDC** | |

---

## Architecture

### 1. Commission Policy (Domain Layer)

```typescript
// src/domain/policies/commission-policy.ts

export interface Split {
  beneficiaryId: string;
  level: number; // -1 = treasury; 0 = cashback; 1-3 = upline levels
  rate: number; // fraction 0..1 (e.g., 0.30 = 30%)
  amount: number; // calculated commission amount
  token: string; // token type (e.g., 'XP', 'USDC')
  destination: 'treasury' | 'claimable'; // Where funds go
}

export interface CommissionContext {
  userId: string;
  userCashbackRate: number; // User's cashback rate (0..1)
  ancestors: string[]; // Upline referrers (closest first, up to 3)
  token?: string; // Token type (defaults to 'XP')
  chain?: 'EVM' | 'SVM'; // EVM (Arbitrum) or SVM (Solana)
}
```

### 2. Default Policy Implementation

```typescript
// src/infrastructure/policies/default-policy.ts

export class DefaultPolicy implements CommissionPolicy {
  private readonly uplineRates = [0.30, 0.03, 0.02]; // Level 1, 2, 3
  private readonly TREASURY_BENEFICIARY = 'NIKA_TREASURY';

  calculateSplits(tradeFee: number, ctx: CommissionContext): Split[] {
    const splits: Split[] = [];
    let claimableTotal = 0;

    // 1. User cashback (level 0) - Goes to claimable contract
    if (ctx.userCashbackRate > 0) {
      const amount = tradeFee * ctx.userCashbackRate;
      splits.push({
        beneficiaryId: ctx.userId,
        level: 0,
        rate: ctx.userCashbackRate,
        amount,
        token: ctx.token ?? 'XP',
        destination: 'claimable',
      });
      claimableTotal += amount;
    }

    // 2. Upline commissions (levels 1-3) - Goes to claimable contract
    for (let i = 0; i < this.uplineRates.length; i++) {
      const ancestorId = ctx.ancestors[i];
      if (!ancestorId) break;

      const rate = this.uplineRates[i];
      const amount = tradeFee * rate;
      splits.push({
        beneficiaryId: ancestorId,
        level: i + 1,
        rate,
        amount,
        token: ctx.token ?? 'XP',
        destination: 'claimable',
      });
      claimableTotal += amount;
    }

    // 3. Treasury split (remainder) - Goes directly to Nika treasury
    const treasuryAmount = tradeFee - claimableTotal;
    if (treasuryAmount > 0) {
      const treasuryRate = treasuryAmount / tradeFee;
      splits.push({
        beneficiaryId: this.TREASURY_BENEFICIARY,
        level: -1,
        rate: treasuryRate,
        amount: treasuryAmount,
        token: ctx.token ?? 'XP',
        destination: 'treasury',
      });
    }

    return splits;
  }
}
```

### 3. Fee Bundling Service

```typescript
// src/domain/services/fee-bundling.service.ts

export interface FeeBundle {
  destination: 'treasury' | 'claimable';
  chain: 'EVM' | 'SVM';
  token: string;
  totalAmount: number;
  splits: Split[];
  contractAddress?: string; // Smart contract address for claimable funds
}
```

The bundling service groups splits by destination for efficient transfer:

```typescript
// Example output
[
  {
    destination: 'claimable',
    chain: 'EVM',
    token: 'USDC',
    totalAmount: 45,
    contractAddress: '0x...',
    splits: [/* cashback + commissions */]
  },
  {
    destination: 'treasury',
    chain: 'EVM',
    token: 'USDC',
    totalAmount: 55,
    splits: [/* treasury split */]
  }
]
```

### 4. Database Schema

```sql
-- Trade table tracks which chain the trade happened on
CREATE TABLE "Trade" (
  id         TEXT PRIMARY KEY,
  "userId"   TEXT NOT NULL,
  "feeAmount" DECIMAL(18, 8) NOT NULL,
  chain      TEXT DEFAULT 'EVM', -- EVM (Arbitrum) or SVM (Solana)
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Ledger tracks all splits including treasury
CREATE TABLE "CommissionLedgerEntry" (
  id              TEXT PRIMARY KEY,
  "beneficiaryId" TEXT NOT NULL,
  "sourceTradeId" TEXT NOT NULL,
  level           INTEGER NOT NULL, -- -1 = treasury; 0 = cashback; 1-3 = uplines
  rate            DECIMAL(5, 4) NOT NULL,
  amount          DECIMAL(18, 8) NOT NULL,
  token           TEXT DEFAULT 'XP',
  destination     TEXT DEFAULT 'claimable', -- 'treasury' or 'claimable'
  "createdAt"     TIMESTAMP DEFAULT NOW(),
  
  UNIQUE ("beneficiaryId", "sourceTradeId", level)
);

CREATE INDEX idx_destination_token ON "CommissionLedgerEntry"(destination, token);
```

---

## Smart Contract Integration Points

### Contract Addresses (Configurable)

```typescript
// src/infrastructure/services/fee-bundling.service.ts

private readonly CONTRACT_ADDRESSES = {
  EVM: {
    XP: '0x0000000000000000000000000000000000000000', // Arbitrum XP contract
    USDC: '0x0000000000000000000000000000000000000000', // Arbitrum USDC contract
  },
  SVM: {
    XP: '11111111111111111111111111111111', // Solana XP contract
    USDC: '11111111111111111111111111111111', // Solana USDC contract
  },
};
```

### Integration Flow

```
Trade Execution
     ↓
Commission Calculation
     ↓
Split Generation (with destination)
     ↓
Fee Bundling
     ├─→ Treasury Bundle → Direct transfer to Nika treasury
     └─→ Claimable Bundle → Transfer to merkle root smart contract
                                 ↓
                            Update merkle root
                                 ↓
                            Users can claim their shares
```

---

## API Usage

### Process a Trade

```typescript
POST /api/trades/mock

{
  "tradeId": "trade_123",
  "userId": "user_abc",
  "feeAmount": 100,
  "token": "USDC",
  "chain": "EVM" // or "SVM"
}
```

### Query Treasury Totals

```sql
SELECT 
  SUM(amount) as total_treasury,
  token,
  COUNT(*) as trade_count
FROM "CommissionLedgerEntry"
WHERE destination = 'treasury'
GROUP BY token;
```

### Query Claimable Totals by User

```sql
SELECT 
  "beneficiaryId",
  SUM(amount) as claimable_total,
  token
FROM "CommissionLedgerEntry"
WHERE destination = 'claimable'
GROUP BY "beneficiaryId", token;
```

---

## Treasury Tracking

### Real-Time Treasury Balance

```typescript
// Get total treasury earnings
const treasuryTotal = await prisma.commissionLedgerEntry.aggregate({
  where: {
    destination: 'treasury',
    token: 'USDC',
  },
  _sum: {
    amount: true,
  },
});

console.log(`Treasury: ${treasuryTotal._sum.amount} USDC`);
```

### Treasury Breakdown by Chain

```typescript
// Get treasury by chain
const treasuryByChain = await prisma.$queryRaw`
  SELECT 
    t.chain,
    l.token,
    SUM(l.amount)::text as total
  FROM "CommissionLedgerEntry" l
  INNER JOIN "Trade" t ON l."sourceTradeId" = t.id
  WHERE l.destination = 'treasury'
  GROUP BY t.chain, l.token
`;
```

---

## Production Considerations

### 1. ✅ Implemented
- [x] Treasury split calculation
- [x] Chain type tracking (EVM vs SVM)
- [x] Destination tracking (treasury vs claimable)
- [x] Fee bundling service with contract addresses
- [x] Database indexes for efficient queries
- [x] Cryptographically secure referral codes

### 2. ⚠️ TODOs for Smart Contract Integration
- [ ] Replace placeholder contract addresses with real deployed addresses
- [ ] Implement merkle root generation for claimable funds
- [ ] Add claiming contract interface (out of scope for this test)
- [ ] Add on-chain verification of claims
- [ ] Implement automated treasury withdrawal mechanism

### 3. 🔧 Configuration
Smart contract addresses should be configured via environment variables:

```env
# .env
EVM_XP_CONTRACT=0x...
EVM_USDC_CONTRACT=0x...
SVM_XP_CONTRACT=...
SVM_USDC_CONTRACT=...
```

---

## Testing

### Example Test: Complete Fee Distribution

```typescript
it('should split fees into treasury + claimable correctly', async () => {
  const fee = 100;
  const cashback = 0.10; // 10%
  
  const splits = policy.calculateSplits(fee, {
    userId: 'trader',
    userCashbackRate: cashback,
    ancestors: ['ref1', 'ref2', 'ref3'],
    token: 'USDC',
    chain: 'EVM',
  });
  
  // Verify split destinations
  const treasury = splits.find(s => s.destination === 'treasury');
  const claimable = splits.filter(s => s.destination === 'claimable');
  
  expect(treasury).toBeDefined();
  expect(treasury.amount).toBe(55); // 100 - 10 - 30 - 3 - 2 = 55
  expect(treasury.level).toBe(-1);
  
  const claimableTotal = claimable.reduce((sum, s) => sum + s.amount, 0);
  expect(claimableTotal).toBe(45); // 10 + 30 + 3 + 2 = 45
  
  // Verify total = 100%
  expect(treasury.amount + claimableTotal).toBe(fee);
});
```

---

## Summary

✅ **All SQE fee bundling requirements implemented:**

1. ✅ Fee split calculation (treasury + cashback + commissions)
2. ✅ Destination tracking (treasury vs claimable)
3. ✅ Chain type tracking (EVM vs SVM)
4. ✅ Smart contract address configuration
5. ✅ Fee bundling service for efficient transfers
6. ✅ Database schema with proper indexes
7. ✅ Treasury tracking and queries
8. ✅ XP tokens as crypto analogy (contract integration out of scope)

**The system is ready for smart contract integration once contracts are deployed.**

---

**Document Version:** 1.0  
**Last Updated:** November 3, 2025

