#!/usr/bin/env tsx
/**
 * Reset all claim records to test double-spend fix
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Resetting all claim records...');
  
  const deleted = await prisma.claimRecord.deleteMany({});
  
  console.log(`✓ Deleted ${deleted.count} claim records`);
  
  // Show current state
  const users = await prisma.user.findMany({
    take: 5,
    select: { id: true, email: true },
  });
  
  console.log('\n📊 Sample users:');
  for (const user of users) {
    const earned = await prisma.$queryRaw<Array<{ total: string }>>`
      SELECT SUM(l.amount)::text as total
      FROM "CommissionLedgerEntry" l
      WHERE l."beneficiaryId" = ${user.id}
        AND l.destination = 'claimable'
    `;
    
    const totalEarned = earned[0]?.total ? parseFloat(earned[0].total) : 0;
    console.log(`  ${user.email}: ${totalEarned.toFixed(2)} XP earned (all now claimable)`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());



