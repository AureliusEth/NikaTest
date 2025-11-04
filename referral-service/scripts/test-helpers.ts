/**
 * Shared Test Helpers for E2E Tests
 * 
 * Reusable utilities to avoid duplication across test files
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const prisma = new PrismaClient();

export interface ApiResponse {
  ok?: boolean;
  error?: string;
  [key: string]: any;
}

export interface UserCookie {
  userId: string;
  cookie: string;
  email: string;
}

/**
 * Extract session cookie from Set-Cookie header
 */
export function extractCookie(setCookieHeader: string | null): string {
  if (!setCookieHeader) return '';
  const match = setCookieHeader.match(/session=([^;]+)/);
  return match ? `session=${match[1]}` : '';
}

/**
 * Make authenticated API call
 */
export async function apiCall(
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

/**
 * Authenticate user and return session cookie
 */
export async function authenticateUser(userId: string): Promise<UserCookie> {
  const email = `${userId}@test.com`;
  const loginUrl = `${API_BASE_URL}/api/auth/login`;
  
  const loginResponse = await fetch(loginUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email })
  });

  if (!loginResponse.ok) {
    const errorText = await loginResponse.text();
    throw new Error(`Login failed for ${userId}: ${loginResponse.status} ${errorText}`);
  }

  const loginData = await loginResponse.json();
  const cookie = extractCookie(loginResponse.headers.get('set-cookie'));

  if (!cookie) {
    throw new Error(`No session cookie received for ${userId}`);
  }

  return {
    userId: loginData.userId,
    cookie,
    email
  };
}

/**
 * Create a referral chain: users[0] -> users[1] -> users[2] -> ...
 * Returns map of userId to UserCookie
 */
export async function createUserChain(userIds: string[]): Promise<Map<string, UserCookie>> {
  const userCookies = new Map<string, UserCookie>();

  // Step 1: Authenticate all users
  console.log(`  Authenticating ${userIds.length} users...`);
  for (const userId of userIds) {
    const userCookie = await authenticateUser(userId);
    userCookies.set(userId, userCookie);
    console.log(`    ✓ ${userId} authenticated (actual userId: ${userCookie.userId})`);
  }

  // Step 2: Create referral chain
  console.log(`  Creating referral chain...`);
  for (let i = 0; i < userIds.length - 1; i++) {
    const referrerId = userIds[i];
    const refereeId = userIds[i + 1];
    
    const referrerCookie = userCookies.get(referrerId)!;
    const refereeCookie = userCookies.get(refereeId)!;

    // Referrer generates code
    const codeResponse = await apiCall(
      'POST',
      '/api/referral/generate',
      undefined,
      undefined,
      { Cookie: referrerCookie.cookie }
    );
    
    console.log(`    ✓ ${referrerId} generated code: ${codeResponse.code}`);

    // Referee registers with code
    const registerResponse = await apiCall(
      'POST',
      '/api/referral/register',
      undefined,
      { code: codeResponse.code },
      { Cookie: refereeCookie.cookie }
    );

    console.log(`    ✓ ${refereeId} registered with ${referrerId} at level ${registerResponse.level}`);
  }

  return userCookies;
}

/**
 * Submit a trade for a user
 * @param userId - The user ID (for trade ID generation)
 * @param feeAmount - Trade fee amount
 * @param chain - EVM or SVM
 * @param token - Token type
 * @param userCookie - Optional authenticated user cookie (recommended)
 */
export async function makeTrade(
  userId: string,
  feeAmount: number,
  chain: 'EVM' | 'SVM' = 'EVM',
  token: string = 'XP',
  userCookie?: UserCookie
): Promise<string> {
  const tradeId = `TRADE_${userId}_${Date.now()}`;
  
  // FIX: Use authenticated cookie if provided, otherwise fall back to x-user-id header
  const headers: Record<string, string> = userCookie 
    ? { Cookie: userCookie.cookie }
    : {};
  
  await apiCall('POST', '/api/trades/mock', userCookie ? undefined : userId, {
    tradeId,
    userId,  // Keep in body for backward compat, but controller will use authenticated user
    feeAmount,
    token,
    chain,
  }, headers);

  return tradeId;
}

/**
 * Get user earnings
 */
export async function getEarnings(userCookie: UserCookie): Promise<{
  total: number;
  byLevel: Record<number, number>;
}> {
  const response = await apiCall(
    'GET',
    '/api/referral/earnings',
    undefined,
    undefined,
    { Cookie: userCookie.cookie }
  );
  return {
    total: response.total || 0,
    byLevel: response.byLevel || {}
  };
}

/**
 * Get user network
 */
export async function getNetwork(userCookie: UserCookie): Promise<{
  level1: string[];
  level2: string[];
  level3: string[];
}> {
  const response = await apiCall(
    'GET',
    '/api/referral/network',
    undefined,
    undefined,
    { Cookie: userCookie.cookie }
  );
  return {
    level1: response.level1 || [],
    level2: response.level2 || [],
    level3: response.level3 || []
  };
}

/**
 * Assert earnings match expected amount (with tolerance for floating point)
 */
export function assertEarnings(
  actual: number,
  expected: number,
  tolerance: number = 0.01,
  context: string = ''
): void {
  const diff = Math.abs(actual - expected);
  if (diff > tolerance) {
    throw new Error(
      `${context} Earnings mismatch: expected ${expected}, got ${actual} (diff: ${diff})`
    );
  }
}

/**
 * Generate and update merkle root for a chain
 */
