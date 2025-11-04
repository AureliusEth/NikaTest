#!/usr/bin/env tsx
/**
 * Debug script to check why trade counts aren't updating for matthewpinnock.mp@gmail.com
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userEmail = 'matthewpinnock.mp@gmail.com';
  
  console.log(`\n🔍 Checking trades for ${userEmail}...\n`);
  
  // 1. Find the user
  const user = await prisma.user.findUnique({
    where: { email: userEmail }
  });
  
  if (!user) {
    console.log('❌ User not found');
    await prisma.$disconnect();
    return;
  }
  
  console.log(`✅ User found: ${user.id}`);
  
  // Check trades directly
  const userTrades = await prisma.trade.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { id: true, feeAmount: true, chain: true, createdAt: true }
  });
  
  console.log(`📍 Total trades in Trade table: ${userTrades.length}`);
  console.log(`📋 Last 5 trades:`);
  userTrades.slice(0, 5).forEach(t => {
    console.log(`   ${t.id} - Fee: ${t.feeAmount}, Chain: ${t.chain}, Created: ${t.createdAt}`);
  });
  
  // 2. Check referrals
  const referrals = await prisma.referralLink.findMany({
    where: { referrerId: user.id }
  });
  
  console.log(`\n📊 Referrals: ${referrals.length}`);
  
  for (const ref of referrals) {
    // Get referee user
    const referee = await prisma.user.findUnique({
      where: { id: ref.refereeId }
    });
    
    if (!referee) {
      console.log(`\n   ⚠️  Referee ${ref.refereeId} not found`);
      continue;
    }
    
    console.log(`\n   Referee: ${referee.email} (${ref.refereeId})`);
    console.log(`   Level: ${ref.level}`);
    
    // Get trades for this referee
    const refereeTrades = await prisma.trade.findMany({
      where: { userId: ref.refereeId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, feeAmount: true, chain: true, createdAt: true }
    });
    
    console.log(`   Their trades: ${refereeTrades.length}`);
    refereeTrades.forEach(t => {
      console.log(`     Trade: ${t.id} - Fee: ${t.feeAmount}, Chain: ${t.chain}, Created: ${t.createdAt}`);
    });
    
    // Check ledger entries for this referee's trades
    const ledgerEntries = await prisma.commissionLedgerEntry.findMany({
      where: {
        beneficiaryId: user.id,
        sourceTradeId: { in: refereeTrades.map(t => t.id) },
        level: ref.level
      },
      select: {
        id: true,
        sourceTradeId: true,
        amount: true,
        level: true,
        createdAt: true
      }
    });
    
    console.log(`   Ledger entries for referrer: ${ledgerEntries.length}`);
    ledgerEntries.forEach(le => {
      console.log(`     Entry: ${le.id} - Trade: ${le.sourceTradeId}, Amount: ${le.amount}, Level: ${le.level}`);
    });
  }
  
  // 3. Check what getRefereeEarnings query returns
  console.log(`\n🔍 Running getRefereeEarnings query...`);
  const earningsQuery = await prisma.$queryRaw<Array<{ userId: string; level: number; totalEarned: string; tradeCount: string }>>`
    SELECT 
      t."userId",
      l.level,
      SUM(l.amount)::text as "totalEarned",
      COUNT(DISTINCT l."sourceTradeId")::text as "tradeCount"
    FROM "CommissionLedgerEntry" l
    INNER JOIN "Trade" t ON l."sourceTradeId" = t.id
    WHERE l."beneficiaryId" = ${user.id}
      AND l.level > 0
    GROUP BY t."userId", l.level
    ORDER BY l.level ASC, SUM(l.amount) DESC
  `;
  
  console.log(`\n📈 Query results:`);
  earningsQuery.forEach(row => {
    console.log(`   User: ${row.userId}, Level: ${row.level}, Earned: ${row.totalEarned}, Trade Count: ${row.tradeCount}`);
  });
  
  // 4. Check all ledger entries for this user
  const allLedgerEntries = await prisma.commissionLedgerEntry.findMany({
    where: { beneficiaryId: user.id, level: { gt: 0 } },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  
  console.log(`\n📝 All ledger entries (last 10):`);
  for (const le of allLedgerEntries) {
    // Get trade info separately
    const trade = await prisma.trade.findUnique({
      where: { id: le.sourceTradeId },
      select: { userId: true, chain: true, feeAmount: true }
    });
    
    console.log(`   Entry: ${le.id} - Trade: ${le.sourceTradeId}, Referee: ${trade?.userId || 'N/A'}, Level: ${le.level}, Amount: ${le.amount}, Chain: ${trade?.chain || 'N/A'}`);
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);

