# Merkle Root Update Frequency & Claim Implementation

## Merkle Root Update Frequency

**Current Implementation:** Merkle roots are updated **every hour** by default via a scheduled task.

### Configuration

The update frequency can be configured via environment variable:

```env
# Default: Every hour (CronExpression.EVERY_HOUR)
MERKLE_UPDATE_INTERVAL_CRON="0 * * * *"

# Examples:
# Every 30 minutes: "*/30 * * * *"
# Every 6 hours: "0 */6 * * *"
# Daily at midnight: "0 0 * * *"
```

### Automatic On-Chain Updates

To enable automatic on-chain updates after generating roots:

```env
AUTO_UPDATE_MERKLE_ROOTS=true
```

If disabled (default), roots are generated but must be manually submitted to contracts.

## Claim Implementation

### How It Works

1. **User clicks claim button** → Frontend calls `/api/merkle/claim/:chain/:token`
2. **Backend verifies proof** → Checks merkle proof on-chain
3. **Backend transfers XP** → Calls contract's `claim()` function
4. **Transaction recorded** → ClaimRecord created in database
5. **User receives XP** → Tokens transferred to user's wallet

### Treasury Tracking

- **Treasury balances** are tracked in `TreasuryAccount` table
- **Treasury amounts** accumulate as trades are processed
- **Treasury transfers** can be triggered via `/api/merkle/transfer-treasury/:chain/:token`

### Database Models

#### TreasuryAccount
```prisma
model TreasuryAccount {
  chain     String   // EVM or SVM
  token     String   // XP, USDC, etc.
  address   String   // Treasury wallet address
  balance   Decimal  // Total XP owed to treasury
  claimed   Decimal  // Amount already transferred
}
```

#### ClaimRecord
```prisma
model ClaimRecord {
  userId        String   // User who claimed
  chain         String   // EVM or SVM
  token         String   // XP, USDC, etc.
  amount        Decimal  // Amount claimed
  merkleVersion Int      // Version of merkle root used
  txHash        String?  // Transaction hash
}
```

## Frontend Usage

### Claim Button Component

```tsx
import { ClaimButton } from '@/components/ClaimButton';

<ClaimButton 
  chain="EVM" 
  token="XP" 
  userId="user123" 
/>
```

### Claim Hook

```tsx
import { useClaim } from '@/lib/use-claim';

const { claim, isClaiming, error, success, txHash, isConnected, connect } = useClaim('EVM', 'XP');

// Manual claim
await claim('user123');
```

## Contract Updates Required

### EVM Contract (`NikaTreasury.sol`)
- ✅ Added `claim()` function
- ✅ Added `claimed` mapping to prevent double claims
- ✅ Added token transfer functionality
- ✅ Added `Claimed` event

### SVM Contract (`nika_treasury.rs`)
- ✅ Added `claim()` function
- ✅ Added `claimed` HashSet to track claims
- ✅ Added token transfer via CPI
- ✅ Added `Claimed` event

## Environment Variables

```env
# Scheduled Tasks
MERKLE_UPDATE_INTERVAL_CRON="0 * * * *"  # Default: hourly
AUTO_UPDATE_MERKLE_ROOTS=false            # Auto-update on-chain

# Treasury Addresses
EVM_TREASURY_ADDRESS=0x...
SVM_TREASURY_ADDRESS=...

# Contract Addresses
EVM_XP_CONTRACT_ADDRESS=0x...
SVM_XP_CONTRACT_ADDRESS=...
```

## Next Steps

1. **Run migrations** to create `TreasuryAccount` and `ClaimRecord` tables
2. **Deploy updated contracts** with claim functions
3. **Fund contracts** with XP tokens
4. **Test claim flow** end-to-end
5. **Monitor treasury balances** and transfer periodically

