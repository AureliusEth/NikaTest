#!/usr/bin/env ts-node
/**
 * End-to-End Test Script
 * 
 * Tests the complete flow:
 * 1. Generate trades on both EVM and SVM chains
 * 2. Generate merkle roots for both chains
 * 3. Update merkle roots on-chain (EVM and SVM)
 * 4. Verify contract status
 * 5. Test claim flow
 * 
 * Usage:
 *   npm run test:e2e-full
 *   or
 *   ts-node scripts/test-e2e.ts
 */

import 'dotenv/config';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// Test user IDs
const TEST_USER = 'L1_USER_1';
const TEST_USER_2 = 'L2_USER_1';

interface ApiResponse {
  ok?: boolean;
  error?: string;
  [key: string]: any;
}

function extractCookie(setCookieHeader: string | null): string {
  if (!setCookieHeader) return '';
  // Extract the session cookie value
  const match = setCookieHeader.match(/session=([^;]+)/);
  return match ? `session=${match[1]}` : '';
}

async function apiCall(
  method: string,
  path: string,
  userId?: string,
  body?: any,
  extraHeaders?: Record<string, string>
): Promise<ApiResponse> {
  const url = `${API_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...extraHeaders,
  };

  if (userId) {
    headers['x-user-id'] = userId;
  }

  const options: RequestInit = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }

  console.log(`  ${method} ${path}${userId ? ` (user: ${userId})` : ''}`);

  const response = await fetch(url, options);
  const responseText = await response.text();
  let data: ApiResponse;

  try {
    data = JSON.parse(responseText);
  } catch {
    data = { error: responseText };
  }

  if (!response.ok) {
    throw new Error(
      `API call failed: ${response.status} ${response.statusText}\n${JSON.stringify(data, null, 2)}`
    );
  }

  return data;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function step(name: string, fn: () => Promise<void>): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📋 ${name}`);
  console.log('='.repeat(60));
  try {
    await fn();
    console.log(`✅ ${name} - PASSED`);
  } catch (error) {
    console.error(`❌ ${name} - FAILED`);
    console.error(error);
    throw error;
  }
}

