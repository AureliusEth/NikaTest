#!/usr/bin/env ts-node
/**
 * Debug Script: Get Ancestors
 * 
 * Check if getAncestors() is finding uplines correctly
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 Debugging getAncestors() Function\n');

  // Check referral links for our test users
  const testUsers = ['COMM_USER_A', 'COMM_USER_B', 'COMM_USER_C'];
  
  for (const userId of testUsers) {
    console.log(`\n📋 User: ${userId}`);
    
    // Find actual userId (email-based)
    const user = await prisma.user.findFirst({
      where: { email: `${userId}@test.com` }
    });

    if (!user) {
      console.log(`  ❌ User not found in database`);
      continue;
    }

    console.log(`  ✓ Found in DB: ${user.id}`);

    // Check if they have a referrer
    const asReferee = await prisma.referralLink.findMany({
      where: { refereeId: user.id }
    });

    if (asReferee.length === 0) {
      console.log(`  ❌ NO REFERRER FOUND (not registered under anyone)`);
    } else {
      console.log(`  ✓ Has referrer(s):`, asReferee.map(r => ({
        referrer: r.referrerId,
        level: r.level
      })));
    }

    // Check who they referred
    const asReferrer = await prisma.referralLink.findMany({
      where: { referrerId: user.id }
    });

    if (asReferrer.length === 0) {
      console.log(`  ℹ️  No downline (hasn't referred anyone)`);
    } else {
      console.log(`  ✓ Referred ${asReferrer.length} user(s):`, asReferrer.map(r => ({
        referee: r.refereeId,
        level: r.level
      })));
    }

    // Simulate getAncestors() logic
    const ancestors = await getAncestors(user.id, 3);
    console.log(`  🔍 getAncestors(${user.id}, 3) returned:`, ancestors);
  }

  // Now check the specific trade scenario
  console.log(`\n\n🎯 Trade Scenario Analysis:\n`);
  
  const tradeUser = await prisma.user.findFirst({
    where: { email: 'COMM_USER_C@test.com' }
  });

  if (!tradeUser) {
    console.log('❌ COMM_USER_C not found');
    await prisma.$disconnect();
    return;
  }

  console.log(`Trade made by: ${tradeUser.id}`);
  
  const ancestors = await getAncestors(tradeUser.id, 3);
  console.log(`Ancestors found: ${ancestors.length}`);
  console.log(`Ancestor IDs:`, ancestors);

  if (ancestors.length === 0) {
    console.log(`\n❌ ROOT CAUSE: getAncestors() returns empty array!`);
    console.log(`   This means commission policy receives ancestors = []`);
    console.log(`   Result: No upline commissions calculated`);
    console.log(`   Result: All fees go to treasury`);
  } else {
    console.log(`\n✅ Ancestors found correctly`);
    console.log(`   Expected commissions:`);
    console.log(`   - ${ancestors[0]}: 30% (L1)`);
    if (ancestors[1]) console.log(`   - ${ancestors[1]}: 3% (L2)`);
    if (ancestors[2]) console.log(`   - ${ancestors[2]}: 2% (L3)`);
  }

  await prisma.$disconnect();
}

// Replicate the getAncestors logic from referral.repository.prisma.ts
async function getAncestors(userId: string, maxLevel: number): Promise<string[]> {
  const path: string[] = [];
  
  for (let lvl = 1; lvl <= maxLevel; lvl++) {
    const link = await prisma.referralLink.findFirst({
      where: { refereeId: userId, level: lvl }
    });
    
    if (!link) break;
    path.push(link.referrerId);
  }
  
  return path;
}

main().catch(console.error);




