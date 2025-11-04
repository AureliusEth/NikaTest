#!/usr/bin/env ts-node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_helpers_1 = require("./test-helpers");
async function main() {
    console.log('\n🚀 Phase 1 E2E Test: Referral System');
    console.log('='.repeat(70));
    let userCookies;
    const USER_A = 'USER_A';
    const USER_B = 'USER_B';
    const USER_C = 'USER_C';
    try {
        await (0, test_helpers_1.step)('Test 1: Create 3-Level Referral Chain', async () => {
            userCookies = await (0, test_helpers_1.createUserChain)([USER_A, USER_B, USER_C]);
            console.log(`  Chain created: ${USER_A} → ${USER_B} → ${USER_C}`);
        });
        await (0, test_helpers_1.step)('Test 2: Verify USER_A Network', async () => {
            const networkA = await (0, test_helpers_1.getNetwork)(userCookies.get(USER_A));
            console.log(`  USER_A network:`);
            console.log(`    Level 1: ${networkA.level1.join(', ')}`);
            console.log(`    Level 2: ${networkA.level2.join(', ')}`);
            console.log(`    Level 3: ${networkA.level3.join(', ')}`);
            const userBActual = userCookies.get(USER_B).userId;
            if (!networkA.level1.includes(userBActual)) {
                throw new Error(`USER_A level1 should include ${userBActual}, got: ${networkA.level1.join(', ')}`);
            }
            console.log(`  ✓ USER_B found in USER_A's level 1`);
            const userCActual = userCookies.get(USER_C).userId;
            if (!networkA.level2.includes(userCActual)) {
                throw new Error(`USER_A level2 should include ${userCActual}, got: ${networkA.level2.join(', ')}`);
            }
            console.log(`  ✓ USER_C found in USER_A's level 2`);
            if (networkA.level3.length > 0) {
                throw new Error(`USER_A level3 should be empty, got: ${networkA.level3.join(', ')}`);
            }
            console.log(`  ✓ USER_A has no level 3 referrals (expected)`);
        });
        await (0, test_helpers_1.step)('Test 3: Verify USER_B Network', async () => {
            const networkB = await (0, test_helpers_1.getNetwork)(userCookies.get(USER_B));
            console.log(`  USER_B network:`);
            console.log(`    Level 1: ${networkB.level1.join(', ')}`);
            console.log(`    Level 2: ${networkB.level2.join(', ')}`);
            console.log(`    Level 3: ${networkB.level3.join(', ')}`);
            const userCActual = userCookies.get(USER_C).userId;
            if (!networkB.level1.includes(userCActual)) {
                throw new Error(`USER_B level1 should include ${userCActual}, got: ${networkB.level1.join(', ')}`);
            }
            console.log(`  ✓ USER_C found in USER_B's level 1`);
            if (networkB.level2.length > 0 || networkB.level3.length > 0) {
                throw new Error(`USER_B should have no level 2 or 3 referrals`);
            }
            console.log(`  ✓ USER_B has no level 2 or 3 referrals (expected)`);
        });
        await (0, test_helpers_1.step)('Test 4: Verify USER_C Network (Leaf Node)', async () => {
            const networkC = await (0, test_helpers_1.getNetwork)(userCookies.get(USER_C));
            console.log(`  USER_C network:`);
            console.log(`    Level 1: ${networkC.level1.join(', ')}`);
            console.log(`    Level 2: ${networkC.level2.join(', ')}`);
            console.log(`    Level 3: ${networkC.level3.join(', ')}`);
            if (networkC.level1.length > 0 || networkC.level2.length > 0 || networkC.level3.length > 0) {
                throw new Error(`USER_C should have no referrals (is leaf node)`);
            }
            console.log(`  ✓ USER_C has no referrals (leaf node, expected)`);
        });
        await (0, test_helpers_1.step)('Test 5: Self-Referral Prevention', async () => {
            const USER_D = 'USER_D';
            const userD = await (0, test_helpers_1.authenticateUser)(USER_D);
            const codeResponse = await (0, test_helpers_1.apiCall)('POST', '/api/referral/generate', undefined, undefined, { Cookie: userD.cookie });
            console.log(`  USER_D generated code: ${codeResponse.code}`);
            await (0, test_helpers_1.expectError)(async () => {
                await (0, test_helpers_1.apiCall)('POST', '/api/referral/register', undefined, { code: codeResponse.code }, { Cookie: userD.cookie });
            }, 'Cannot self-refer');
            console.log(`  ✓ Self-referral correctly rejected with error`);
        });
        await (0, test_helpers_1.step)('Test 6: Already Has Referrer Prevention', async () => {
            const userC = userCookies.get(USER_C);
            const userB = userCookies.get(USER_B);
            const codeResponse = await (0, test_helpers_1.apiCall)('POST', '/api/referral/generate', undefined, undefined, { Cookie: userC.cookie });
            console.log(`  USER_C generated code: ${codeResponse.code}`);
            await (0, test_helpers_1.expectError)(async () => {
                await (0, test_helpers_1.apiCall)('POST', '/api/referral/register', undefined, { code: codeResponse.code }, { Cookie: userB.cookie });
            }, 'Referrer already set');
            console.log(`  ✓ Double registration correctly rejected with error`);
        });
        await (0, test_helpers_1.step)('Test 7: Referral Code Uniqueness', async () => {
            const USER_E = 'USER_E';
            const USER_F = 'USER_F';
            const userE = await (0, test_helpers_1.authenticateUser)(USER_E);
            const userF = await (0, test_helpers_1.authenticateUser)(USER_F);
            const codeE = await (0, test_helpers_1.apiCall)('POST', '/api/referral/generate', undefined, undefined, { Cookie: userE.cookie });
            const codeF = await (0, test_helpers_1.apiCall)('POST', '/api/referral/generate', undefined, undefined, { Cookie: userF.cookie });
            console.log(`  USER_E code: ${codeE.code}`);
            console.log(`  USER_F code: ${codeF.code}`);
            if (codeE.code === codeF.code) {
                throw new Error(`Referral codes should be unique, both got: ${codeE.code}`);
            }
            console.log(`  ✓ Referral codes are unique`);
            if (!codeE.code || codeE.code.length === 0) {
                throw new Error(`USER_E code is empty`);
            }
            if (!codeF.code || codeF.code.length === 0) {
                throw new Error(`USER_F code is empty`);
            }
            console.log(`  ✓ Referral codes are non-empty`);
        });
        await (0, test_helpers_1.step)('Test 8: Referral Code Idempotency', async () => {
            const USER_G = 'USER_G';
            const userG = await (0, test_helpers_1.authenticateUser)(USER_G);
            const code1 = await (0, test_helpers_1.apiCall)('POST', '/api/referral/generate', undefined, undefined, { Cookie: userG.cookie });
            const code2 = await (0, test_helpers_1.apiCall)('POST', '/api/referral/generate', undefined, undefined, { Cookie: userG.cookie });
            console.log(`  First call:  ${code1.code}`);
            console.log(`  Second call: ${code2.code}`);
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
    }
    catch (error) {
        console.error('\n' + '='.repeat(70));
        console.error('❌ PHASE 1 REFERRAL TEST SUITE FAILED');
        console.error('='.repeat(70));
        console.error('\n', error);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=test-e2e-phase1-referrals.js.map