#!/usr/bin/env ts-node

/**
 * Generate Multiple Trades Script
 * 
 * Generates trades for existing users in the database
 * 
 * Usage:
 *   npm run generate-trades -- --trades=50
 */

import 'dotenv/config';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// Use existing users from the previous mock
const EXISTING_USERS = [
  'L1_USER_1', 'L1_USER_2', 'L1_USER_3', 'L1_USER_4', 'L1_USER_5',
  'L2_USER_1', 'L2_USER_2', 'L2_USER_3', 'L2_USER_4', 'L2_USER_5',
  'L3_USER_1', 'L3_USER_2', 'L3_USER_3', 'L3_USER_4'
];

async function apiCall(method: string, path: string, userId: string, body?: any): Promise<any> {
  const url = `${API_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'x-user-id': userId,
    'content-type': 'application/json',
  };

  const options: RequestInit = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(url, options);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API call failed: ${response.status} ${response.statusText}\n${errorText}`);
  }

  return response.json();
}

async function executeTrade(userId: string, feeAmount: number, chain: 'EVM' | 'SVM'): Promise<void> {
  const tradeId = `TRADE_${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await apiCall('POST', '/api/trades/mock', userId, {
    tradeId,
    userId,
    feeAmount,
    token: 'XP',
    chain,
  });
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const args = process.argv.slice(2);
  let numTrades = 50;

  for (const arg of args) {
    if (arg.startsWith('--trades=')) numTrades = parseInt(arg.split('=')[1], 10);
    if (arg === '--help' || arg === '-h') {
      console.log(`
Generate Trades Script

Usage:
  npm run generate-trades [options]

Options:
  --trades=N   Number of trades to generate (default: 50)
  --help, -h   Show this help
`);
      process.exit(0);
    }
  }

  try {
    console.log('💰 Generating Trades\n');
    console.log(`📊 Configuration:`);
    console.log(`   - Trades: ${numTrades}`);
    console.log(`   - Users: ${EXISTING_USERS.length}`);
    console.log(`   - API: ${API_BASE_URL}\n`);

    console.log('🔄 Generating trades...');
    const progressInterval = Math.max(1, Math.floor(numTrades / 10));
    
    for (let i = 0; i < numTrades; i++) {
      // Select random user
      const randomUser = EXISTING_USERS[Math.floor(Math.random() * EXISTING_USERS.length)];
      
      // Generate random fee amount (between 50 and 1000 XP)
      const feeAmount = Math.floor(Math.random() * 950) + 50;
      
      // Randomly assign chain (EVM or SVM)
      const chain = Math.random() > 0.5 ? 'EVM' : 'SVM';

      await executeTrade(randomUser, feeAmount, chain);

      if ((i + 1) % progressInterval === 0) {
        console.log(`   ✓ Generated ${i + 1}/${numTrades} trades...`);
      }

      // Small random delay
      await sleep(30 + Math.random() * 30);
    }

    console.log(`\n✅ Successfully generated ${numTrades} trades!`);
    console.log('\n💡 Refresh your dashboard to see the new activity!');

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();

