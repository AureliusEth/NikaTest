#!/usr/bin/env ts-node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('\n🔍 Debugging Commission Distribution\n');
    const recentTrade = await prisma.trade.findFirst({
        where: { userId: { contains: 'COMM_USER' } },
        orderBy: { createdAt: 'desc' }
    });
    if (!recentTrade) {
        console.log('❌ No trades found for COMM_USER users');
        console.log('Run the commission test first to create test data\n');
        return;
    }
    console.log('✅ Found trade:', {
        id: recentTrade.id,
        userId: recentTrade.userId,
        feeAmount: recentTrade.feeAmount.toString(),
        chain: recentTrade.chain
    });
    const ledgerEntries = await prisma.commissionLedgerEntry.findMany({
        where: { sourceTradeId: recentTrade.id }
    });
    console.log(`\n📊 Ledger Entries: ${ledgerEntries.length} found`);
    if (ledgerEntries.length === 0) {
        console.log('❌ NO LEDGER ENTRIES CREATED!');
        console.log('   Issue: Commission calculation or recording failed\n');
        return;
    }
    ledgerEntries.forEach((entry, i) => {
        console.log(`\n  Entry ${i + 1}:`);
        console.log(`    Beneficiary: ${entry.beneficiaryId}`);
        console.log(`    Level: ${entry.level} (${getLevelName(entry.level)})`);
        console.log(`    Amount: ${entry.amount.toString()} ${entry.token}`);
        console.log(`    Rate: ${(Number(entry.rate) * 100).toFixed(2)}%`);
        console.log(`    Destination: ${entry.destination}`);
    });
    console.log(`\n\n💰 Earnings Summary:\n`);
    const beneficiaries = [...new Set(ledgerEntries.map(e => e.beneficiaryId))];
    for (const benefId of beneficiaries) {
        const entries = ledgerEntries.filter(e => e.beneficiaryId === benefId);
        const claimable = entries.filter(e => e.destination === 'claimable');
        const treasury = entries.filter(e => e.destination === 'treasury');
        const claimableTotal = claimable.reduce((sum, e) => sum + Number(e.amount), 0);
        const treasuryTotal = treasury.reduce((sum, e) => sum + Number(e.amount), 0);
        console.log(`  ${benefId}:`);
        console.log(`    Claimable: ${claimableTotal} ${entries[0].token}`);
        console.log(`    Treasury: ${treasuryTotal} ${entries[0].token}`);
        console.log(`    Total: ${claimableTotal + treasuryTotal} ${entries[0].token}`);
    }
    console.log(`\n\n🔍 Testing getEarningsSummary query:\n`);
    for (const benefId of beneficiaries.filter(b => b !== 'NIKA_TREASURY')) {
        const rows = await prisma.commissionLedgerEntry.groupBy({
            by: ['level'],
            _sum: { amount: true },
            where: { beneficiaryId: benefId }
        });
        let total = 0;
        const byLevel = {};
        for (const r of rows) {
            const val = Number(r._sum.amount ?? 0);
            byLevel[r.level] = val;
            total += val;
        }
        console.log(`  ${benefId}:`);
        console.log(`    Query result: ${total} total`);
        console.log(`    By level:`, byLevel);
        const claimableRows = await prisma.commissionLedgerEntry.groupBy({
            by: ['level'],
            _sum: { amount: true },
            where: {
                beneficiaryId: benefId,
                destination: 'claimable'
            }
        });
        let claimableTotal = 0;
        const claimableByLevel = {};
        for (const r of claimableRows) {
            const val = Number(r._sum.amount ?? 0);
            claimableByLevel[r.level] = val;
            claimableTotal += val;
        }
        console.log(`    With 'claimable' filter: ${claimableTotal} total`);
        console.log(`    By level:`, claimableByLevel);
        if (total !== claimableTotal) {
            console.log(`    ⚠️  Difference: ${total - claimableTotal} (treasury earnings included)`);
        }
    }
    console.log('\n\n🎯 Root Cause Analysis:\n');
    if (ledgerEntries.length > 0) {
        console.log('✅ Ledger entries ARE being created');
        const hasClaimable = ledgerEntries.some(e => e.destination === 'claimable');
        if (hasClaimable) {
            console.log('✅ Claimable entries exist');
            console.log('❌ ISSUE: getEarningsSummary() is NOT filtering by destination="claimable"');
            console.log('   FIX: Add destination filter to ledger.repository.prisma.ts line 26');
        }
        else {
            console.log('❌ NO claimable entries (all go to treasury)');
            console.log('   Check commission policy and destination assignment');
        }
    }
    await prisma.$disconnect();
}
function getLevelName(level) {
    switch (level) {
        case -1: return 'Treasury';
        case 0: return 'Cashback';
        case 1: return 'L1 Commission';
        case 2: return 'L2 Commission';
        case 3: return 'L3 Commission';
        default: return 'Unknown';
    }
}
main().catch(console.error);
//# sourceMappingURL=test-debug-commissions.js.map