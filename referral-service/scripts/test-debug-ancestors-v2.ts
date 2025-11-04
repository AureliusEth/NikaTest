#!/usr/bin/env ts-node
/**
 * Debug Script: Get Ancestors V2
 * 
 * Use the ACTUAL getAncestors logic from the repository
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 Testing ACTUAL getAncestors() Logic\n');

  const tradeUser = await prisma.user.findFirst({
    where: { email: 'COMM_USER_C@test.com' }
  });

  if (!tradeUser) {
    console.log('❌ COMM_USER_C not found');
    await prisma.$disconnect();
    return;
  }

  console.log(`Testing with: ${tradeUser.id}\n`);

  // Use ACTUAL repository logic (from referral.repository.prisma.ts)
  const ancestors: string[] = [];
  let current = tradeUser.id;
  const maxLevels = 3;
  
  console.log(`Starting chain traversal from: ${current}\n`);
  
  while (ancestors.length < maxLevels) {
    console.log(`  Step ${ancestors.length + 1}: Looking for referral link where refereeId = "${current}"`);
    
    const link = await prisma.referralLink.findUnique({ 
      where: { refereeId: current } 
    });
    
    if (!link) {
      console.log(`    ❌ No link found. Chain ends here.`);
      break;
    }
    
    console.log(`    ✓ Found link: referrerId = "${link.referrerId}", level = ${link.level}`);
    ancestors.push(link.referrerId);
    current = link.referrerId;  // Move up the chain
  }

  console.log(`\n✅ Final ancestors array: [${ancestors.join(', ')}]`);
  console.log(`   Length: ${ancestors.length}\n`);

  if (ancestors.length === 0) {
    console.log(`❌ PROBLEM: No ancestors found!`);
    console.log(`   Check if referral links exist in database`);
    
    // Manual check
    const allLinks = await prisma.referralLink.findMany({
      where: {
        OR: [
          { refereeId: tradeUser.id },
          { referrerId: tradeUser.id }
        ]
      }
    });
    
    console.log(`\n   Referral links involving this user:`, allLinks);
  } else {
    console.log(`✅ Ancestors found successfully!`);
    console.log(`   Commission should flow to:`);
    ancestors.forEach((ancestorId, idx) => {
      const rate = idx === 0 ? 30 : idx === 1 ? 3 : 2;
      console.log(`     ${ancestorId}: ${rate}% (L${idx + 1})`);
    });
  }

  await prisma.$disconnect();
}

main().catch(console.error);




