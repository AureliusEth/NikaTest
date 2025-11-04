# Referral System - End-to-End Flow

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                             │
│                      (Next.js + React)                       │
└────────────────┬────────────────────────────────────────────┘
                 │ HTTP Requests
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    INTERFACES LAYER                          │
│              (Controllers, DTOs, Guards)                     │
│   - referral.controller.ts  (POST /generate, /register)     │
│   - trades.controller.ts    (POST /trades/mock)             │
│   - merkle.controller.ts    (GET /merkle/root, POST /claim) │
│   - user.controller.ts      (GET /user/network)             │
│   - auth.controller.ts      (POST /auth/register)           │
└────────────────┬────────────────────────────────────────────┘
                 │ Call Application Services
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                          │
│           (Orchestrates Domain + Infrastructure)             │
│   - referral.app.service.ts  (referral flows)               │
│   - trades.app.service.ts    (trade processing + splits)    │
└────────────────┬────────────────────────────────────────────┘
                 │ Uses
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                      DOMAIN LAYER                            │
│         (Pure Business Logic - NO Infrastructure)            │
│                                                              │
│  INTERFACES (ports/contracts):                               │
│   - domain/repositories/            ← Repository interfaces  │
│   - domain/policies/                ← Policy interface       │
│                                                              │
│  DOMAIN SERVICES:                                            │
│   - CommissionService   (orchestrates policy)               │
│   - FeeBundlingService  (groups splits by destination)      │
│   - MerkleTreeService   (generates merkle trees & proofs)   │
└────────────────┬────────────────────────────────────────────┘
                 │ Implemented by
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                  INFRASTRUCTURE LAYER                        │
│            (Concrete Implementations)                        │
│                                                              │
│  REPOSITORIES (implement domain interfaces):                 │
│   - prisma/repositories/user.repository.prisma.ts           │
│   - prisma/repositories/referral.repository.prisma.ts       │
│   - prisma/repositories/ledger.repository.prisma.ts         │
│   - prisma/repositories/trade.repository.prisma.ts          │
│   - prisma/idempotency.store.prisma.ts                      │
│                                                              │
│  POLICIES (implement domain interface):                      │
│   - policies/default-policy.ts      (10% cashback, 30/3/2%) │
│                                                              │
│  BLOCKCHAIN SERVICES:                                        │
│   - services/evm-blockchain.service.ts  (Ethereum/Arbitrum) │
│   - services/svm-blockchain.service.ts  (Solana)            │
│   - blockchain/blockchain.module.ts     (initialization)    │
│                                                              │
│  CORE SERVICES:                                              │
│   - services/prisma.service.ts      (DB connection)         │
│   - services/claim.service.ts       (XP claims w/ proofs)   │
│   - services/referral.service.ts    (validation rules)      │
│   - services/scheduled-tasks.service.ts (merkle updates)    │
│                                                              │
│  EXTERNAL INTEGRATIONS:                                      │
│   - Smart Contracts (EVM: Arbitrum Sepolia)                 │
│   - Smart Contracts (SVM: Solana Devnet)                    │
│   - PostgreSQL Database (via Prisma ORM)                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Complete User Journey: Referral Registration & Earning

### **Flow 1: User Generates Referral Code**

