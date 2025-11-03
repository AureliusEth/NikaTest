# Smart Contract Integration Summary

This integration connects your EVM and SVM smart contracts to the rest of your application. Here's what has been implemented:

## ✅ Completed Integration

### Backend (NestJS)

1. **Blockchain Services**
   - `EvmBlockchainService` - Handles EVM contract interactions (ethers.js)
   - `SvmBlockchainService` - Handles Solana contract interactions (Anchor)
   - `BlockchainModule` - Initializes services on startup

2. **API Endpoints**
   - `POST /api/merkle/update-on-chain/:chain/:token` - Update merkle root on contract
   - `GET /api/merkle/contract-status/:chain/:token` - Check sync status
   - `POST /api/merkle/verify-on-chain/:chain/:token` - Verify proof on-chain

3. **Existing Endpoints Enhanced**
   - `POST /api/merkle/generate/:chain/:token` - Now includes contract address info
   - `GET /api/merkle/proof/:chain/:token` - Returns proof for user claims

### Frontend (Next.js)

1. **Wallet Hooks**
   - `useEvmWallet()` - Connect MetaMask/EVM wallets
   - `useSvmWallet()` - Connect Phantom/Solana wallets

2. **Contract Interaction Hooks**
   - `useEvmContract()` - Interact with EVM contracts
   - `useSvmContract()` - Interact with Solana contracts

## 📁 File Structure

```
referral-service/
├── src/
│   ├── infrastructure/
│   │   ├── services/
│   │   │   ├── evm-blockchain.service.ts   # NEW
│   │   │   └── svm-blockchain.service.ts    # NEW
│   │   └── blockchain/
│   │       └── blockchain.module.ts         # NEW
│   └── interfaces/http/
│       └── merkle.controller.ts            # ENHANCED

frontend/
└── src/
    └── lib/
        ├── wallet.ts                        # NEW
        ├── evm-contract.ts                  # NEW
        └── svm-contract.ts                  # NEW
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Backend
cd referral-service
npm install

# Frontend
cd frontend
npm install
```

### 2. Configure Environment

**Backend (`referral-service/.env`):**
```env
EVM_RPC_URL=https://arb1.arbitrum.io/rpc
EVM_PRIVATE_KEY=your_key_here
SVM_RPC_URL=https://api.mainnet-beta.solana.com
SVM_PRIVATE_KEY=[json_keypair_array]
EVM_XP_CONTRACT_ADDRESS=0x...
SVM_XP_CONTRACT_ADDRESS=...
```

**Frontend (`frontend/.env.local`):**
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

### 3. Usage Examples

#### Backend - Update Merkle Root

```bash
# Generate root
curl -X POST http://localhost:3000/api/merkle/generate/EVM/XP

# Update on-chain
curl -X POST http://localhost:3000/api/merkle/update-on-chain/EVM/XP

# Check status
curl http://localhost:3000/api/merkle/contract-status/EVM/XP
```

#### Frontend - Connect Wallet and Claim

```tsx
import { useEvmWallet, useEvmContract } from '@/lib/wallet';

function ClaimComponent() {
  const { connect, isConnected, account } = useEvmWallet();
  const { getProof, verifyProof } = useEvmContract();

  const handleClaim = async () => {
    // Get proof from backend
    const proof = await getProof('EVM', 'XP');
    
    // Verify on-chain
    const isValid = await verifyProof(
      'EVM',
      'XP',
      proof.proof,
      proof.amount,
      account!
    );
    
    if (isValid) {
      // Proceed with claim...
    }
  };

  return (
    <button onClick={isConnected ? handleClaim : connect}>
      {isConnected ? 'Claim' : 'Connect Wallet'}
    </button>
  );
}
```

## 🔄 Integration Flow

```
1. Trade executed → Commission calculated
2. Commission stored in database (claimable)
3. Merkle root generated periodically
4. Merkle root updated on-chain via backend
5. User gets proof from backend
6. User verifies proof on-chain
7. User claims tokens
```

## 📝 Next Steps

1. **Deploy Contracts** - Deploy your contracts to testnet/mainnet
2. **Update Addresses** - Add contract addresses to `.env` files
3. **Test Integration** - Test wallet connection and contract interactions
4. **Add UI Components** - Create React components for claiming
5. **Monitor** - Set up monitoring for contract sync status

## 🔒 Security Considerations

- Private keys should be stored securely (use environment variables)
- Consider using a dedicated admin wallet for contract updates
- Implement rate limiting on contract update endpoints
- Add transaction monitoring and alerts
- Use multisig for production deployments

## 📚 Documentation

- See `BLOCKCHAIN_INTEGRATION.md` for detailed configuration
- See `MERKLE_TREE_TRACKING.md` for merkle tree architecture
- Contract ABIs available in contract directories

