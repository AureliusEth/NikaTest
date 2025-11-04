#!/usr/bin/env ts-node
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 Checking Latest Trade\n');

  const trade = await prisma.trade.findFirst({
    where: { userId: { contains: 'COMM_USER_C' } },
    orderBy: { createdAt: 'desc' }
  });

  if (!trade) {
    console.log('No trades found');
    await prisma.$disconnect();
    return;
  }

  console.log(`Latest trade:`);
  console.log(`  ID: ${trade.id}`);
  console.log(`  User ID: ${trade.userId}`);
  console.log(`  Fee: ${trade.feeAmount}`);
  console.log(`  Created: ${trade.createdAt}\n`);

  const ledger = await prisma.commissionLedgerEntry.findMany({
    where: { sourceTradeId: trade.id }
  });

  console.log(`Ledger entries: ${ledger.length}`);
  ledger.forEach(e => {
    console.log(`  - ${e.beneficiaryId}: ${e.amount} (level ${e.level}, dest: ${e.destination})`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);