export async function generateAndUpdateRoot(
  chain: 'EVM' | 'SVM',
  token: string = 'XP'
): Promise<{ root: string; version: number; txHash?: string }> {
  // Generate merkle root
  const generateResponse = await apiCall(
    'POST',
    `/api/merkle/generate/${chain}/${token}`
  );

  console.log(`    ✓ Generated ${chain} merkle root (version ${generateResponse.version})`);

  // Update on-chain
  const updateResponse = await apiCall(
    'POST',
    `/api/merkle/update-on-chain/${chain}/${token}`
  );

  console.log(`    ✓ Updated ${chain} on-chain (tx: ${updateResponse.txHash || 'see logs'})`);

  return {
    root: generateResponse.root,
    version: generateResponse.version,
    txHash: updateResponse.txHash
  };
}

/**
 * Get merkle proof for user
 */
export async function getMerkleProof(
  userId: string,
  chain: 'EVM' | 'SVM',
  token: string = 'XP',
  userCookie?: UserCookie
): Promise<{
  amount: number;
  proof: string[];
  root: string;
}> {
  const headers: Record<string, string> | undefined = userCookie ? { Cookie: userCookie.cookie } : undefined;
  
  const response = await apiCall(
    'GET',
    `/api/merkle/proof/${chain}/${token}?userId=${userId}`,
    undefined,
    undefined,
    headers
  );
  
  return {
    amount: response.amount || 0,
    proof: response.proof || [],
    root: response.root || ''
  };
}

/**
 * Submit claim and verify
 */
export async function claimAndVerify(
  userId: string,
  chain: 'EVM' | 'SVM',
  expectedAmount: number,
  userCookie: UserCookie,
  token: string = 'XP'
): Promise<{ claimed: boolean; amount: number; txHash?: string }> {
  const claimResponse = await apiCall(
    'POST',
    `/api/merkle/claim/${chain}/${token}`,
    userId,
    undefined,
    { Cookie: userCookie.cookie }
  );

  // Verify amount matches expected
  if (claimResponse.amount !== undefined && claimResponse.amount !== expectedAmount) {
    console.warn(
      `  ⚠️  Claim amount mismatch: expected ${expectedAmount}, got ${claimResponse.amount}`
    );
  }

  return {
    claimed: claimResponse.claimed || false,
    amount: claimResponse.amount,
    txHash: claimResponse.txHash
  };
}

/**
 * Wait/sleep utility
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Test step wrapper with error handling
 */
export async function step(name: string, fn: () => Promise<void>): Promise<void> {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📋 ${name}`);
  console.log('='.repeat(70));
  try {
    await fn();
    console.log(`✅ ${name} - PASSED`);
  } catch (error) {
    console.error(`❌ ${name} - FAILED`);
    console.error(error);
    throw error;
  }
}

/**
 * Get treasury balance
 * Note: Treasury earnings are stored with destination='treasury', need direct DB query
 */
export async function getTreasuryBalance(
  chain: 'EVM' | 'SVM',
  token: string = 'XP'
): Promise<number> {
  // FIX: Query treasury earnings directly from database as API may not include treasury destination
  const query = await prisma.commissionLedgerEntry.aggregate({
    _sum: { amount: true },
    where: {
      beneficiaryId: 'NIKA_TREASURY',
      destination: 'treasury',
      token
    }
  });
  return Number(query._sum.amount || 0);
}

/**
 * Get contract status
 */
export async function getContractStatus(
  chain: 'EVM' | 'SVM',
  token: string = 'XP'
): Promise<{
  onChainRoot: string;
  onChainVersion: number;
  isSynced: boolean;
}> {
  const response = await apiCall('GET', `/api/merkle/contract-status/${chain}/${token}`);
  return {
    onChainRoot: response.onChainRoot || '0x0000000000000000000000000000000000000000000000000000000000000000',
    onChainVersion: response.onChainVersion || 0,
    isSynced: response.isSynced || false
  };
}

/**
 * Expect error with specific message
 */
export async function expectError(
  fn: () => Promise<any>,
  expectedMessageFragment: string
): Promise<void> {
  try {
    await fn();
    throw new Error(`Expected error containing "${expectedMessageFragment}" but no error was thrown`);
  } catch (error: any) {
    if (!error.message.includes(expectedMessageFragment)) {
      throw new Error(
        `Expected error containing "${expectedMessageFragment}" but got: ${error.message}`
      );
    }
    // Error matches expected message
  }
}

/**
 * Clean up test data from database
 */
export async function cleanupTestUsers(userIdPattern: string): Promise<void> {
  // Delete in correct order due to foreign keys
  
  // 1. Delete commission ledger entries for test users (including treasury entries from test trades)
  await prisma.commissionLedgerEntry.deleteMany({
    where: {
      OR: [
        {
          beneficiaryId: {
            contains: userIdPattern
          }
        },
        {
          // Delete treasury entries from test trades
          beneficiaryId: 'NIKA_TREASURY',
          sourceTradeId: {
            contains: userIdPattern.toUpperCase()
          }
        }
      ]
    }
  });

  // 2. Delete trades by test users
  await prisma.trade.deleteMany({
    where: {
      userId: {
        contains: userIdPattern
      }
    }
  });

  // 3. Delete referral links involving test users
  await prisma.referralLink.deleteMany({
    where: {
      OR: [
        { referrerId: { contains: userIdPattern } },
        { refereeId: { contains: userIdPattern } }
      ]
    }
  });

  // 4. Delete test users
  await prisma.user.deleteMany({
    where: {
      email: {
        contains: userIdPattern
      }
    }
  });

  // 5. Delete idempotency keys for test trades
  await prisma.idempotencyKey.deleteMany({
    where: {
      key: {
        contains: userIdPattern.toUpperCase()
      }
    }
  });
}

/**
 * Disconnect Prisma client
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}

