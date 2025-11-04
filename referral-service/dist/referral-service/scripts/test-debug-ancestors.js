#!/usr/bin/env ts-node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('\n🔍 Debugging getAncestors() Function\n');
    const testUsers = ['COMM_USER_A', 'COMM_USER_B', 'COMM_USER_C'];
    for (const userId of testUsers) {
        console.log(`\n📋 User: ${userId}`);
        const user = await prisma.user.findFirst({
            where: { email: `${userId}@test.com` }
        });
        if (!user) {
            console.log(`  ❌ User not found in database`);
            continue;
        }
        console.log(`  ✓ Found in DB: ${user.id}`);
        const asReferee = await prisma.referralLink.findMany({
            where: { refereeId: user.id }
        });
        if (asReferee.length === 0) {
            console.log(`  ❌ NO REFERRER FOUND (not registered under anyone)`);
        }
        else {
            console.log(`  ✓ Has referrer(s):`, asReferee.map(r => ({
                referrer: r.referrerId,
                level: r.level
            })));
        }
        const asReferrer = await prisma.referralLink.findMany({
            where: { referrerId: user.id }
        });
        if (asReferrer.length === 0) {
            console.log(`  ℹ️  No downline (hasn't referred anyone)`);
        }
        else {
            console.log(`  ✓ Referred ${asReferrer.length} user(s):`, asReferrer.map(r => ({
                referee: r.refereeId,
                level: r.level
            })));
        }
        const ancestors = await getAncestors(user.id, 3);
        console.log(`  🔍 getAncestors(${user.id}, 3) returned:`, ancestors);
    }
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
    }
    else {
        console.log(`\n✅ Ancestors found correctly`);
        console.log(`   Expected commissions:`);
        console.log(`   - ${ancestors[0]}: 30% (L1)`);
        if (ancestors[1])
            console.log(`   - ${ancestors[1]}: 3% (L2)`);
        if (ancestors[2])
            console.log(`   - ${ancestors[2]}: 2% (L3)`);
    }
    await prisma.$disconnect();
}
async function getAncestors(userId, maxLevel) {
    const path = [];
    for (let lvl = 1; lvl <= maxLevel; lvl++) {
        const link = await prisma.referralLink.findFirst({
            where: { refereeId: userId, level: lvl }
        });
        if (!link)
            break;
        path.push(link.referrerId);
    }
    return path;
}
main().catch(console.error);
//# sourceMappingURL=test-debug-ancestors.js.map