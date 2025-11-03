#!/usr/bin/env ts-node

/**
 * Mock Trade Flow Script
 * 
 * Executes a complete mock trade flow:
 * 1. Optionally sets up referral chain (generate code, register user)
 * 2. Executes a mock trade
 * 3. Optionally shows earnings
 * 
 * Usage:
 *   npm run mock-trade-flow
 *   npm run mock-trade-flow -- --trader=USER001 --fee=100
 *   npm run mock-trade-flow -- --trader=USER001 --referrer=USER000 --fee=200 --token=XP --show-earnings
 */

import 'dotenv/config';

// Ensure fetch is available (Node.js 18+ has built-in fetch)
declare global {
  function fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

interface Options {
  trader?: string;
  referrer?: string;
  fee?: number;
  token?: string;
  tradeId?: string;
  showEarnings?: boolean;
  setupChain?: boolean;
}

async function parseArgs(): Promise<Options> {
  const args = process.argv.slice(2);
  const options: Options = {
    trader: 'TRADER_001',
    referrer: 'REFERRER_001',
    fee: 100,
    token: 'XP',
    tradeId: `TRADE_${Date.now()}`,
    showEarnings: false,
    setupChain: true,
  };

  for (const arg of args) {
    if (arg.startsWith('--trader=')) {
      options.trader = arg.split('=')[1];
    } else if (arg.startsWith('--referrer=')) {
      options.referrer = arg.split('=')[1];
    } else if (arg.startsWith('--fee=')) {
      options.fee = parseFloat(arg.split('=')[1]);
    } else if (arg.startsWith('--token=')) {
      options.token = arg.split('=')[1];
    } else if (arg.startsWith('--trade-id=')) {
      options.tradeId = arg.split('=')[1];
    } else if (arg === '--show-earnings') {
      options.showEarnings = true;
    } else if (arg === '--no-setup') {
      options.setupChain = false;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Mock Trade Flow Script

Usage:
  npm run mock-trade-flow [options]

Options:
  --trader=USER_ID         Trader user ID (default: TRADER_001)
  --referrer=USER_ID       Referrer user ID (default: REFERRER_001)
  --fee=AMOUNT             Trade fee amount (default: 100)
  --token=TOKEN            Token type (default: XP)
  --trade-id=ID            Trade ID (default: TRADE_<timestamp>)
  --show-earnings          Show earnings after trade
  --no-setup               Skip referral chain setup
  --help, -h               Show this help

Examples:
  npm run mock-trade-flow
  npm run mock-trade-flow -- --trader=USER001 --fee=200
  npm run mock-trade-flow -- --trader=USER001 --referrer=USER000 --fee=200 --token=XP --show-earnings
      `);
      process.exit(0);
    }
  }

  return options;
}

async function apiCall(
  method: string,
  path: string,
  userId: string,
  body?: any,
): Promise<any> {
  const url = `${API_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'x-user-id': userId,
    'content-type': 'application/json',
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API call failed: ${response.status} ${response.statusText}\n${errorText}`);
  }

  return response.json();
}

async function generateReferralCode(userId: string): Promise<string> {
  console.log(`📝 Generating referral code for ${userId}...`);
  const result = await apiCall('POST', '/api/referral/generate', userId);
  console.log(`✅ Generated code: ${result.code}`);
  return result.code;
}

async function registerReferral(userId: string, code: string): Promise<number> {
  console.log(`📝 Registering ${userId} with code ${code}...`);
  const result = await apiCall('POST', '/api/referral/register', userId, { code });
  console.log(`✅ Registered at level ${result.level}`);
  return result.level;
}

async function executeMockTrade(
  tradeId: string,
  userId: string,
  feeAmount: number,
  token: string,
): Promise<void> {
  console.log(`\n💰 Executing mock trade...`);
  console.log(`   Trade ID: ${tradeId}`);
  console.log(`   User: ${userId}`);
  console.log(`   Fee: ${feeAmount} ${token}`);
  
  await apiCall('POST', '/api/trades/mock', userId, {
    tradeId,
    userId,
    feeAmount,
    token,
  });
  
  console.log(`✅ Trade executed successfully!`);
}

async function showEarnings(userId: string): Promise<void> {
  console.log(`\n📊 Fetching earnings for ${userId}...`);
  const result = await apiCall('GET', '/api/referral/earnings', userId);
  console.log(`\n💰 Earnings Summary:`);
  console.log(`   Total: ${result.total} XP`);
  console.log(`   By Level:`);
  for (const [level, amount] of Object.entries(result.byLevel || {})) {
    console.log(`     Level ${level}: ${amount} XP`);
  }
}

async function main() {
  try {
    const options = await parseArgs();

    console.log('🚀 Starting Mock Trade Flow\n');
    console.log(`API Base URL: ${API_BASE_URL}\n`);

    // Step 1: Setup referral chain (if requested)
    if (options.setupChain) {
      console.log('📋 Setting up referral chain...\n');
      
      // Generate referral code for referrer
      const referralCode = await generateReferralCode(options.referrer!);
      
      // Register trader with referrer's code
      await registerReferral(options.trader!, referralCode);
      
      console.log('\n✅ Referral chain setup complete!\n');
    }

    // Step 2: Execute mock trade
    await executeMockTrade(
      options.tradeId!,
      options.trader!,
      options.fee!,
      options.token!,
    );

    // Step 3: Show earnings (if requested)
    if (options.showEarnings) {
      await showEarnings(options.referrer!);
    }

    console.log('\n✨ Mock trade flow completed successfully!');
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();

