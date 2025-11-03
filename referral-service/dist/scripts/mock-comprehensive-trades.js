#!/usr/bin/env ts-node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
async function apiCall(method, path, userId, body) {
    const url = `${API_BASE_URL}${path}`;
    const headers = {
        'x-user-id': userId,
        'content-type': 'application/json',
    };
    const options = { method, headers };
    if (body)
        options.body = JSON.stringify(body);
    const response = await fetch(url, options);
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API call failed: ${response.status} ${response.statusText}\n${errorText}`);
    }
    return response.json();
}
async function generateReferralCode(userId) {
    const result = await apiCall('POST', '/api/referral/generate', userId);
    return result.code;
}
async function registerReferral(userId, code) {
    const result = await apiCall('POST', '/api/referral/register', userId, { code });
    return result.level;
}
async function executeTrade(userId, feeAmount) {
    const tradeId = `TRADE_${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await apiCall('POST', '/api/trades/mock', userId, {
        tradeId,
        userId,
        feeAmount,
        token: 'XP',
    });
}
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function main() {
    const args = process.argv.slice(2);
    let numUsers = 15;
    let numTrades = 40;
    for (const arg of args) {
        if (arg.startsWith('--users='))
            numUsers = parseInt(arg.split('=')[1], 10);
        if (arg.startsWith('--trades='))
            numTrades = parseInt(arg.split('=')[1], 10);
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
        console.log('👤 Creating root user...');
        const rootUser = { id: 'ROOT_USER', level: 0 };
        const rootCode = await generateReferralCode(rootUser.id);
        console.log(`✅ Root user created with code: ${rootCode}\n`);
        console.log('🌳 Building referral network...');
        const allUsers = [rootUser];
        const level1Count = Math.min(Math.floor(numUsers * 0.4), 5);
        console.log(`   Creating ${level1Count} Level 1 users...`);
        for (let i = 0; i < level1Count; i++) {
            const userId = `L1_USER_${i + 1}`;
            await registerReferral(userId, rootCode);
            allUsers.push({ id: userId, level: 1, referrerId: rootUser.id });
            await sleep(100);
        }
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
        const level3Count = numUsers - level1Count - level2Count - 1;
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
        console.log('💰 Generating trades...');
        const tradableUsers = allUsers.filter(u => u.level > 0);
        const progressInterval = Math.max(1, Math.floor(numTrades / 10));
        for (let i = 0; i < numTrades; i++) {
            const randomIndex = Math.floor(Math.random() * tradableUsers.length);
            const trader = tradableUsers[randomIndex];
            const feeAmount = Math.floor(Math.random() * 990) + 10;
            await executeTrade(trader.id, feeAmount);
            if ((i + 1) % progressInterval === 0) {
                console.log(`   ✓ Generated ${i + 1}/${numTrades} trades...`);
            }
            await sleep(50 + Math.random() * 50);
        }
        console.log(`✅ All trades generated!\n`);
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
    }
    catch (error) {
        console.error('\n❌ Error:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=mock-comprehensive-trades.js.map