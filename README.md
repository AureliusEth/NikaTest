# Referral System Backend - NestJS + Prisma + Blockchain

A production-ready referral and commission tracking system with blockchain integration for XP token claims via Merkle proofs.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Docker & Docker Compose **OR** Podman (for PostgreSQL)  
- (Optional) Solana CLI for contract deployment

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL
# Choose either Docker or Podman:

# Using Docker Compose (recommended):
docker compose up -d

# OR using Podman:
podman run --name referral_postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=referral \
  -p 5432:5432 \
  -d docker.io/library/postgres:16-alpine

# This starts PostgreSQL on localhost:5432
# Database: referral
# User: postgres
# Password: postgres

# 3. Set up environment variables
# The .env file is already included in the repository with all necessary configuration

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

If you prefer not to use Docker or Podman:

```bash
# Install PostgreSQL locally
# Create database
createdb referral

# Update DATABASE_URL in .env to match your setup
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/referral?schema=public"

# Then continue with step 4 above
```

## 🔧 Environment Configuration

The following environment variables are used (example values):

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
# Using Docker Compose:
docker compose up -d        # Start PostgreSQL
docker compose down         # Stop PostgreSQL
docker compose down -v      # Stop and remove volumes (fresh start)

# Using Podman:
podman start referral_postgres   # Start existing container
podman stop referral_postgres    # Stop container
podman rm referral_postgres      # Remove container
podman volume prune              # Clean up volumes (optional)

# Database management (works with both):
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

### Testing the Application

The easiest way to test the application is through the **frontend interface** which handles authentication automatically.

#### Start Both Backend and Frontend

**Terminal 1 - Backend:**
```bash
cd referral-service
npm run start:dev
# Backend runs on http://localhost:3000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:3001
```

#### Testing Flow

1. **Open Frontend**: Navigate to `http://localhost:3001`

2. **Sign Up/Login**: 
   - Enter your email (e.g., `user1@test.com`)
   - Optionally use an invite code from another user
   - The system automatically creates a session

3. **Get Your Referral Code**: 
   - Click "Generate Referral Code" on the dashboard
   - Copy your code to share with others

4. **Sign Up Another User with Referral**:
   - Open an incognito window or different browser
   - Sign up with a different email (e.g., `user2@test.com`)
   - Use the referral code from User 1
   - This creates a referral link (User 2 → User 1)

5. **Generate a Trade**:
   - As User 2, click "Generate Trade"
   - This simulates a trade with a 100 XP fee
   - User 2 gets 10% cashback (10 XP)
   - User 1 gets 30% commission (30 XP)
   - Treasury gets 60% (60 XP)

6. **View Earnings**:
   - Check the dashboard to see your earnings
   - View your referral network

7. **Claim XP**:
   - Click "Claim XP" 
   - Merkle roots are automatically generated
   - The system verifies your proof and processes the claim

#### Manual API Testing (Advanced)

If you need to test the API directly, use the login endpoint first to get a session cookie:

```bash
# 1. Login to get a session cookie
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user1@test.com"}' \
  -c cookies.txt

# 2. Use the session cookie for subsequent requests
curl http://localhost:3000/api/referral/earnings \
  -b cookies.txt

# 3. Generate a referral code
curl -X POST http://localhost:3000/api/referral/generate \
  -b cookies.txt

# 4. Generate a trade (simulates user activity)
curl -X POST http://localhost:3000/api/trades/mock \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "tradeId": "trade001",
    "feeAmount": 100,
    "token": "XP"
  }'

# 5. Claim XP
curl -X POST http://localhost:3000/api/merkle/claim \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "chain": "SVM",
    "token": "XP"
  }'
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

The application uses **session-based authentication** with httpOnly cookies:

1. Users login via `/api/auth/login` with their email
2. The backend creates a JWT session token
3. The token is stored in an httpOnly cookie (secure, can't be accessed by JavaScript)
4. All subsequent requests automatically include the cookie
5. The backend validates the session on each request

**No manual headers needed** - the browser handles authentication automatically!

### Endpoints

#### Authentication Endpoints

**Login/Signup**
```
POST /api/auth/login
Body: { 
  email: string,
  inviteCode?: string  // Optional referral code
}
Response: { 
  userId: string, 
  level?: number,  // If registered with invite code
  isExistingUser: boolean,
  message: string 
}
Sets cookie: session=<jwt_token>
```

#### Referral Endpoints

**Generate Referral Code**
```
POST /api/referral/generate
Auth: Session cookie (automatic)
Response: { code: string }
```

**Get Network**
```
GET /api/user/network
Auth: Session cookie (automatic)
Response: { level1: User[], level2: User[], level3: User[] }
```

**Get Earnings**
```
GET /api/referral/earnings
Auth: Session cookie (automatic)
Response: { total: number, byLevel: Record<number, number> }
```

#### Trade Endpoints

**Mock Trade** (Development)
```
POST /api/trades/mock
Auth: Session cookie (automatic)
Body: {
  tradeId: string,
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
Auth: Session cookie (automatic)
Response: { proof: string[], amount: number }
```

**Claim XP**
```
POST /api/merkle/claim
Auth: Session cookie (automatic)
Body: { chain: "EVM" | "SVM", token: string }
Response: { success: boolean, claimId?: string, amount?: number }

Description: Claims XP tokens for the authenticated user.
- Automatically generates Merkle roots if needed
- Verifies Merkle proof on-chain
- Records the claim in the database
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

**Using Docker Compose:**
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
```

**Using Podman:**
```bash
# Check if PostgreSQL container is running
podman ps | grep referral_postgres

# Restart PostgreSQL
podman restart referral_postgres

# View PostgreSQL logs
podman logs referral_postgres

# Connect to PostgreSQL directly
podman exec -it referral_postgres psql -U postgres -d referral

# Reset database (fresh start)
podman stop referral_postgres
podman rm referral_postgres
podman run --name referral_postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=referral \
  -p 5432:5432 \
  -d docker.io/library/postgres:16-alpine
npx prisma migrate dev
```

**General (works with both):**
```bash
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

