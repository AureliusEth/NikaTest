#!/usr/bin/env ts-node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('\n🔍 Checking Claimable Balances for Merkle Tree\n');
    const results = await prisma.$queryRaw `
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
//# sourceMappingURL=test-check-merkle-balances.js.map