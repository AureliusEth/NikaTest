"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_helpers_1 = require("./test-helpers");
async function main() {
    console.log('\n🧪 Setting up demo data for browser testing...\n');
    try {
        await (0, test_helpers_1.cleanupTestUsers)('DEMO');
        console.log('✓ Cleaned up existing demo data\n');
        console.log('Creating test user...');
        const testUser = await (0, test_helpers_1.authenticateUser)('DEMO_USER_1');
        console.log(`✓ Created: ${testUser.userId}\n`);
        console.log('Creating trades to generate earnings...');
        await (0, test_helpers_1.makeTrade)(testUser.userId, 1000, 'EVM', 'XP', testUser);
        await (0, test_helpers_1.sleep)(1000);
        await (0, test_helpers_1.makeTrade)(testUser.userId, 500, 'SVM', 'XP', testUser);
        await (0, test_helpers_1.sleep)(1000);
        console.log('✓ Created 2 trades (1500 XP total fees)\n');
        console.log('Expected earnings:');
        console.log('  • No cashback (feeCashbackRate = 0)');
        console.log('  • Total claimable: 0 XP (user has no referrals)');
        console.log('  • Treasury: 100% of fees = 1500 XP\n');
        console.log('✅ Demo data setup complete!');
        console.log('\nNext steps:');
        console.log('1. Refresh the browser earnings page');
        console.log('2. Click "Generate All Merkle Roots"');
        console.log('3. Try clicking a claim button\n');
    }
    catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
    finally {
        await (0, test_helpers_1.disconnectDatabase)();
    }
}
main();
//# sourceMappingURL=test-setup-demo-data.js.map