async function main() {
  console.log('\n🚀 Starting End-to-End Test Suite');
  console.log(`📡 API Base URL: ${API_BASE_URL}\n`);

  try {
    // Step 1: Generate trades for both chains
    await step('Step 1: Generate Trades on EVM and SVM', async () => {
      // Generate EVM trade
      const evmTradeId = `E2E_EVM_${Date.now()}`;
      await apiCall('POST', '/api/trades/mock', TEST_USER, {
        tradeId: evmTradeId,
        userId: TEST_USER,
        feeAmount: 500,
        token: 'XP',
        chain: 'EVM',
      });
      console.log(`  ✓ EVM trade created: ${evmTradeId}`);

      // Generate SVM trade
      const svmTradeId = `E2E_SVM_${Date.now()}`;
      await apiCall('POST', '/api/trades/mock', TEST_USER_2, {
        tradeId: svmTradeId,
        userId: TEST_USER_2,
        feeAmount: 750,
        token: 'XP',
        chain: 'SVM',
      });
      console.log(`  ✓ SVM trade created: ${svmTradeId}`);

      await sleep(1000); // Wait for processing
    });

    // Step 2: Check treasury balances
    await step('Step 2: Check Treasury Balances', async () => {
      const evmBalance = await apiCall('GET', '/api/merkle/treasury-balance/EVM/XP');
      console.log(`  ✓ EVM Treasury Balance: ${evmBalance.balance || 0} XP`);

      const svmBalance = await apiCall('GET', '/api/merkle/treasury-balance/SVM/XP');
      console.log(`  ✓ SVM Treasury Balance: ${svmBalance.balance || 0} XP`);
    });

    // Step 3: Generate merkle roots
    await step('Step 3: Generate Merkle Roots', async () => {
      const evmRoot = await apiCall('POST', '/api/merkle/generate/EVM/XP');
      console.log(`  ✓ EVM Merkle Root: ${evmRoot.root?.slice(0, 20)}...`);
      console.log(`  ✓ EVM Version: ${evmRoot.version}`);

      const svmRoot = await apiCall('POST', '/api/merkle/generate/SVM/XP');
      console.log(`  ✓ SVM Merkle Root: ${svmRoot.root?.slice(0, 20)}...`);
      console.log(`  ✓ SVM Version: ${svmRoot.version}`);
    });

    // Step 4: Update merkle roots on-chain
    await step('Step 4: Update Merkle Roots On-Chain', async () => {
      console.log('  ⚠️  Note: This requires blockchain services to be configured');
      console.log('  ⚠️  Set EVM_RPC_URL, EVM_PRIVATE_KEY, SVM_RPC_URL, SVM_PRIVATE_KEY');

      try {
        const evmUpdate = await apiCall('POST', '/api/merkle/update-on-chain/EVM/XP');
        console.log(`  ✓ EVM On-Chain Update: ${evmUpdate.txHash || evmUpdate.message || 'See logs'}`);
      } catch (error: any) {
        if (error.message?.includes('not initialized') || error.message?.includes('not configured')) {
          console.log('  ⚠️  EVM blockchain service not configured - skipping');
        } else {
          throw error;
        }
      }

      try {
        const svmUpdate = await apiCall('POST', '/api/merkle/update-on-chain/SVM/XP');
        console.log(`  ✓ SVM On-Chain Update: ${svmUpdate.txHash || svmUpdate.message || 'See logs'}`);
      } catch (error: any) {
        if (error.message?.includes('not initialized') || error.message?.includes('not configured')) {
          console.log('  ⚠️  SVM blockchain service not configured - skipping');
        } else {
          throw error;
        }
      }
    });

    // Step 5: Check contract status
    await step('Step 5: Check Contract Status', async () => {
      try {
        const evmStatus = await apiCall('GET', '/api/merkle/contract-status/EVM/XP');
        console.log(`  ✓ EVM Contract Status:`);
        console.log(`     - On-Chain Root: ${evmStatus.onChainRoot || 'Not set'}`);
        console.log(`     - On-Chain Version: ${evmStatus.onChainVersion ?? 'N/A'}`);
        console.log(`     - Synced: ${evmStatus.synced ? 'Yes' : 'No'}`);
      } catch (error: any) {
        if (error.message?.includes('not configured')) {
          console.log('  ⚠️  EVM contract not configured - skipping');
        } else {
          throw error;
        }
      }

      try {
        const svmStatus = await apiCall('GET', '/api/merkle/contract-status/SVM/XP');
        console.log(`  ✓ SVM Contract Status:`);
        console.log(`     - On-Chain Root: ${svmStatus.onChainRoot || 'Not set'}`);
        console.log(`     - On-Chain Version: ${svmStatus.onChainVersion ?? 'N/A'}`);
        console.log(`     - Synced: ${svmStatus.synced ? 'Yes' : 'No'}`);
      } catch (error: any) {
        if (error.message?.includes('not configured')) {
          console.log('  ⚠️  SVM contract not configured - skipping');
        } else {
          throw error;
        }
      }
    });

    // Step 6: Authenticate users
    let testUserCookie = '';
    let testUser2Cookie = '';
    
    await step('Step 6: Authenticate Test Users', async () => {
      // Login as TEST_USER (using email format)
      const loginUrl1 = `${API_BASE_URL}/api/auth/login`;
      const loginResponse1 = await fetch(loginUrl1, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: `${TEST_USER}@test.com` })
      });
      
      if (!loginResponse1.ok) {
        const errorText = await loginResponse1.text();
        console.log(`  Login response for ${TEST_USER}: ${loginResponse1.status} ${errorText}`);
        throw new Error(`Login failed for ${TEST_USER}: ${loginResponse1.status} ${errorText}`);
      }
      
      const loginData1 = await loginResponse1.json();
      testUserCookie = extractCookie(loginResponse1.headers.get('set-cookie'));
      if (!testUserCookie) {
        console.log(`  ⚠️  No cookie received for ${TEST_USER}, response headers:`, Array.from(loginResponse1.headers.entries()));
      }
      console.log(`  ✓ Authenticated ${TEST_USER} (userId: ${loginData1.userId})`);

      // Login as TEST_USER_2 (using email format)
      const loginUrl2 = `${API_BASE_URL}/api/auth/login`;
      const loginResponse2 = await fetch(loginUrl2, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: `${TEST_USER_2}@test.com` })
      });
      
      if (!loginResponse2.ok) {
        const errorText = await loginResponse2.text();
        console.log(`  Login response for ${TEST_USER_2}: ${loginResponse2.status} ${errorText}`);
        throw new Error(`Login failed for ${TEST_USER_2}: ${loginResponse2.status} ${errorText}`);
      }
      
      const loginData2 = await loginResponse2.json();
      testUser2Cookie = extractCookie(loginResponse2.headers.get('set-cookie'));
      if (!testUser2Cookie) {
        console.log(`  ⚠️  No cookie received for ${TEST_USER_2}, response headers:`, Array.from(loginResponse2.headers.entries()));
      }
      console.log(`  ✓ Authenticated ${TEST_USER_2} (userId: ${loginData2.userId})`);
    });

    // Step 7: Get merkle proof for user
    await step('Step 7: Get Merkle Proof for Claim', async () => {
      const evmProof = await apiCall('GET', `/api/merkle/proof/EVM/XP?userId=${TEST_USER}`, undefined, undefined, { Cookie: testUserCookie });
      console.log(`  ✓ EVM Proof for ${TEST_USER}:`);
      console.log(`     - Amount: ${evmProof.amount} XP`);
      console.log(`     - Proof Length: ${evmProof.proof?.length || 0}`);
      console.log(`     - Root: ${evmProof.root?.slice(0, 20)}...`);

      const svmProof = await apiCall('GET', `/api/merkle/proof/SVM/XP?userId=${TEST_USER_2}`, undefined, undefined, { Cookie: testUser2Cookie });
      console.log(`  ✓ SVM Proof for ${TEST_USER_2}:`);
      console.log(`     - Amount: ${svmProof.amount} XP`);
      console.log(`     - Proof Length: ${svmProof.proof?.length || 0}`);
      console.log(`     - Root: ${svmProof.root?.slice(0, 20)}...`);
    });

    // Step 8: Test claim flow
    await step('Step 8: Test Claim Flow', async () => {
      try {
        const evmClaim = await apiCall('POST', '/api/merkle/claim/EVM/XP', TEST_USER, undefined, { Cookie: testUserCookie });
        console.log(`  ✓ EVM Claim Status: ${evmClaim.claimed ? 'Claimed' : 'Pending'}`);
        console.log(`     - Amount: ${evmClaim.amount} XP`);
      } catch (error: any) {
        if (error.message?.includes('already claimed')) {
          console.log('  ⚠️  EVM claim already processed (expected)');
        } else {
          throw error;
        }
      }

      try {
        const svmClaim = await apiCall('POST', '/api/merkle/claim/SVM/XP', TEST_USER_2, undefined, { Cookie: testUser2Cookie });
        console.log(`  ✓ SVM Claim Status: ${svmClaim.claimed ? 'Claimed' : 'Pending'}`);
        console.log(`     - Amount: ${svmClaim.amount} XP`);
      } catch (error: any) {
        if (error.message?.includes('already claimed')) {
          console.log('  ⚠️  SVM claim already processed (expected)');
        } else {
          throw error;
        }
      }
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(60));
    console.log('\n🎉 End-to-end test completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Check dashboard at http://localhost:3001/dashboard');
    console.log('   2. Verify contract addresses are set in environment');
    console.log('   3. Generate more trades: npm run generate-trades');

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ TEST SUITE FAILED');
    console.error('='.repeat(60));
    console.error('\nError:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();

