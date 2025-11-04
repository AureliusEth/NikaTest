#!/usr/bin/env ts-node
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 Checking Claimable Balances for Merkle Tree\n');

  // Query claimable balances like MerkleTreeService does
  const results = await prisma.$queryRaw<Array<{ beneficiaryId: string; totalAmount: string }>>`
    SELECT 
      l."beneficiaryId",
      SUM(l.amount)::text as "totalAmount"
    FROM "CommissionLedgerEntry" l
    INNER JOIN "Trade" t ON l."sourceTradeId" = t.id
    WHERE l.destination = 'claimable'
      AND l.token = 'XP'
      AND t.chain = 'EVM'
    GROUP BY l."beneficiaryId"
    HAVING SUM(l.amount) > 0
  `;

  console.log(`Found ${results.length} users with claimable balances:`);
  results.forEach(r => {
    console.log(`  ${r.beneficiaryId}: ${r.totalAmount} XP`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);



