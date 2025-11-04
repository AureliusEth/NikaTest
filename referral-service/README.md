# Referral System Backend - NestJS + Prisma + Blockchain

A production-ready referral and commission tracking system with blockchain integration for XP token claims via Merkle proofs.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Docker & Docker Compose (for PostgreSQL)  
- (Optional) Solana CLI for contract deployment

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL with Docker
docker compose up -d

# This starts PostgreSQL on localhost:5432
# Database: referral
# User: postgres
# Password: postgres

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your configuration (see below)

# 4. Set up database
npx prisma migrate dev

# 5. Seed initial data (optional)
node seed.mjs

# 6. Start development server
npm run start:dev

# 7. Access the API
# http://localhost:3000
```

### Alternative: Manual PostgreSQL Setup

If you prefer not to use Docker:

```bash
# Install PostgreSQL locally
# Create database
createdb referral

# Update DATABASE_URL in .env to match your setup
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/referral?schema=public"

# Then continue with step 4 above
```

## 🔧 Environment Configuration

Create a `.env` file in the project root:

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/referral?schema=public"

# Server
PORT=3000

# EVM (Ethereum/Arbitrum) Configuration
EVM_XP_CONTRACT_ADDRESS=0x3C4BB209c7f8E77C425247C9507Ace7F3685624C
EVM_PRIVATE_KEY=1cd0504fef17c5adf52c952d088bfaf881792c07dd7ee46ba44b246551697033
EVM_RPC_URL=https://arbitrum-sepolia.infura.io/v3/5ce3f0a2d7814e3c9da96f8e8ebf4d0c

# SVM (Solana) Configuration
SVM_XP_CONTRACT_ADDRESS=EkEP6vRisXSE4TSBDvr8FcpzZgSaYeVKc9uRdFpnXQVB
SVM_PRIVATE_KEY=../contracts/svm/nika-treasury/devnet-wallet.json
SVM_STATE_ACCOUNT_ADDRESS=Qh1qQ9tfgZzHHdHfxjhhLaXhCysstV5YAeAvN1jtZg5
SVM_RPC_URL=https://api.devnet.solana.com
SVM_STATE_KEYPAIR_PATH=../contracts/svm/nika-treasury/state-keypair.json
```

### Environment Variables Explained

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | Server port (default: 3000) |
| `EVM_XP_CONTRACT_ADDRESS` | Deployed Arbitrum Sepolia contract address |
| `EVM_PRIVATE_KEY` | Ethereum wallet private key (for merkle root updates) |
| `EVM_RPC_URL` | Arbitrum Sepolia RPC endpoint |
| `SVM_XP_CONTRACT_ADDRESS` | Deployed Solana program ID |
| `SVM_PRIVATE_KEY` | Path to Solana wallet keypair JSON |
| `SVM_STATE_ACCOUNT_ADDRESS` | Solana state account address |
| `SVM_RPC_URL` | Solana devnet RPC endpoint |
| `SVM_STATE_KEYPAIR_PATH` | Path to state account keypair |

## 📋 Available Scripts

### Development
```bash
npm run start:dev        # Start with hot reload
npm run start:debug      # Start with debugger
npm run build            # Build for production
npm run start:prod       # Start production build
```

### Testing
```bash
npm test                 # Run all tests
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
npm run test:e2e         # End-to-end tests
npm run test:cov         # With coverage report
npm run test:watch       # Watch mode
```

### Database
```bash
docker compose up -d        # Start PostgreSQL
docker compose down         # Stop PostgreSQL
docker compose down -v      # Stop and remove volumes (fresh start)

npx prisma migrate dev      # Create and apply migration
npx prisma generate         # Generate Prisma client
npx prisma studio           # Open Prisma Studio (DB GUI)
node seed.mjs               # Seed database with test data
```

### Code Quality
```bash
npm run lint             # Run ESLint
npm run format           # Format with Prettier
```

## 🧪 Testing Guide

### Run All Tests
```bash
# Unit tests (52 tests)
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Full test suite
npm test
```

