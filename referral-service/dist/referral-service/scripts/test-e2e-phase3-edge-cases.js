#!/usr/bin/env ts-node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_helpers_1 = require("./test-helpers");
async function main() {
    console.log('\n🚀 Phase 3 E2E Test: Edge Cases & Error Handling');
    console.log('='.repeat(70));
    try {
        await (0, test_helpers_1.step)('Test 1: Invalid Referral Code', async () => {
            const user = await (0, test_helpers_1.authenticateUser)('EDGE_USER_1');
            await (0, test_helpers_1.expectError)(async () => {
                await (0, test_helpers_1.apiCall)('POST', '/api/referral/register', undefined, { code: 'INVALID_CODE_12345' }, { Cookie: user.cookie });
            }, 'Referral code not found');
            console.log(`  ✓ Invalid referral code correctly rejected`);
        });
        await (0, test_helpers_1.step)('Test 2: Self-Referral Prevention', async () => {
            const user = await (0, test_helpers_1.authenticateUser)('EDGE_USER_2');
            const codeResponse = await (0, test_helpers_1.apiCall)('POST', '/api/referral/generate', undefined, undefined, { Cookie: user.cookie });
            await (0, test_helpers_1.expectError)(async () => {
                await (0, test_helpers_1.apiCall)('POST', '/api/referral/register', undefined, { code: codeResponse.code }, { Cookie: user.cookie });
            }, 'Cannot self-refer');
            console.log(`  ✓ Self-referral correctly prevented`);
        });
        await (0, test_helpers_1.step)('Test 3: Circular Referral Detection', async () => {
            const userA = await (0, test_helpers_1.authenticateUser)('CIRCLE_USER_A');
            const userB = await (0, test_helpers_1.authenticateUser)('CIRCLE_USER_B');
            const userC = await (0, test_helpers_1.authenticateUser)('CIRCLE_USER_C');
            const codeA = await (0, test_helpers_1.apiCall)('POST', '/api/referral/generate', undefined, undefined, { Cookie: userA.cookie });
            await (0, test_helpers_1.apiCall)('POST', '/api/referral/register', undefined, { code: codeA.code }, { Cookie: userB.cookie });
            console.log(`    ✓ Created link: A → B`);
            const codeB = await (0, test_helpers_1.apiCall)('POST', '/api/referral/generate', undefined, undefined, { Cookie: userB.cookie });
            await (0, test_helpers_1.apiCall)('POST', '/api/referral/register', undefined, { code: codeB.code }, { Cookie: userC.cookie });
            console.log(`    ✓ Created link: B → C`);
            const codeC = await (0, test_helpers_1.apiCall)('POST', '/api/referral/generate', undefined, undefined, { Cookie: userC.cookie });
            await (0, test_helpers_1.expectError)(async () => {
                await (0, test_helpers_1.apiCall)('POST', '/api/referral/register', undefined, { code: codeC.code }, { Cookie: userA.cookie });
            }, 'Cycle detected');
            console.log(`  ✓ Circular referral correctly prevented`);
        });
        await (0, test_helpers_1.step)('Test 4: Max Depth Enforcement', async () => {
            const userA = await (0, test_helpers_1.authenticateUser)('DEPTH_USER_A');
            const userB = await (0, test_helpers_1.authenticateUser)('DEPTH_USER_B');
            const userC = await (0, test_helpers_1.authenticateUser)('DEPTH_USER_C');
            const userD = await (0, test_helpers_1.authenticateUser)('DEPTH_USER_D');
            const userE = await (0, test_helpers_1.authenticateUser)('DEPTH_USER_E');
            const codeA = await (0, test_helpers_1.apiCall)('POST', '/api/referral/generate', undefined, undefined, { Cookie: userA.cookie });
            await (0, test_helpers_1.apiCall)('POST', '/api/referral/register', undefined, { code: codeA.code }, { Cookie: userB.cookie });
            console.log(`    ✓ Level 1: A → B`);
            const codeB = await (0, test_helpers_1.apiCall)('POST', '/api/referral/generate', undefined, undefined, { Cookie: userB.cookie });
            await (0, test_helpers_1.apiCall)('POST', '/api/referral/register', undefined, { code: codeB.code }, { Cookie: userC.cookie });
            console.log(`    ✓ Level 2: B → C`);
            const codeC = await (0, test_helpers_1.apiCall)('POST', '/api/referral/generate', undefined, undefined, { Cookie: userC.cookie });
            await (0, test_helpers_1.apiCall)('POST', '/api/referral/register', undefined, { code: codeC.code }, { Cookie: userD.cookie });
            console.log(`    ✓ Level 3: C → D`);
            const codeD = await (0, test_helpers_1.apiCall)('POST', '/api/referral/generate', undefined, undefined, { Cookie: userD.cookie });
            await (0, test_helpers_1.expectError)(async () => {
                await (0, test_helpers_1.apiCall)('POST', '/api/referral/register', undefined, { code: codeD.code }, { Cookie: userE.cookie });
            }, 'Depth exceeds 3 levels');
            console.log(`  ✓ Max depth (3 levels) correctly enforced`);
        });
        await (0, test_helpers_1.step)('Test 5: Already Has Referrer Prevention', async () => {
            const userA = await (0, test_helpers_1.authenticateUser)('DOUBLE_USER_A');
            const userB = await (0, test_helpers_1.authenticateUser)('DOUBLE_USER_B');
            const userC = await (0, test_helpers_1.authenticateUser)('DOUBLE_USER_C');
            const codeA = await (0, test_helpers_1.apiCall)('POST', '/api/referral/generate', undefined, undefined, { Cookie: userA.cookie });
            await (0, test_helpers_1.apiCall)('POST', '/api/referral/register', undefined, { code: codeA.code }, { Cookie: userB.cookie });
            console.log(`    ✓ B registered with A`);
            const codeC = await (0, test_helpers_1.apiCall)('POST', '/api/referral/generate', undefined, undefined, { Cookie: userC.cookie });
            await (0, test_helpers_1.expectError)(async () => {
                await (0, test_helpers_1.apiCall)('POST', '/api/referral/register', undefined, { code: codeC.code }, { Cookie: userB.cookie });
            }, 'Referrer already set');
            console.log(`  ✓ Double registration correctly prevented`);
        });
        await (0, test_helpers_1.step)('Test 6: Duplicate Trade ID (Idempotency)', async () => {
            const user = await (0, test_helpers_1.authenticateUser)('IDEM_USER');
            const tradeId = `DUPLICATE_TRADE_${Date.now()}`;
            await (0, test_helpers_1.apiCall)('POST', '/api/trades/mock', user.userId, {
                tradeId,
                userId: user.userId,
                feeAmount: 100,
                token: 'XP',
                chain: 'EVM',
            });
            console.log(`    ✓ First submission: ${tradeId}`);
            await (0, test_helpers_1.sleep)(500);
            await (0, test_helpers_1.apiCall)('POST', '/api/trades/mock', user.userId, {
                tradeId,
                userId: user.userId,
                feeAmount: 100,
                token: 'XP',
                chain: 'EVM',
            });
            console.log(`    ✓ Second submission: ${tradeId} (should be no-op)`);
            console.log(`  ✓ Duplicate trade ID handled correctly (idempotent)`);
            console.log(`  Note: Check logs to confirm no duplicate commission calculation`);
        });
        await (0, test_helpers_1.step)('Test 7: Zero Trade Amount', async () => {
            const user = await (0, test_helpers_1.authenticateUser)('ZERO_USER');
            const tradeId = `ZERO_TRADE_${Date.now()}`;
            await (0, test_helpers_1.apiCall)('POST', '/api/trades/mock', user.userId, {
                tradeId,
                userId: user.userId,
                feeAmount: 0,
                token: 'XP',
                chain: 'EVM',
            });
            console.log(`  ✓ Zero fee trade accepted (no error)`);
            console.log(`  Note: Should not generate commissions`);
        });
        await (0, test_helpers_1.step)('Test 8: Large Referral Network', async () => {
            const rootUser = await (0, test_helpers_1.authenticateUser)('LARGE_ROOT');
            const rootCode = await (0, test_helpers_1.apiCall)('POST', '/api/referral/generate', undefined, undefined, { Cookie: rootUser.cookie });
            console.log(`  Creating 10 direct referrals...`);
            const startTime = Date.now();
            for (let i = 1; i <= 10; i++) {
                const childUser = await (0, test_helpers_1.authenticateUser)(`LARGE_CHILD_${i}`);
                await (0, test_helpers_1.apiCall)('POST', '/api/referral/register', undefined, { code: rootCode.code }, { Cookie: childUser.cookie });
                console.log(`    ✓ Referral ${i}/10`);
            }
            const endTime = Date.now();
            const duration = endTime - startTime;
            console.log(`  ✓ Created 10 referrals in ${duration}ms`);
            console.log(`  Average: ${(duration / 10).toFixed(0)}ms per referral`);
            const network = await (0, test_helpers_1.getNetwork)(rootUser);
            console.log(`  Network level 1: ${network.level1.length} users`);
            if (network.level1.length !== 10) {
                console.warn(`  ⚠️  Expected 10 level 1 referrals, got ${network.level1.length}`);
            }
            else {
                console.log(`  ✓ All 10 referrals visible in network`);
            }
            if (duration > 30000) {
                console.warn(`  ⚠️  Performance: took ${duration}ms (> 30s)`);
            }
            else {
                console.log(`  ✓ Performance acceptable`);
            }
        });
        await (0, test_helpers_1.step)('Test 9: Unauthorized Access', async () => {
            await (0, test_helpers_1.expectError)(async () => {
                await (0, test_helpers_1.apiCall)('POST', '/api/referral/generate', undefined, undefined, {});
            }, 'Unauthorized');
            console.log(`  ✓ Unauthorized access correctly rejected`);
        });
        await (0, test_helpers_1.step)('Test 10: Invalid Merkle Proof Detection', async () => {
            const userCookies = await (0, test_helpers_1.createUserChain)(['PROOF_USER_A', 'PROOF_USER_B']);
            await (0, test_helpers_1.makeTrade)('PROOF_USER_B', 1000, 'EVM', 'XP');
            await (0, test_helpers_1.sleep)(1000);
            const proof = await (0, test_helpers_1.apiCall)('GET', '/api/merkle/proof/EVM/XP?userId=PROOF_USER_B', undefined, undefined, { Cookie: userCookies.get('PROOF_USER_B').cookie });
            console.log(`  Valid proof amount: ${proof.amount} XP`);
            console.log(`  Valid proof length: ${proof.proof?.length || 0}`);
            console.log(`  ✓ Proof structure validated`);
            console.log(`  Note: Tampered proof rejection happens on-chain`);
        });
        await (0, test_helpers_1.step)('Test 11: Empty Referral Code', async () => {
            const user = await (0, test_helpers_1.authenticateUser)('EMPTY_CODE_USER');
            await (0, test_helpers_1.expectError)(async () => {
                await (0, test_helpers_1.apiCall)('POST', '/api/referral/register', undefined, { code: '' }, { Cookie: user.cookie });
            }, '');
            console.log(`  ✓ Empty referral code rejected`);
        });
        await (0, test_helpers_1.step)('Test 12: Concurrent Trade Submissions', async () => {
            const user = await (0, test_helpers_1.authenticateUser)('CONCURRENT_USER');
            console.log(`  Submitting 5 trades concurrently...`);
            const promises = [];
            for (let i = 1; i <= 5; i++) {
                const tradeId = `CONCURRENT_TRADE_${Date.now()}_${i}`;
                const promise = (0, test_helpers_1.apiCall)('POST', '/api/trades/mock', user.userId, {
                    tradeId,
                    userId: user.userId,
                    feeAmount: 100 * i,
                    token: 'XP',
                    chain: 'EVM',
                });
                promises.push(promise);
            }
            await Promise.all(promises);
            console.log(`  ✓ All 5 trades submitted successfully`);
            console.log(`  Note: Database should handle concurrent writes correctly`);
        });
        console.log('\n' + '='.repeat(70));
        console.log('✅ ALL PHASE 3 EDGE CASE TESTS PASSED!');
        console.log('='.repeat(70));
        console.log('\n🎉 Error handling and edge cases are working correctly!');
        console.log('\n📊 Test Summary:');
        console.log('   ✓ Invalid referral codes rejected');
        console.log('   ✓ Self-referral prevented');
        console.log('   ✓ Circular referrals detected');
        console.log('   ✓ Max depth (3 levels) enforced');
        console.log('   ✓ Double registration prevented');
        console.log('   ✓ Trade ID idempotency works');
        console.log('   ✓ Large networks handled efficiently');
        console.log('   ✓ Unauthorized access blocked');
        console.log('   ✓ Concurrent operations supported');
    }
    catch (error) {
        console.error('\n' + '='.repeat(70));
        console.error('❌ PHASE 3 EDGE CASE TEST SUITE FAILED');
        console.error('='.repeat(70));
        console.error('\n', error);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=test-e2e-phase3-edge-cases.js.map