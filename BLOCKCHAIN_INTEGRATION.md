# Blockchain Integration Configuration

This document describes the environment variables needed to connect the smart contracts to the application.

## Backend Configuration (referral-service)

Add these to your `.env` file in the `referral-service` directory:

```env
# EVM Configuration (Ethereum, Arbitrum, etc.)
EVM_RPC_URL=https://arb1.arbitrum.io/rpc
EVM_PRIVATE_KEY=your_private_key_here

# SVM Configuration (Solana)
SVM_RPC_URL=https://api.mainnet-beta.solana.com
SVM_PRIVATE_KEY=[your_solana_keypair_as_json_array]

# Contract Addresses
EVM_XP_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
EVM_USDC_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
SVM_XP_CONTRACT_ADDRESS=11111111111111111111111111111111
SVM_USDC_CONTRACT_ADDRESS=11111111111111111111111111111111
```

## Frontend Configuration (frontend)

Add these to your `.env.local` file in the `frontend` directory:

```env
# API Base URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000

# Contract Addresses (optional - can be fetched from backend)
NEXT_PUBLIC_EVM_XP_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
NEXT_PUBLIC_EVM_USDC_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
NEXT_PUBLIC_SVM_XP_CONTRACT_ADDRESS=11111111111111111111111111111111
NEXT_PUBLIC_SVM_USDC_CONTRACT_ADDRESS=11111111111111111111111111111111
```

## Deployment Instructions

### 1. Install Dependencies

**Backend:**
```bash
cd referral-service
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### 2. Configure Environment Variables

Copy the example environment variables above and update with your actual:
- RPC URLs (use public RPCs or your own node)
- Private keys (for backend admin wallet - keep secure!)
- Contract addresses (after deploying contracts)

### 3. Deploy Smart Contracts

**EVM (Foundry):**
```bash
cd contracts/evm
forge build
forge script scripts/Deploy.s.sol --rpc-url <RPC_URL> --broadcast --verify
```

**SVM (Anchor):**
```bash
cd contracts/svm/nika-treasury
anchor build
anchor deploy --provider.cluster <devnet|mainnet>
```

### 4. Update Contract Addresses

After deployment, update the contract addresses in your `.env` files.

### 5. Start Services

**Backend:**
```bash
cd referral-service
npm run start:dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

## Security Notes

- **Never commit private keys to version control**
- Use environment variables or secure secret management
- For production, use a dedicated admin wallet with minimal funds
- Consider using a multisig wallet for contract updates
- Rate limit contract update endpoints

## API Endpoints

### Backend Endpoints

- `POST /api/merkle/generate/:chain/:token` - Generate merkle root
- `POST /api/merkle/update-on-chain/:chain/:token` - Update root on contract
- `GET /api/merkle/contract-status/:chain/:token` - Check sync status
- `GET /api/merkle/proof/:chain/:token` - Get user proof
- `POST /api/merkle/verify-on-chain/:chain/:token` - Verify proof on-chain

### Frontend Hooks

- `useEvmWallet()` - Connect EVM wallet (MetaMask)
- `useSvmWallet()` - Connect Solana wallet (Phantom)
- `useEvmContract()` - Interact with EVM contracts
- `useSvmContract()` - Interact with Solana contracts

