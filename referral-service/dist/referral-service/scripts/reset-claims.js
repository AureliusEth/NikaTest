#!/usr/bin/env tsx
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🧹 Resetting all claim records...');
    const deleted = await prisma.claimRecord.deleteMany({});
    console.log(`✓ Deleted ${deleted.count} claim records`);
    const users = await prisma.user.findMany({
        take: 5,
        select: { id: true, email: true },
    });
    console.log('\n📊 Sample users:');
    for (const user of users) {
        const earned = await prisma.$queryRaw `
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
//# sourceMappingURL=reset-claims.js.map