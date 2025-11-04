# Referral Service Test Suite

## Overview

This directory contains all tests for the referral service, organized by domain and test type. Tests serve as living documentation - each test file clearly explains what it tests and how the system works.

## Directory Structure

```
tests/
├── unit/                          # Fast, isolated unit tests
│   ├── domain/                    # Domain logic tests
│   │   ├── policies/              # Commission split policies
│   │   ├── services/              # Domain services (referral validation, etc.)
│   │   └── value-objects/         # Money, Percentage value objects
│   ├── application/               # Application service tests
│   └── infrastructure/            # Infrastructure service tests (merkle, etc.)
├── integration/                   # Integration tests (with DB, mocked blockchain)
│   ├── claims/                    # Claim flow tests
│   ├── referrals/                 # Referral registration and chains
│   ├── merkle/                    # Merkle root generation and verification
│   ├── blockchain/                # Blockchain service integration
│   └── repositories/              # Repository tests
├── contracts/                     # Smart contract integration tests
│   ├── evm/                       # EVM (Ethereum/Arbitrum) contract tests
│   └── svm/                       # SVM (Solana) contract tests
├── e2e/                           # End-to-end API tests
└── coverage/                      # Test coverage reports

```

## Running Tests

### All Tests
```bash
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run test:cov            # With coverage report
```

### Unit Tests
```bash
npm run test:unit                    # All unit tests
npm run test:unit:domain             # Domain layer only
npm run test:unit:domain:policies    # Commission policies
npm run test:unit:domain:services    # Domain services
npm run test:unit:domain:values      # Value objects
npm run test:unit:app                # Application services
npm run test:unit:infra              # Infrastructure services
```

### Integration Tests
```bash
npm run test:integration             # All integration tests
npm run test:integration:claims      # Claim flow tests
npm run test:integration:referrals   # Referral tests
npm run test:integration:merkle      # Merkle tree tests
npm run test:integration:blockchain  # Blockchain integration
npm run test:integration:repos       # Repository tests
```

### Contract Tests
```bash
npm run test:contracts               # Both EVM and SVM
npm run test:contracts:evm           # EVM contracts only (Foundry)
npm run test:contracts:svm           # SVM contracts only (Anchor)
```

### E2E Tests
```bash
npm run test:e2e                     # End-to-end API tests
npm run test:all                     # Unit + Integration
npm run test:all:verbose             # Unit + Integration + E2E
```

## Test Writing Guidelines

### 1. Tests as Documentation

Every test file must have:
- **File-level JSDoc** explaining what's being tested and why
- **Business rules** documented
- **Integration points** explained
- **Example data** that illustrates real scenarios

Example:
```typescript
/**
 * Commission Policy Tests
 * 
 * PURPOSE:
 * Tests how trade fees are split between cashback, referral commissions, and treasury.
 * 
 * BUSINESS RULES:
 * - Cashback: User-specific rate (default 10%)
 * - Level 1 (direct referrer): 30%
 * - Level 2: 3%
 * - Level 3: 2%
 * - Treasury: Remainder (~55%)
 * 
 * EDGE CASES:
 * - Users with no referrer
 * - Partial referral chains
 * - Zero cashback rate
 */
```

### 2. Test Structure

Use Arrange-Act-Assert pattern:
```typescript
it('should split 100 XP fee correctly for full referral chain', () => {
  // Arrange: User has 3-level referral chain and 10% cashback
  const fee = 100;
  const context = { /* ... */ };

  // Act: Calculate splits
  const splits = policy.calculateSplits(fee, context);

  // Assert: Verify each beneficiary gets correct amount
  expect(splits.find(s => s.level === 0).amount).toBeCloseTo(10);
  expect(splits.find(s => s.level === 1).amount).toBeCloseTo(30);
  // ...
});
```

### 3. Descriptive Test Names

Test names should read like sentences:
```typescript
✅ 'should split 100 XP fee correctly for user with full referral chain'
✅ 'should reject proof with wrong amount'
✅ 'should handle email with special characters'

❌ 'test splits'
❌ 'proof verification'
❌ 'edge case'
```

### 4. Test Independence

Each test should:
- Set up its own data
- Clean up after itself
- Not depend on other tests
- Be runnable in isolation

## Key Test Files

### Critical Path Tests

These tests cover the core business logic:

