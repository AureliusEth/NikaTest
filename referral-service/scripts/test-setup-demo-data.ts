import { 
  authenticateUser, 
  createUserChain, 
  makeTrade, 
  cleanupTestUsers, 
  disconnectDatabase,
  sleep 
} from './test-helpers';

async function main() {
  console.log('\n🧪 Setting up demo data for browser testing...\n');

  try {
    // Clean up any existing demo data
    await cleanupTestUsers('DEMO');
    console.log('✓ Cleaned up existing demo data\n');

    // Create test user
    console.log('Creating test user...');
    const testUser = await authenticateUser('DEMO_USER_1');
    console.log(`✓ Created: ${testUser.userId}\n`);

    // Create trades to generate earnings
    console.log('Creating trades to generate earnings...');
    await makeTrade(testUser.userId, 1000, 'EVM', 'XP', testUser);
    await sleep(1000);
    await makeTrade(testUser.userId, 500, 'SVM', 'XP', testUser);
    await sleep(1000);
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

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

main();



