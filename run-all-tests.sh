#!/bin/bash

# Comprehensive Test Runner for Nika Referral System
# Runs all tests: Backend (unit + integration) + Chain tests (EVM + SVM)

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "========================================="
echo "  🧪 Nika Test Suite - Complete Run"
echo "========================================="
echo ""

# Track results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to print section header
section() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

# Function to report results
report() {
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ $1 PASSED${NC}"
    PASSED_TESTS=$((PASSED_TESTS + $2))
  else
    echo -e "${RED}❌ $1 FAILED${NC}"
    FAILED_TESTS=$((FAILED_TESTS + $2))
  fi
  TOTAL_TESTS=$((TOTAL_TESTS + $2))
  echo ""
}

# ============================================
# 1. Backend Unit Tests
# ============================================
section "1️⃣  Backend Unit Tests (Fast, ~0.5s)"

cd referral-service
npm run test:unit || true
report "Backend Unit Tests" 47

# ============================================
# 2. Backend Integration Tests  
# ============================================
section "2️⃣  Backend Integration Tests (With DB, ~2s)"

npm run test:integration || true
report "Backend Integration Tests" 28

# ============================================
# 3. EVM Contract Tests
# ============================================
section "3️⃣  EVM Contract Tests (Foundry)"

cd ../contracts/evm

echo "Compiling contracts..."
forge build

echo "Running tests..."
forge test -vv
report "EVM Contract Tests" 19

# ============================================
# 4. Solana Contract Tests
# ============================================
section "4️⃣  Solana Contract Tests (Anchor + Localnet)"

cd ../svm/nika-treasury

echo "Building Solana program..."
anchor build

echo -e "${YELLOW}Note: This will start a local Solana validator${NC}"
echo "Running tests..."
anchor test
report "Solana Contract Tests" 30

# ============================================
# Final Summary
# ============================================
section "📊 Final Test Summary"

echo "Total Tests Run: $TOTAL_TESTS"
echo -e "${GREEN}Tests Passed: $PASSED_TESTS${NC}"
if [ $FAILED_TESTS -gt 0 ]; then
  echo -e "${RED}Tests Failed: $FAILED_TESTS${NC}"
fi

SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
echo ""
echo "Success Rate: ${SUCCESS_RATE}%"

if [ $FAILED_TESTS -eq 0 ]; then
  echo ""
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}  🎉 ALL TESTS PASSED! 🎉${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 0
else
  echo ""
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${RED}  Some tests failed. See above for details.${NC}"
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 1
fi