```
USER (Frontend)
  │
  │ 1. Click "Generate Code"
  ▼
┌─────────────────────────────────────────┐
│ frontend/src/app/referral/page.tsx     │
│ - useReferral() hook                    │
│ - generate() function                   │
└──────────────┬──────────────────────────┘
               │ POST /api/referral/generate
               │ Header: x-user-id: USER01
               ▼
┌─────────────────────────────────────────┐
│ interfaces/http/referral.controller.ts  │
│ @Post('generate')                       │
└──────────────┬──────────────────────────┘
               │ FakeAuthGuard extracts user
               ▼
┌─────────────────────────────────────────┐
│ application/referral.app.service.ts     │
│ createOrGetReferralCode(userId)         │
└──────────────┬──────────────────────────┘
               │ Delegates to repository
               ▼
┌─────────────────────────────────────────┐
│ infrastructure/repositories/            │
│   user.repository.prisma.ts             │
│                                         │
│ 1. Check if user exists                 │
│ 2. If not, CREATE user                  │
│ 3. If no code, generate ref_xxxxx       │
│ 4. UPSERT into database                 │
└──────────────┬──────────────────────────┘
               │
               ▼
          PostgreSQL
      ┌──────────────────┐
      │ User table       │
      │ ┌──────────────┐ │
      │ │ id: USER01   │ │
      │ │ code: ref_abc│ │
      │ └──────────────┘ │
      └──────────────────┘
               │
               │ Return { code: "ref_abc" }
               ▼
         User sees code in UI
```

---

### **Flow 2: Another User Registers with the Code**

```
USER02 (Frontend)
  │
  │ 2. Enter code "ref_abc" and click Register
  ▼
┌──────────────────────────────────────────┐
│ frontend/src/app/referral/register/     │
│   page.tsx                               │
│ - register(code)                         │
└──────────────┬───────────────────────────┘
               │ POST /api/referral/register
               │ Body: { code: "ref_abc" }
               │ Header: x-user-id: USER02
               ▼
┌──────────────────────────────────────────┐
│ interfaces/http/referral.controller.ts   │
│ @Post('register')                        │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│ application/referral.app.service.ts      │
│ registerReferralByCode(userId, code)     │
│                                          │
│ Step 1: Find referrer by code           │
│ Step 2: Validate relationship            │
│ Step 3: Create referral link             │
└──────────────┬───────────────────────────┘
               │
               ▼
     ┌─────────────────────────────────┐
     │ DOMAIN VALIDATION               │
     │                                 │
     │ domain/services/                │
     │   referral.service.ts           │
     │                                 │
     │ computeLevelOrThrow():          │
     │  ✓ Not self-referral?           │
     │  ✓ No existing referrer?        │
     │  ✓ No cycles?                   │
     │  ✓ Depth ≤ 3?                   │
     │                                 │
     │ Returns: level = 1              │
     └─────────────┬───────────────────┘
                   │ Valid!
                   ▼
┌──────────────────────────────────────────┐
│ infrastructure/repositories/             │
│   referral.repository.prisma.ts          │
│                                          │
│ createLink(USER01, USER02, level=1)     │
└──────────────┬───────────────────────────┘
               │
               ▼
          PostgreSQL
      ┌──────────────────────┐
      │ ReferralLink table   │
      │ ┌──────────────────┐ │
      │ │ referrerId: USER01│ │
      │ │ refereeId: USER02 │ │
      │ │ level: 1          │ │
      │ └──────────────────┘ │
      └──────────────────────┘
               │
               │ Return { level: 1 }
               ▼
    User sees "Registered at level 1"
```

---

### **Flow 3: USER02 Makes a Trade → Commissions Distributed**

