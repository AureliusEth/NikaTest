#!/usr/bin/env ts-node

/**
 * Comprehensive Mock Trade Script
 * 
 * Creates a complete referral network with multiple users across all 3 levels
 * and generates realistic trade activity from each user
 * 
 * Usage:
 *   npm run mock-comprehensive
 *   npm run mock-comprehensive -- --users=20 --trades=50
 */

import 'dotenv/config';

declare global {
  function fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

interface User {
  id: string;
  level: number;
  referrerId?: string;
}

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

async function generateReferralCode(userId: string): Promise<string> {
  const result = await apiCall('POST', '/api/referral/generate', userId);
  return result.code;
}

async function registerReferral(userId: string, code: string): Promise<number> {
  const result = await apiCall('POST', '/api/referral/register', userId, { code });
  return result.level;
}

async function executeTrade(userId: string, feeAmount: number): Promise<void> {
  const tradeId = `TRADE_${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  await apiCall('POST', '/api/trades/mock', userId, {
    tradeId,
    userId,
    feeAmount,
    token: 'XP',
  });
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const args = process.argv.slice(2);
  let numUsers = 15;
  let numTrades = 40;

  for (const arg of args) {
    if (arg.startsWith('--users=')) numUsers = parseInt(arg.split('=')[1], 10);
    if (arg.startsWith('--trades=')) numTrades = parseInt(arg.split('=')[1], 10);
    if (arg === '--help' || arg === '-h') {
      console.log(`
Comprehensive Mock Trade Script

Usage:
  npm run mock-comprehensive [options]

Options:
  --users=N    Number of users to create (default: 15)
  --trades=N   Number of trades to generate (default: 40)
  --help, -h   Show this help
`);
      process.exit(0);
    }
  }

  try {
    console.log('🚀 Starting Comprehensive Mock Trade Generation\n');
    console.log(`📊 Configuration:`);
    console.log(`   - Users: ${numUsers}`);
    console.log(`   - Trades: ${numTrades}`);
    console.log(`   - API: ${API_BASE_URL}\n`);

    // Step 1: Create root user (level 0)
    console.log('👤 Creating root user...');
    const rootUser: User = { id: 'ROOT_USER', level: 0 };
    const rootCode = await generateReferralCode(rootUser.id);
    console.log(`✅ Root user created with code: ${rootCode}\n`);

    // Step 2: Build referral network
    console.log('🌳 Building referral network...');
    const allUsers: User[] = [rootUser];
    
    // Level 1 users (direct referrals of root)
    const level1Count = Math.min(Math.floor(numUsers * 0.4), 5);
    console.log(`   Creating ${level1Count} Level 1 users...`);
    for (let i = 0; i < level1Count; i++) {
      const userId = `L1_USER_${i + 1}`;
      await registerReferral(userId, rootCode);
      allUsers.push({ id: userId, level: 1, referrerId: rootUser.id });
      await sleep(100); // Small delay to avoid overwhelming the server
    }

    // Level 2 users (referrals of level 1)
    const level2Count = Math.min(Math.floor(numUsers * 0.35), 7);
    console.log(`   Creating ${level2Count} Level 2 users...`);
    const level1Users = allUsers.filter(u => u.level === 1);
    for (let i = 0; i < level2Count; i++) {
      const referrer = level1Users[i % level1Users.length];
      const referrerCode = await generateReferralCode(referrer.id);
      const userId = `L2_USER_${i + 1}`;
      await registerReferral(userId, referrerCode);
      allUsers.push({ id: userId, level: 2, referrerId: referrer.id });
      await sleep(100);
    }

    // Level 3 users (referrals of level 2)
    const level3Count = numUsers - level1Count - level2Count - 1; // -1 for root
    if (level3Count > 0) {
      console.log(`   Creating ${level3Count} Level 3 users...`);
      const level2Users = allUsers.filter(u => u.level === 2);
      for (let i = 0; i < level3Count; i++) {
        const referrer = level2Users[i % level2Users.length];
        const referrerCode = await generateReferralCode(referrer.id);
        const userId = `L3_USER_${i + 1}`;
        await registerReferral(userId, referrerCode);
        allUsers.push({ id: userId, level: 3, referrerId: referrer.id });
        await sleep(100);
      }
    }

    console.log(`✅ Network created with ${allUsers.length} users\n`);

    // Step 3: Generate random trades
    console.log('💰 Generating trades...');
    const tradableUsers = allUsers.filter(u => u.level > 0); // Exclude root for more realistic simulation
    
    const progressInterval = Math.max(1, Math.floor(numTrades / 10));
    for (let i = 0; i < numTrades; i++) {
      // Select random user weighted by level (higher levels trade more frequently in this simulation)
      const randomIndex = Math.floor(Math.random() * tradableUsers.length);
      const trader = tradableUsers[randomIndex];

      // Generate random fee amount (between 10 and 1000 XP)
      const feeAmount = Math.floor(Math.random() * 990) + 10;

      await executeTrade(trader.id, feeAmount);

      if ((i + 1) % progressInterval === 0) {
        console.log(`   ✓ Generated ${i + 1}/${numTrades} trades...`);
      }

      // Small random delay to simulate real-world timing
      await sleep(50 + Math.random() * 50);
    }

    console.log(`✅ All trades generated!\n`);

    // Step 4: Show summary
    console.log('📊 Summary:');
    console.log(`   Total Users: ${allUsers.length}`);
    console.log(`   - Root (Level 0): 1`);
    console.log(`   - Level 1: ${allUsers.filter(u => u.level === 1).length}`);
    console.log(`   - Level 2: ${allUsers.filter(u => u.level === 2).length}`);
    console.log(`   - Level 3: ${allUsers.filter(u => u.level === 3).length}`);
    console.log(`   Total Trades: ${numTrades}`);
    console.log('\n✨ Mock data generation completed successfully!');
    console.log('\n💡 Tip: Visit the dashboard to see the activity!');
    console.log(`   Root User ID: ${rootUser.id}`);

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();

