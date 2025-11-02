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
 *   npm run mock-trade-flow -- --multi                    # Generate multiple trades for multiple users
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
  multi?: boolean;
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
    multi: false,
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
    } else if (arg === '--multi') {
      options.multi = true;
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
  --multi                  Generate multiple trades for multiple users with different referral levels
  --help, -h               Show this help

Examples:
  npm run mock-trade-flow
  npm run mock-trade-flow -- --trader=USER001 --fee=200
  npm run mock-trade-flow -- --trader=USER001 --referrer=USER000 --fee=200 --token=XP --show-earnings
  npm run mock-trade-flow -- --multi
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
  try {
    const result = await apiCall('POST', '/api/referral/register', userId, { code });
    console.log(`✅ Registered at level ${result.level}`);
    return result.level;
  } catch (error: any) {
    // If already registered, that's fine
    if (error.message?.includes('already set') || error.message?.includes('already registered')) {
      console.log(`ℹ️  ${userId} already registered`);
      return 1; // Assume level 1 for simplicity
    }
    throw error;
  }
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

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function setupMultiUserChain(): Promise<string[]> {
  console.log('📋 Setting up multi-user referral chain...\n');
  
  // Create a chain: USER_ROOT -> USER_L1 -> USER_L2 -> USER_L3
  const users = ['USER_ROOT', 'USER_L1', 'USER_L2', 'USER_L3'];
  
  // Generate code for root user
  await generateReferralCode(users[0]);
  
  // Register each user with the previous user's code
  for (let i = 1; i < users.length; i++) {
    const code = await generateReferralCode(users[i - 1]);
    await registerReferral(users[i], code);
    await sleep(100); // Small delay between registrations
  }
  
  console.log('\n✅ Multi-user referral chain setup complete!\n');
  return users;
}

async function generateMultipleTrades(users: string[]): Promise<void> {
  console.log('💰 Generating multiple trades for all users...\n');
  
  const feeRanges = [
    { min: 50, max: 150 },   // Small trades
    { min: 100, max: 300 },  // Medium trades
    { min: 200, max: 500 },  // Large trades
  ];
  
  // Generate trades for each user
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const numTrades = 3 + Math.floor(Math.random() * 3); // 3-5 trades per user
    
    console.log(`\n📊 Generating ${numTrades} trades for ${user}...`);
    
    for (let j = 0; j < numTrades; j++) {
      const feeRange = feeRanges[Math.floor(Math.random() * feeRanges.length)];
      const feeAmount = feeRange.min + Math.random() * (feeRange.max - feeRange.min);
      const tradeId = `TRADE_${user}_${Date.now()}_${j}`;
      
      await executeMockTrade(
        tradeId,
        user,
        Math.round(feeAmount * 100) / 100, // Round to 2 decimals
        'XP'
      );
      
      await sleep(200); // Small delay between trades
    }
  }
  
  console.log('\n✅ All trades generated successfully!');
}

async function main() {
  try {
    const options = await parseArgs();

    console.log('🚀 Starting Mock Trade Flow\n');
    console.log(`API Base URL: ${API_BASE_URL}\n`);

    if (options.multi) {
      // Multi-user mode: setup chain and generate multiple trades
      const users = await setupMultiUserChain();
      await generateMultipleTrades(users);
      
      // Show earnings for root user
      console.log('\n');
      await showEarnings(users[0]);
      
      console.log('\n✨ Multi-user mock trade flow completed successfully!');
    } else {
      // Single trade mode (original behavior)
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
    }
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();

