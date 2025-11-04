import { PrismaClient } from '@prisma/client';

/**
 * Script to verify cashback is working
 * Checks if level 0 entries exist in ledger and calculates totals
 */
async function main() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Verifying Cashback Functionality\n');
    
    // Check for cashback entries (level 0)
    const cashbackEntries = await prisma.commissionLedgerEntry.findMany({
      where: {
        level: 0,
        token: 'XP',
        destination: 'claimable',
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });
    
    console.log(`📊 Cashback Entries Found: ${cashbackEntries.length}`);
    
    if (cashbackEntries.length === 0) {
      console.log('\n❌ NO CASHBACK ENTRIES FOUND!');
      console.log('   This means cashback is not being generated.\n');
      console.log('   Possible causes:');
      console.log('   1. Users have feeCashbackRate = 0');
      console.log('   2. No trades have been generated since cashback was enabled');
      console.log('   3. Commission policy is not creating level 0 entries\n');
    } else {
      console.log('\n✅ Cashback entries found! Showing last 10:\n');
      cashbackEntries.forEach((entry, i) => {
        console.log(`   ${i + 1}. User: ${entry.beneficiaryId}`);
        console.log(`      Amount: ${entry.amount.toString()} XP`);
        console.log(`      Rate: ${(Number(entry.rate) * 100).toFixed(2)}%`);
        console.log(`      Trade: ${entry.sourceTradeId}`);
        console.log(`      Created: ${entry.createdAt.toISOString()}\n`);
      });
    }
    
    // Calculate total cashback by user
    const cashbackTotals = await prisma.commissionLedgerEntry.groupBy({
      by: ['beneficiaryId'],
      where: {
        level: 0,
        token: 'XP',
        destination: 'claimable',
      },
      _sum: {
        amount: true,
      },
      orderBy: {
        _sum: {
          amount: 'desc',
        },
      },
      take: 10,
    });
    
    console.log('\n💰 Top 10 Users by Cashback Total:\n');
    if (cashbackTotals.length === 0) {
      console.log('   No cashback totals found.');
    } else {
      cashbackTotals.forEach((item, i) => {
        const total = Number(item._sum.amount || 0);
        console.log(`   ${i + 1}. ${item.beneficiaryId}: ${total.toFixed(2)} XP`);
      });
    }
    
    // Check user cashback rates
    const usersWithCashback = await prisma.user.findMany({
      where: {
        feeCashbackRate: { gt: 0 },
      },
      select: {
        id: true,
        email: true,
        feeCashbackRate: true,
      },
      take: 10,
    });
    
    console.log('\n👥 Users with Cashback Enabled (>0%):');
    console.log(`   Total: ${usersWithCashback.length} users\n`);
    usersWithCashback.slice(0, 5).forEach((user, i) => {
      console.log(`   ${i + 1}. ${user.id} (${user.email || 'no email'})`);
      console.log(`      Rate: ${(Number(user.feeCashbackRate) * 100).toFixed(2)}%\n`);
    });
    
    // Check recent trades
    const recentTrades = await prisma.trade.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    
    console.log('\n📈 Recent Trades & Cashback:\n');
    for (const trade of recentTrades) {
      const cashbackEntries = await prisma.commissionLedgerEntry.findMany({
        where: {
          sourceTradeId: trade.id,
          level: 0,
        },
        select: { amount: true, beneficiaryId: true },
      });
      
      console.log(`   Trade: ${trade.id}`);
      console.log(`   User: ${trade.userId}`);
      console.log(`   Fee: ${trade.feeAmount.toString()} XP`);
      console.log(`   Cashback entries: ${cashbackEntries.length}`);
      if (cashbackEntries.length > 0) {
        cashbackEntries.forEach(entry => {
          console.log(`      → ${entry.beneficiaryId}: ${entry.amount.toString()} XP`);
        });
      } else {
        console.log(`      → ❌ No cashback entry found!`);
      }
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();