```
USER02 Makes Trade
  │ Fee: 100 XP
  │
  ▼
┌──────────────────────────────────────────┐
│ interfaces/http/trades.controller.ts     │
│ @Post('mock')                            │
│ Body: {                                  │
│   tradeId: "trade001",                   │
│   userId: "USER02",                      │
│   feeAmount: 100                         │
│ }                                        │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│ application/trades.app.service.ts        │
│ recordTradeAndCommissions()              │
│                                          │
│ Step 1: Check idempotency                │
│ Step 2: Record trade                     │
│ Step 3: Get user's ancestors (uplines)   │
│ Step 4: Calculate commission splits      │
│ Step 5: Record in ledger                 │
└──────────────┬───────────────────────────┘
               │
               ▼ Step 3: Get uplines
┌──────────────────────────────────────────┐
│ infrastructure/repositories/             │
│   referral.repository.prisma.ts          │
│                                          │
│ getAncestors(USER02, maxLevels=3)       │
│                                          │
│ Returns: [USER01]  ← USER02's upline    │
└──────────────┬───────────────────────────┘
               │
               ▼ Step 4: Calculate splits
┌──────────────────────────────────────────┐
│ DOMAIN LAYER                             │
│                                          │
│ domain/services/commission.service.ts    │
│   computeSplits(tradeFee=100, ctx)       │
│   │                                      │
│   └─> uses Policy                        │
│                                          │
│ infrastructure/policies/                 │
│   default-policy.ts                      │
│                                          │
│ calculateSplits():                       │
│   - USER02 cashback: 10% = 10 XP        │
│   - USER01 (level 1): 30% = 30 XP       │
│   - Treasury: 60 XP (remainder)          │
│   - (no level 2/3 uplines)               │
│                                          │
│ Returns: [                               │
│   {                                      │
│     beneficiaryId: "USER02",             │
│     level: 0,                            │
│     amount: 10,                          │
│     destination: "claimable",            │
│     token: "XP"                          │
│   },                                     │
│   {                                      │
│     beneficiaryId: "USER01",             │
│     level: 1,                            │
│     amount: 30,                          │
│     destination: "claimable",            │
│     token: "XP"                          │
│   },                                     │
│   {                                      │
│     beneficiaryId: "treasury",           │
│     level: -1,                           │
│     amount: 60,                          │
│     destination: "treasury",             │
│     token: "XP"                          │
│   }                                      │
│ ]                                        │
└──────────────┬───────────────────────────┘
               │
               ▼ Step 5: Record in ledger
┌──────────────────────────────────────────┐
│ infrastructure/repositories/             │
│   ledger.repository.prisma.ts            │
│                                          │
│ recordEntries([...splits])               │
└──────────────┬───────────────────────────┘
               │
               ▼
          PostgreSQL
      ┌────────────────────────────┐
      │ CommissionLedgerEntry      │
      │ ┌────────────────────────┐ │
      │ │ beneficiaryId: USER01  │ │
      │ │ sourceTradeId: trade001│ │
      │ │ level: 1               │ │
      │ │ amount: 30.00          │ │
      │ │ token: XP              │ │
      │ └────────────────────────┘ │
      └────────────────────────────┘
               │
               ▼
   USER01 earned 30 XP commission!
```

---

## 🗂️ File Structure Map

```
referral-service/src/
│
├── domain/                          ← PURE BUSINESS LOGIC (no dependencies)
│   ├── repositories/                ← Repository INTERFACES
│   │   ├── index.ts
│   │   ├── user.repository.interface.ts
│   │   ├── referral.repository.interface.ts
│   │   ├── ledger.repository.interface.ts
│   │   ├── trades.repository.interface.ts
│   │   └── idempotency.store.interface.ts
│   │
│   ├── policies/                    ← Policy INTERFACE
│   │   └── commission-policy.ts    (CommissionPolicy interface)
│   │
│   └── services/                    ← Domain Services
│       ├── commission.service.ts   (orchestrates policy)
│       ├── fee-bundling.service.ts (groups splits by chain/token)
│       └── merkle-tree.service.ts  (generates merkle trees/proofs)
│
├── infrastructure/                  ← IMPLEMENTATIONS
│   ├── blockchain/
│   │   └── blockchain.module.ts    (initializes EVM/SVM services)
│   │
│   ├── prisma/
│   │   ├── repositories/            ← Repository IMPLEMENTATIONS
│   │   │   ├── user.repository.prisma.ts
│   │   │   ├── referral.repository.prisma.ts
│   │   │   ├── ledger.repository.prisma.ts
│   │   │   └── trade.repository.prisma.ts
│   │   │
│   │   ├── idempotency.store.prisma.ts
│   │   ├── services/
│   │   │   └── prisma.service.ts   (DB connection)
│   │   │
│   │   └── prisma.module.ts        (DI configuration with tokens)
│   │
│   ├── policies/                    ← Policy IMPLEMENTATIONS
│   │   └── default-policy.ts       (10% cashback, 30/3/2%)
│   │
│   └── services/                    ← Infrastructure Services
│       ├── evm-blockchain.service.ts   (Ethereum smart contracts)
│       ├── svm-blockchain.service.ts   (Solana smart contracts)
│       ├── claim.service.ts            (XP claim verification)
│       ├── commission.service.ts       (delegates to policy)
│       ├── fee-bundling.service.ts     (groups fees)
│       ├── merkle-tree.service.ts      (tree generation)
│       ├── referral.service.ts         (validation rules)
│       └── scheduled-tasks.service.ts  (merkle root updates)
│
├── application/                     ← ORCHESTRATION LAYER
│   ├── referral.app.service.ts     (coordinates referral flows)
│   └── trades.app.service.ts       (coordinates trade flows)
│
└── interfaces/                      ← ENTRY POINTS
    └── http/
        ├── referral.controller.ts   (REST endpoints)
        ├── trades.controller.ts
        └── dto/                     (request validation)
```

