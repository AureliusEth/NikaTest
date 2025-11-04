#!/usr/bin/env ts-node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('\n🔍 Verifying Ledger Entries\n');
    const trade = await prisma.trade.findFirst({
        where: { userId: { contains: 'COMM_USER_C' } },
        orderBy: { createdAt: 'desc' }
    });
    if (!trade) {
        console.log('No trades found');
        await prisma.$disconnect();
        return;
    }
    console.log(`Latest trade: ${trade.id}`);
    console.log(`User ID: ${trade.userId}\n`);
    const ledger = await prisma.commissionLedgerEntry.findMany({
        where: { sourceTradeId: trade.id }
    });
    console.log(`Total ledger entries: ${ledger.length}\n`);
    let totalClaimable = 0;
    let totalTreasury = 0;
    ledger.forEach((e, i) => {
        const amount = Number(e.amount);
        console.log(`Entry ${i + 1}:`);
        console.log(`  Beneficiary: ${e.beneficiaryId}`);
        console.log(`  Level: ${e.level}`);
        console.log(`  Amount: ${amount} ${e.token}`);
        console.log(`  Destination: ${e.destination}`);
        console.log(`  Rate: ${(Number(e.rate) * 100).toFixed(2)}%\n`);
        if (e.destination === 'claimable')
            totalClaimable += amount;
        if (e.destination === 'treasury')
            totalTreasury += amount;
    });
    console.log(`Summary:`);
    console.log(`  Claimable: ${totalClaimable}`);
    console.log(`  Treasury: ${totalTreasury}`);
    console.log(`  Total: ${totalClaimable + totalTreasury}`);
    console.log(`  Trade Fee: ${trade.feeAmount}`);
    await prisma.$disconnect();
}
main().catch(console.error);
//# sourceMappingURL=test-verify-ledger.js.map