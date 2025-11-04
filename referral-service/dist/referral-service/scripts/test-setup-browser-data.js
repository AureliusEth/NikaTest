"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('\n🧪 Setting up data for testuser@example.com...\n');
    const userId = 'testuser@example.com';
    try {
        console.log('Creating trade...');
        const trade = await prisma.trade.create({
            data: {
                id: `BROWSER_TEST_${Date.now()}`,
                userId,
                feeAmount: 1000,
            },
        });
        console.log(`✓ Created trade: ${trade.id}`);
        console.log(`  Fee: 1000 XP`);
        console.log(`  User earnings: 0 XP (no referrals, no cashback)`);
        console.log(`  Treasury: 1000 XP\n`);
        const evmTreasuryAddress = process.env.EVM_TREASURY_ADDRESS || '0xTREASURY';
        await prisma.treasuryAccount.upsert({
            where: {
                chain_token_address: {
                    chain: 'EVM',
                    token: 'XP',
                    address: evmTreasuryAddress,
                },
            },
            create: {
                chain: 'EVM',
                token: 'XP',
                address: evmTreasuryAddress,
                balance: 1000,
                claimed: 0,
            },
            update: {
                balance: {
                    increment: 1000,
                },
            },
        });
        console.log('✓ Updated EVM treasury balance\n');
        console.log('✅ Setup complete!');
        console.log('\nNext steps:');
        console.log('1. Refresh the browser earnings page');
        console.log('2. Click "Generate All Merkle Roots" button');
        console.log('3. Try the claim flow (user will have 0 claimable)\n');
    }
    catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
    }
}
main();
//# sourceMappingURL=test-setup-browser-data.js.map