---

## 🎯 Key Concepts Explained

### **Uplines** (Ancestors / Referral Chain)
```
USER_A (Level 0)
  └─ referred ─> USER_B (Level 1)
       └─ referred ─> USER_C (Level 2)
            └─ referred ─> USER_D (Level 3)

When USER_D makes a trade:
- USER_D's uplines are: [USER_C, USER_B, USER_A]
- USER_C gets 30% (Level 1 commission)
- USER_B gets 3% (Level 2 commission)
- USER_A gets 2% (Level 3 commission)
```

### **Policy Pattern** (Strategy)
```typescript
// Domain defines the interface
interface CommissionPolicy {
  calculateSplits(fee, ctx): Split[]
}

// Infrastructure provides implementations
class DefaultPolicy implements CommissionPolicy {
  // 30%/3%/2%
}

class VIPPolicy implements CommissionPolicy {
  // 35%/5%/3% for VIP users
}

// Can swap policies at runtime!
const service = new CommissionService(
  isVIP ? new VIPPolicy() : new DefaultPolicy()
)
```

### **Hexagonal Architecture** (Ports & Adapters)
```
Domain (Core)
  └─ defines interfaces (ports)
     
Infrastructure
  └─ implements interfaces (adapters)
     ├─ PrismaAdapter (PostgreSQL)
     ├─ MongoAdapter [future]
     └─ InMemoryAdapter (tests)
```

---

## 🔍 Common Questions

**Q: Why separate domain interfaces from infrastructure implementations?**  
A: So domain logic doesn't depend on databases. You can swap PostgreSQL for MongoDB without changing domain code.

**Q: What's the difference between Domain Services and App Services?**  
A: 
- **Domain Services** = Pure business rules (no I/O)
- **App Services** = Orchestrate domain + repositories (does I/O)

**Q: Why is DefaultPolicy in infrastructure now?**  
A: It's a concrete implementation. Domain only defines the `CommissionPolicy` interface. This lets you add new policies without touching domain code.

---

## 🧪 Testing Strategy

```
Unit Tests (domain/)
  └─ Test business logic with mocks
     ├─ referral.service.spec.ts
     ├─ commission.service.spec.ts
     └─ value-objects/*.spec.ts

Integration Tests (test/repositories.e2e-spec.ts)
  └─ Test repositories against real database
     ├─ User CRUD operations
     ├─ Referral link creation
     └─ Ledger entries

E2E Tests (test/api.e2e-spec.ts)
  └─ Test complete flows through HTTP
     ├─ Generate code
     ├─ Register referral
     ├─ Process trade
     └─ Calculate commissions
```

---

This architecture follows:
- ✅ **DDD** (Domain-Driven Design)
- ✅ **Hexagonal Architecture** (Ports & Adapters)
- ✅ **SOLID Principles**
- ✅ **Dependency Inversion** (Domain doesn't depend on infrastructure)