1. **Commission Policy** (`tests/unit/domain/policies/commission-policy.spec.ts`)
   - How trade fees are split
   - Cashback calculations
   - Multi-level referral commissions
   - Treasury allocation

2. **Merkle Tree** (`tests/unit/infrastructure/merkle-tree.spec.ts`)
   - keccak256 hashing (EVM compatible)
   - Tree generation and verification
   - Proof generation for claims
   - Edge cases (single leaf, large trees)

3. **Claim Flow** (`tests/integration/claims/claim-flow.spec.ts`)
   - Double-spend prevention
   - Partial claims
   - Multi-chain claims (EVM + SVM)
   - Merkle root versioning

### Contract Tests

4. **EVM Contract** (`tests/contracts/evm/NikaTreasury.integration.spec.ts`)
   - Root storage and updates
   - On-chain proof verification
   - String parameter handling (userId, token, amount)
   - Gas usage

5. **SVM Contract** (`tests/contracts/svm/nika-treasury.integration.spec.ts`)
   - State account initialization
   - Authority checks
   - keccak256 proof verification
   - Event emission

## Test Data

### Test Users

Common test user IDs used across tests:
- `test-user-a`, `test-user-b` - Generic users
- `user@example.com`, `user1@example.com` - Email-based IDs
- `MATTHEWPINNOCK.MP@GMAIL.COM` - Real user from integration tests

### Test Chains

- `EVM` - Ethereum/Arbitrum Sepolia
- `SVM` - Solana Devnet

### Test Tokens

- `XP` - Experience points (simulated, off-chain)
- `USDC` - Stablecoin (on-chain, future)
- `ETH` - Native token (on-chain, future)

## Coverage Goals

### Unit Tests
- **Target**: >90% coverage for critical paths
- Commission calculation
- Merkle tree generation
- Domain value objects

### Integration Tests
- **Target**: >80% coverage
- Full claim flow
- Referral registration
- Multi-chain operations

### Contract Tests
- **Target**: All critical functions tested
- Root updates
- Proof verification
- Authority controls

## CI/CD Integration

Tests run automatically on:
- Pull request creation
- Push to main branch
- Pre-deployment validation

### Fast Feedback Loop
```bash
npm run test:unit          # < 5 seconds
npm run test:integration   # < 30 seconds
npm run test:all           # < 2 minutes
```

## Debugging Tests

### Run Single Test File
```bash
npm test -- tests/unit/domain/policies/commission-policy.spec.ts
```

### Run Single Test Case
```bash
npm test -- -t "should split 100 XP fee correctly"
```

### Debug Mode
```bash
npm run test:debug
# Then attach debugger to localhost:9229
```

### Verbose Output
```bash
npm test -- --verbose
```

## Common Issues

### Jest Configuration

If tests aren't found:
1. Check `roots` in `package.json` includes `<rootDir>/tests`
2. Verify file names match `*.spec.ts` pattern
3. Clear Jest cache: `npm test -- --clearCache`

### Import Paths

Use absolute imports from `src/`:
```typescript
// ✅ Good
import { MerkleTreeService } from '../../../src/infrastructure/services/merkle-tree.service';

// ❌ Avoid relative paths that go too deep
import { MerkleTreeService } from '../../../../../../src/infrastructure/services/merkle-tree.service';
```

### Database State

Integration tests use the actual Prisma database. If tests fail with data conflicts:
```bash
# Reset database
npx prisma migrate reset --force
npx prisma generate
```

### Contract Tests

Contract tests require:
- **EVM**: Local Anvil node or deployed contracts
- **SVM**: Local Solana validator or devnet

Set environment variables:
```bash
# For EVM tests
export EVM_TEST_RPC_URL=http://localhost:8545
export EVM_TEST_PRIVATE_KEY=0x...
export EVM_XP_CONTRACT_ADDRESS=0x...

# For SVM tests
export SVM_TEST_ENABLED=true
export SVM_RPC_URL=http://localhost:8899
```

## Contributing

When adding new tests:
1. Follow the existing structure
2. Add comprehensive JSDoc documentation
3. Use descriptive test names
4. Include edge cases
5. Update this README if adding new categories

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Testing Best Practices](https://testingjavascript.com/)
- [TDD Principles](https://martinfowler.com/bliki/TestDrivenDevelopment.html)

