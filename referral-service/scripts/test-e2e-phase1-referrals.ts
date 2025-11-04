#!/usr/bin/env ts-node
/**
 * Phase 1 E2E Test: Referral System
 * 
 * Tests:
 * - Referral code generation
 * - User registration with invite codes
 * - Multi-level referral chains (3 levels)
 * - Referral network queries
 * - Edge cases (self-referral, already has referrer)
 * 
 * Usage:
 *   npm run test:e2e-phase1-referrals
 *   or
 *   ts-node scripts/test-e2e-phase1-referrals.ts
 */

import {
  step,
  createUserChain,
  getNetwork,
  authenticateUser,
  apiCall,
  expectError,
  UserCookie
} from './test-helpers';

async function main() {
  console.log('\n🚀 Phase 1 E2E Test: Referral System');
  console.log('='.repeat(70));

  let userCookies: Map<string, UserCookie>;
  const USER_A = 'USER_A';
  const USER_B = 'USER_B';
  const USER_C = 'USER_C';

  try {
    // Test 1: Create 3-level referral chain
    await step('Test 1: Create 3-Level Referral Chain', async () => {
      userCookies = await createUserChain([USER_A, USER_B, USER_C]);
      
      console.log(`  Chain created: ${USER_A} → ${USER_B} → ${USER_C}`);
    });

    // Test 2: Verify referral network for USER_A
    await step('Test 2: Verify USER_A Network', async () => {
      const networkA = await getNetwork(userCookies.get(USER_A)!);
      
      console.log(`  USER_A network:`);
      console.log(`    Level 1: ${networkA.level1.join(', ')}`);
      console.log(`    Level 2: ${networkA.level2.join(', ')}`);
      console.log(`    Level 3: ${networkA.level3.join(', ')}`);

      // Assert USER_A has USER_B at level 1
      const userBActual = userCookies.get(USER_B)!.userId;
      if (!networkA.level1.includes(userBActual)) {
        throw new Error(`USER_A level1 should include ${userBActual}, got: ${networkA.level1.join(', ')}`);
      }
      console.log(`  ✓ USER_B found in USER_A's level 1`);

      // Assert USER_A has USER_C at level 2
      const userCActual = userCookies.get(USER_C)!.userId;
      if (!networkA.level2.includes(userCActual)) {
        throw new Error(`USER_A level2 should include ${userCActual}, got: ${networkA.level2.join(', ')}`);
      }
      console.log(`  ✓ USER_C found in USER_A's level 2`);

      // Assert level 3 is empty
      if (networkA.level3.length > 0) {
        throw new Error(`USER_A level3 should be empty, got: ${networkA.level3.join(', ')}`);
      }
      console.log(`  ✓ USER_A has no level 3 referrals (expected)`);
    });

    // Test 3: Verify referral network for USER_B
    await step('Test 3: Verify USER_B Network', async () => {
      const networkB = await getNetwork(userCookies.get(USER_B)!);
      
      console.log(`  USER_B network:`);
      console.log(`    Level 1: ${networkB.level1.join(', ')}`);
      console.log(`    Level 2: ${networkB.level2.join(', ')}`);
      console.log(`    Level 3: ${networkB.level3.join(', ')}`);

      // Assert USER_B has USER_C at level 1
      const userCActual = userCookies.get(USER_C)!.userId;
      if (!networkB.level1.includes(userCActual)) {
        throw new Error(`USER_B level1 should include ${userCActual}, got: ${networkB.level1.join(', ')}`);
      }
      console.log(`  ✓ USER_C found in USER_B's level 1`);

      // Assert level 2 and 3 are empty
      if (networkB.level2.length > 0 || networkB.level3.length > 0) {
        throw new Error(`USER_B should have no level 2 or 3 referrals`);
      }
      console.log(`  ✓ USER_B has no level 2 or 3 referrals (expected)`);
    });

    // Test 4: Verify referral network for USER_C (leaf node)
    await step('Test 4: Verify USER_C Network (Leaf Node)', async () => {
      const networkC = await getNetwork(userCookies.get(USER_C)!);
      
      console.log(`  USER_C network:`);
      console.log(`    Level 1: ${networkC.level1.join(', ')}`);
      console.log(`    Level 2: ${networkC.level2.join(', ')}`);
      console.log(`    Level 3: ${networkC.level3.join(', ')}`);

      // Assert all levels are empty (USER_C is a leaf node)
      if (networkC.level1.length > 0 || networkC.level2.length > 0 || networkC.level3.length > 0) {
        throw new Error(`USER_C should have no referrals (is leaf node)`);
      }
      console.log(`  ✓ USER_C has no referrals (leaf node, expected)`);
    });

    // Test 5: Edge case - Self-referral should fail
    await step('Test 5: Self-Referral Prevention', async () => {
      const USER_D = 'USER_D';
      const userD = await authenticateUser(USER_D);
      
      // Generate referral code for USER_D
      const codeResponse = await apiCall(
        'POST',
        '/api/referral/generate',
        undefined,
        undefined,
        { Cookie: userD.cookie }
      );
      
      console.log(`  USER_D generated code: ${codeResponse.code}`);

      // Try to register USER_D with their own code (should fail)
      await expectError(
        async () => {
          await apiCall(
            'POST',
            '/api/referral/register',
            undefined,
            { code: codeResponse.code },
            { Cookie: userD.cookie }
          );
        },
        'Cannot self-refer'
      );

      console.log(`  ✓ Self-referral correctly rejected with error`);
    });

    // Test 6: Edge case - Already has referrer
    await step('Test 6: Already Has Referrer Prevention', async () => {
      // USER_B already has USER_A as referrer
      // Try to register USER_B with USER_C's code (should fail)
      
      const userC = userCookies.get(USER_C)!;
      const userB = userCookies.get(USER_B)!;

      // Generate code for USER_C
      const codeResponse = await apiCall(
        'POST',
        '/api/referral/generate',
        undefined,
        undefined,
        { Cookie: userC.cookie }
      );

      console.log(`  USER_C generated code: ${codeResponse.code}`);

      // Try to register USER_B with USER_C's code (should fail)
      await expectError(
        async () => {
          await apiCall(
            'POST',
            '/api/referral/register',
            undefined,
            { code: codeResponse.code },
            { Cookie: userB.cookie }
          );
        },
        'Referrer already set'
      );

      console.log(`  ✓ Double registration correctly rejected with error`);
    });

    // Test 7: Referral code uniqueness
    await step('Test 7: Referral Code Uniqueness', async () => {
      const USER_E = 'USER_E';
      const USER_F = 'USER_F';
      
      const userE = await authenticateUser(USER_E);
      const userF = await authenticateUser(USER_F);

      // Generate codes for both users
      const codeE = await apiCall(
        'POST',
        '/api/referral/generate',
        undefined,
        undefined,
        { Cookie: userE.cookie }
      );

      const codeF = await apiCall(
        'POST',
        '/api/referral/generate',
        undefined,
        undefined,
        { Cookie: userF.cookie }
      );

      console.log(`  USER_E code: ${codeE.code}`);
      console.log(`  USER_F code: ${codeF.code}`);

      // Assert codes are different
      if (codeE.code === codeF.code) {
        throw new Error(`Referral codes should be unique, both got: ${codeE.code}`);
      }
      console.log(`  ✓ Referral codes are unique`);

      // Assert codes are non-empty and valid format
      if (!codeE.code || codeE.code.length === 0) {
        throw new Error(`USER_E code is empty`);
      }
      if (!codeF.code || codeF.code.length === 0) {
        throw new Error(`USER_F code is empty`);
      }
      console.log(`  ✓ Referral codes are non-empty`);
    });

    // Test 8: Multiple calls to generate return same code (idempotency)
    await step('Test 8: Referral Code Idempotency', async () => {
      const USER_G = 'USER_G';
      const userG = await authenticateUser(USER_G);

      // Generate code first time
      const code1 = await apiCall(
        'POST',
        '/api/referral/generate',
        undefined,
        undefined,
        { Cookie: userG.cookie }
      );

      // Generate code second time
      const code2 = await apiCall(
        'POST',
        '/api/referral/generate',
        undefined,
        undefined,
        { Cookie: userG.cookie }
      );

      console.log(`  First call:  ${code1.code}`);
      console.log(`  Second call: ${code2.code}`);

      // Assert both calls return the same code
      if (code1.code !== code2.code) {
        throw new Error(`Expected same code on multiple calls, got: ${code1.code} and ${code2.code}`);
      }
      console.log(`  ✓ Multiple generate calls return same code (idempotent)`);
    });

    console.log('\n' + '='.repeat(70));
    console.log('✅ ALL PHASE 1 REFERRAL TESTS PASSED!');
    console.log('='.repeat(70));
    console.log('\n🎉 Referral system is working correctly!');
    console.log('\n📊 Test Summary:');
    console.log('   ✓ 3-level referral chain creation');
    console.log('   ✓ Network queries return correct hierarchies');
    console.log('   ✓ Self-referral prevention');
    console.log('   ✓ Double registration prevention');
    console.log('   ✓ Referral code uniqueness');
    console.log('   ✓ Referral code idempotency');

  } catch (error) {
    console.error('\n' + '='.repeat(70));
    console.error('❌ PHASE 1 REFERRAL TEST SUITE FAILED');
    console.error('='.repeat(70));
    console.error('\n', error);
    process.exit(1);
  }
}

main();