### Test Coverage
```bash
npm run test:cov

# Coverage report will be in coverage/lcov-report/index.html
```

### Manual Testing

#### 1. Generate Referral Code
```bash
curl -X POST http://localhost:3000/api/referral/generate \
  -H "x-user-id: user123" \
  -H "Content-Type: application/json"

# Response: { "code": "ref_abc123" }
```

#### 2. Register with Referral Code
```bash
curl -X POST http://localhost:3000/api/referral/register \
  -H "x-user-id: user456" \
  -H "Content-Type: application/json" \
  -d '{ "code": "ref_abc123" }'

# Response: { "level": 1 }
```

#### 3. Mock a Trade (generates commissions)
```bash
curl -X POST http://localhost:3000/api/trades/mock \
  -H "x-user-id: user456" \
  -H "Content-Type: application/json" \
  -d '{
    "tradeId": "trade001",
    "userId": "user456",
    "feeAmount": 100,
    "token": "XP"
  }'

# Response: { "ok": true }
```

#### 4. Check Network
```bash
curl http://localhost:3000/api/user/network \
  -H "x-user-id: user123"

# Response: { "level1": [...], "level2": [...], "level3": [...] }
```

#### 5. Check Earnings
```bash
curl http://localhost:3000/api/referral/earnings \
  -H "x-user-id: user123"

# Response: { "total": 30, "byLevel": { "1": 30 } }
```

#### 6. Claim XP (with merkle proof)
```bash
curl -X POST http://localhost:3000/api/merkle/claim \
  -H "x-user-id: user123" \
  -H "Content-Type: application/json" \
  -d '{
    "chain": "SVM",
    "token": "XP"
  }'

# Response: { "success": true, "claimId": "...", "amount": 30 }
```

## 🏗️ Architecture

### Layered Architecture (Hexagonal/DDD)

```
┌─────────────────────────────────────────┐
│  Interfaces (HTTP Controllers)          │
│  - REST API endpoints                   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Application Services                   │
│  - Orchestrate workflows                │
│  - Transaction boundaries               │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Domain Layer                           │
│  - Business logic                       │
│  - Validation rules                     │
│  - Policies                             │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Infrastructure                         │
│  - Database (Prisma)                    │
│  - Blockchain (Ethereum, Solana)        │
│  - External services                    │
└─────────────────────────────────────────┘
```

### Key Features

- **Multi-level Referrals**: Up to 3 levels deep
- **Commission Distribution**: 10% cashback, 30%/3%/2% upline splits
- **Treasury Management**: Remainder goes to treasury
- **Blockchain Integration**: Merkle proofs for XP claims on Ethereum & Solana
- **Idempotency**: Safe retry of operations
- **Rate Limiting**: Built-in throttling
- **Type Safety**: Full TypeScript with strict types

## 📖 API Documentation

### Authentication
All endpoints require `x-user-id` header (FakeAuthGuard for development).

### Endpoints

#### Referral Endpoints

**Generate Referral Code**
```
POST /api/referral/generate
Headers: x-user-id: <userId>
Response: { code: string }
```

**Register with Code**
```
POST /api/referral/register
Headers: x-user-id: <userId>
Body: { code: string }
Response: { level: number }
```

**Get Network**
```
GET /api/user/network
Headers: x-user-id: <userId>
Response: { level1: User[], level2: User[], level3: User[] }
```

**Get Earnings**
```
GET /api/referral/earnings
Headers: x-user-id: <userId>
Response: { total: number, byLevel: Record<number, number> }
```

#### Trade Endpoints

**Mock Trade** (Development)
```
POST /api/trades/mock
Headers: x-user-id: <userId>
Body: {
  tradeId: string,
  userId: string,
  feeAmount: number,
  token?: string (default: "XP")
}
Response: { ok: boolean }
```

**What it does:**
- Simulates a trade transaction generating a fee
- Automatically distributes commissions:
  - 10% cashback to the trader
  - 30% to Level 1 referrer (if exists)
  - 3% to Level 2 referrer (if exists)
  - 2% to Level 3 referrer (if exists)
  - Remaining percentage goes to treasury
