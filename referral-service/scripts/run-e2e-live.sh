#!/bin/bash
# E2E Test Runner for Live Contracts
# This script runs the comprehensive E2E test with the provided environment variables

set -e

echo "🚀 Starting E2E Test with Live Contracts"
echo "=========================================="

# Set environment variables
export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/referral?schema=public}"
export PORT="${PORT:-3000}"
export EVM_XP_CONTRACT_ADDRESS="${EVM_XP_CONTRACT_ADDRESS:-0x9b7268Ff8FcadaE5B45773C2baBd491f01251db2}"
export SVM_XP_CONTRACT_ADDRESS="${SVM_XP_CONTRACT_ADDRESS:-EkEP6vRisXSE4TSBDvr8FcpzZgSaYeVKc9uRdFpnXQVB}"
export EVM_PRIVATE_KEY="${EVM_PRIVATE_KEY:-1cd0504fef17c5adf52c952d088bfaf881792c07dd7ee46ba44b246551697033}"
export SVM_PRIVATE_KEY="${SVM_PRIVATE_KEY:-../contracts/svm/nika-treasury/devnet-wallet.json}"
export EVM_RPC_URL="${EVM_RPC_URL:-https://arbitrum-sepolia.infura.io/v3/5ce3f0a2d7814e3c9da96f8e8ebf4d0c}"
export SVM_RPC_URL="${SVM_RPC_URL:-https://eth-mainnet.g.alchemy.com/v2/vGraps_BkWQQvnoMC6QwL}"
export API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"

echo ""
echo "📋 Environment Configuration:"
echo "  DATABASE_URL: ${DATABASE_URL:0:50}..."
echo "  PORT: ${PORT}"
echo "  EVM_XP_CONTRACT_ADDRESS: ${EVM_XP_CONTRACT_ADDRESS}"
echo "  SVM_XP_CONTRACT_ADDRESS: ${SVM_XP_CONTRACT_ADDRESS}"
echo "  EVM_RPC_URL: ${EVM_RPC_URL}"
echo "  SVM_RPC_URL: ${SVM_RPC_URL}"
echo "  API_BASE_URL: ${API_BASE_URL}"
echo ""

# Check if backend is running
echo "🔍 Checking if backend is running..."
if ! curl -s "${API_BASE_URL}/" > /dev/null; then
    echo "❌ Backend is not running at ${API_BASE_URL}"
    echo "   Please start the backend first:"
    echo "   cd referral-service && npm run start:dev"
    exit 1
fi
echo "✅ Backend is running"

# Change to referral-service directory
cd "$(dirname "$0")/.."

# Run the test
echo ""
echo "🧪 Running E2E test..."
npm run test:e2e-live




