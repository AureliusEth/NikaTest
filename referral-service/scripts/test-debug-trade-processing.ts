#!/usr/bin/env ts-node
/**
 * Debug Script: Trade Processing Flow
 * 
 * Trace the entire trade → commission flow
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 Simulating Trade Processing Flow\n');

  const tradeId = 'TRADE_COMM_USER_C_1762152013263';
  const userId = 'COMM_USER_C';
  const feeAmount = 1000;

  console.log(`Trade Details:`);
  console.log(`  ID: ${tradeId}`);
  console.log(`  User: ${userId}`);
  console.log(`  Fee: ${feeAmount} XP\n`);

  // Step 1: Find user (like UserRepository.findById does)
  console.log(`Step 1: Finding user...`);
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    console.log(`  ❌ User not found with id="${userId}"`);
    console.log(`  This is likely the problem!`);
    
    // Try finding by email
    const userByEmail = await prisma.user.findFirst({
      where: { email: `${userId}@test.com` }
    });
    
    if (userByEmail) {
      console.log(`  ✓ But user EXISTS with id="${userByEmail.id}"`);
      console.log(`  ❌ MISMATCH: Trade uses userId="${userId}", but actual id is "${userByEmail.id}"`);
    }
  } else {
    console.log(`  ✓ User found: ${user.id}`);
    console.log(`    Cashback rate: ${user.feeCashbackRate}`);
  }

  // Step 2: Get ancestors (like ReferralRepository.getAncestors does)
  console.log(`\nStep 2: Getting ancestors for "${userId}"...`);
  
  const ancestors: string[] = [];
  let current = userId;
  const maxLevels = 3;
  
  while (ancestors.length < maxLevels) {
    const link = await prisma.referralLink.findUnique({ 
      where: { refereeId: current } 
    });
    
    if (!link) break;
    ancestors.push(link.referrerId);
    current = link.referrerId;
  }

  console.log(`  Ancestors: [${ancestors.join(', ')}]`);
  
  if (ancestors.length === 0) {
    console.log(`  ❌ No ancestors found`);
  } else {
    console.log(`  ✓ ${ancestors.length} ancestors found`);
  }

  // Step 3: Simulate commission calculation
  console.log(`\nStep 3: Simulating commission calculation...`);
  
  const uplineRates = [0.30, 0.03, 0.02];
  const userCashbackRate = user ? Number(user.feeCashbackRate) : 0;
  
  let claimableTotal = 0;
  
  // Cashback
  if (userCashbackRate > 0) {
    const amount = feeAmount * userCashbackRate;
    console.log(`  Cashback (level 0): ${amount} XP (${userCashbackRate * 100}%)`);
    claimableTotal += amount;
  } else {
    console.log(`  Cashback (level 0): 0 XP (rate = 0)`);
  }

  // Upline commissions
  for (let i = 0; i < uplineRates.length && i < ancestors.length; i++) {
    const rate = uplineRates[i];
    const amount = feeAmount * rate;
    console.log(`  L${i + 1} commission (${ancestors[i]}): ${amount} XP (${rate * 100}%)`);
    claimableTotal += amount;
  }

  // Treasury
  const treasuryAmount = feeAmount - claimableTotal;
  console.log(`  Treasury: ${treasuryAmount} XP (${(treasuryAmount / feeAmount * 100).toFixed(2)}%)`);

  console.log(`\nExpected Ledger Entries: ${1 + (userCashbackRate > 0 ? 1 : 0) + ancestors.length}`);
  console.log(`  - ${userCashbackRate > 0 ? 1 : 0} cashback entries`);
  console.log(`  - ${ancestors.length} commission entries`);
  console.log(`  - 1 treasury entry`);

  // Step 4: Check actual ledger entries
  console.log(`\nStep 4: Checking actual ledger entries...`);
  const ledgerEntries = await prisma.commissionLedgerEntry.findMany({
    where: { sourceTradeId: tradeId }
  });

  console.log(`  Found: ${ledgerEntries.length} entries`);
  
  if (ledgerEntries.length === 1 && ledgerEntries[0].beneficiaryId === 'NIKA_TREASURY') {
    console.log(`  ❌ ONLY treasury entry exists!`);
    console.log(`  ❌ No commission splits were created!`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);