- Creates ledger entries that can be claimed via Merkle proofs
- Idempotent: same `tradeId` won't create duplicate commissions

#### Merkle/Claim Endpoints

**Get Current Root**
```
GET /api/merkle/root/:chain/:token
Response: { root: string, version: number }
```

**Generate Proof**
```
GET /api/merkle/proof/:chain/:token
Headers: x-user-id: <userId>
Response: { proof: string[], amount: number }
```

**Claim XP**
```
POST /api/merkle/claim
Headers: x-user-id: <userId>
Body: { chain: "EVM" | "SVM", token: string }
Response: { success: boolean, claimId?: string, amount?: number }
```

## 🗄️ Database Schema

### Key Tables

- **User**: User profiles with referral codes
- **ReferralLink**: Referrer → Referee relationships
- **Trade**: Trade records
- **CommissionLedgerEntry**: Earning records per user/trade
- **ClaimRecord**: On-chain claim history
- **MerkleRoot**: Current merkle roots per chain/token
- **TreasuryAccount**: Treasury balances

View full schema: `prisma/schema.prisma`

## 🔗 Blockchain Integration

### Supported Chains

1. **EVM (Ethereum/Arbitrum Sepolia)**
   - Contract: `NikaTreasury.sol`
   - Features: Merkle root storage, proof verification

2. **SVM (Solana Devnet)**
   - Program: `nika-treasury` (Anchor)
   - Features: Merkle root storage, proof verification

### Merkle Tree Claims Flow

1. User earns XP through trades → stored in ledger
2. System generates merkle tree from all claimable balances
3. Root is updated on-chain (scheduled task)
4. User requests claim → backend generates proof
5. Backend verifies proof against on-chain root
6. Claim is recorded (XP is simulated in this version)

## 🔐 Security

- **Idempotency**: Duplicate requests are safely handled
- **Rate Limiting**: 10 requests/minute per IP
- **Input Validation**: Class-validator on all DTOs
- **SQL Injection**: Prevented by Prisma ORM
- **Type Safety**: Strict TypeScript compilation
- **Error Handling**: Global exception filter

## 📦 Dependencies

### Core
- **NestJS 11**: Backend framework
- **Prisma 6**: Database ORM
- **PostgreSQL**: Database
- **TypeScript 5**: Type safety

### Blockchain
- **ethers.js 6**: Ethereum interaction
- **@solana/web3.js**: Solana interaction
- **@coral-xyz/anchor**: Solana program framework

### Testing
- **Jest**: Testing framework
- **Supertest**: HTTP testing

## 🚢 Deployment

### Production Build
```bash
npm run build
npm run start:prod
```

### Environment Setup
1. Set `NODE_ENV=production`
2. Use production database URL
3. Configure mainnet RPC endpoints
4. Deploy smart contracts to mainnet
5. Update contract addresses in `.env`

### Health Checks
```bash
curl http://localhost:3000/health
```

## 📚 Additional Documentation

- **Architecture**: See `ARCHITECTURE_FLOW.md`
- **Type Safety**: See `TYPE_SAFETY_FIX_COMPLETE.md`
- **Cleanup Summary**: See `CLEANUP_COMPLETE.md`
- **Tests**: See `tests/README.md`

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL container is running
docker compose ps

# Restart PostgreSQL
docker compose restart

# View PostgreSQL logs
docker compose logs postgres

# Connect to PostgreSQL directly
docker compose exec postgres psql -U postgres -d referral

# Reset database (fresh start)
docker compose down -v
docker compose up -d
npx prisma migrate dev

# Regenerate Prisma client
npx prisma generate
```

### Test Failures
```bash
# Clear Jest cache
npx jest --clearCache

# Run tests with verbose output
npm test -- --verbose
```

### Blockchain Connection Issues
```bash
# Check RPC endpoints are accessible
curl https://api.devnet.solana.com -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'

# Verify contract addresses in .env
```

## 📝 License

This project is for evaluation purposes.

## 👨‍💻 Author

Built with ❤️ using NestJS, Prisma, and Blockchain technology.

---

