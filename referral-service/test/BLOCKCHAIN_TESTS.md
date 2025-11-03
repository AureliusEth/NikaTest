# Blockchain Integration Tests

## Overview

Comprehensive integration tests for blockchain-related functionality, including:
- Treasury balance tracking
- Merkle root generation
- Merkle proof generation
- Claim flow (simulated XP)
- Contract status checks
- On-chain merkle root updates
- End-to-end flow

## Test File

**Location:** `test/blockchain.integration.spec.ts`

## Test Structure

### Mock Setup

The tests mock the blockchain services (`EvmBlockchainService` and `SvmBlockchainService`) to avoid requiring actual blockchain connections:

```typescript
const mockEvmService = {
  initialize: jest.fn(),
  isInitialized: jest.fn().mockReturnValue(true),
  updateMerkleRoot: jest.fn().mockResolvedValue('0xMockTxHash'),
  getMerkleRoot: jest.fn(),
  getMerkleRootVersion: jest.fn(),
  verifyProof: jest.fn().mockResolvedValue(true),
  getSignerAddress: jest.fn().mockReturnValue('0xMockSigner'),
};
```

### Test Suites

#### 1. Treasury Balance Tracking
- ✅ Tracks treasury balance when processing trade
- ✅ Accumulates treasury balance across multiple trades
- ✅ Tracks treasury separately for EVM and SVM chains

#### 2. Merkle Root Generation
- ✅ Generates merkle root for EVM chain
- ✅ Generates merkle root for SVM chain
- ✅ Increments version for each new root
- ✅ Includes claimable balances only (excludes treasury)

#### 3. Merkle Proof Generation
- ✅ Generates proof for user with claimable balance
- ✅ Returns error for user with no claimable balance

#### 4. Claim Flow (Simulated XP)
- ✅ Claims XP successfully (simulated)
- ✅ Prevents duplicate claims for same merkle version
- ✅ Allows claim after new merkle root is generated

#### 5. Contract Status Checks
- ✅ Checks contract status when initialized
- ✅ Returns error when contract not initialized

#### 6. On-Chain Merkle Root Updates
- ✅ Updates merkle root on-chain for EVM
- ✅ Updates merkle root on-chain for SVM
- ✅ Returns error when blockchain service not initialized

#### 7. Treasury Transfer
- ✅ Transfers treasury funds (simulated)
- ✅ Returns error when no treasury funds to transfer

#### 8. End-to-End Flow
- ✅ Completes full flow: trade → treasury → merkle → claim

## Running Tests

```bash
cd referral-service
npm run test:e2e -- blockchain.integration.spec.ts
```

Or run all E2E tests:

```bash
npm run test:e2e
```

## Authentication

Tests use session-based authentication via `AuthService`:

```typescript
async function createSessionCookie(userId: string): Promise<string> {
  const token = await authService.createSession(userId);
  return token;
}

// Usage in tests
const sessionToken = await createSessionCookie('USER_001');
await request(app.getHttpServer())
  .post('/api/merkle/claim/EVM/XP')
  .set('Cookie', `session=${sessionToken}`)
  .expect(201);
```

## Database Cleanup

Each test cleans up the database before running:

```typescript
beforeEach(async () => {
  await prisma.claimRecord.deleteMany();
  await prisma.treasuryAccount.deleteMany();
  await prisma.merkleRoot.deleteMany();
  await prisma.commissionLedgerEntry.deleteMany();
  await prisma.trade.deleteMany();
  await prisma.referralLink.deleteMany();
  await prisma.idempotencyKey.deleteMany();
  await prisma.user.deleteMany();
  
  jest.clearAllMocks();
});
```

## Mock Verification

The tests verify that mocked blockchain services are called correctly:

```typescript
expect(mockEvmService.updateMerkleRoot).toHaveBeenCalledTimes(1);
expect(mockEvmService.updateMerkleRoot).toHaveBeenCalledWith(
  '0x1234567890123456789012345678901234567890',
  expect.stringMatching(/^0x[a-f0-9]{64}$/)
);
```

## Coverage

These tests cover:
- ✅ Database interactions (Prisma)
- ✅ Business logic (ClaimService, MerkleTreeService)
- ✅ API endpoints (MerkleController)
- ✅ Blockchain service integration (mocked)
- ✅ Session authentication
- ✅ Error handling
- ✅ Edge cases (duplicate claims, missing balances)

## Future Enhancements

When real tokens are added:
1. Update mocks to simulate actual transaction failures
2. Add tests for gas estimation
3. Add tests for transaction confirmation waiting
4. Add tests for network error handling
5. Add tests for contract reorg scenarios

