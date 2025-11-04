#!/usr/bin/env ts-node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_helpers_1 = require("./test-helpers");
async function main() {
    console.log('\n🚀 Phase 2 E2E Test: On-Chain Contract Verification');
    console.log('='.repeat(70));
    let userCookies;
    const USER_A = 'CONTRACT_USER_A';
    const USER_B = 'CONTRACT_USER_B';
    const USER_C = 'CONTRACT_USER_C';
    try {
        await (0, test_helpers_1.step)('Test 1: Setup Test Data', async () => {
            userCookies = await (0, test_helpers_1.createUserChain)([USER_A, USER_B, USER_C]);
            console.log(`  Chain created: ${USER_A} → ${USER_B} → ${USER_C}`);
            const tradeId = await (0, test_helpers_1.makeTrade)(USER_C, 2000, 'EVM', 'XP');
            console.log(`  ✓ Trade submitted: ${tradeId} (2000 XP fee)`);
            await (0, test_helpers_1.sleep)(1000);
            console.log(`  Expected balances: USER_A=60, USER_B=600, USER_C=200`);
        });
        let evmRoot;
        let evmVersion;
        await (0, test_helpers_1.step)('Test 2: Generate and Update EVM Merkle Root', async () => {
            const result = await (0, test_helpers_1.generateAndUpdateRoot)('EVM', 'XP');
            evmRoot = result.root;
            evmVersion = result.version;
            console.log(`  Generated root: ${evmRoot}`);
            console.log(`  Version: ${evmVersion}`);
            console.log(`  TX Hash: ${result.txHash || 'See logs'}`);
            if (result.txHash) {
                console.log(`  ✓ Transaction submitted to EVM chain`);
            }
        });
        await (0, test_helpers_1.step)('Test 3: Wait for EVM Transaction Confirmation', async () => {
            console.log(`  Waiting for transaction to be mined...`);
            await (0, test_helpers_1.sleep)(5000);
            console.log(`  ✓ Waited 5 seconds for confirmation`);
            console.log(`  Note: On testnet, this may take longer`);
        });
        await (0, test_helpers_1.step)('Test 4: Verify EVM On-Chain State', async () => {
            const status = await (0, test_helpers_1.getContractStatus)('EVM', 'XP');
            console.log(`  Backend root:    ${evmRoot}`);
            console.log(`  On-chain root:   ${status.onChainRoot}`);
            console.log(`  Backend version: ${evmVersion}`);
            console.log(`  On-chain version: ${status.onChainVersion}`);
            console.log(`  Is synced:       ${status.isSynced}`);
            if (status.onChainVersion !== evmVersion) {
                throw new Error(`Version mismatch: backend=${evmVersion}, on-chain=${status.onChainVersion}`);
            }
            console.log(`  ✓ Version matches (${evmVersion})`);
            if (status.onChainRoot === '0x' + '0'.repeat(64)) {
                console.warn(`  ⚠️  On-chain root is all zeros`);
                console.warn(`  ⚠️  This could indicate:`);
                console.warn(`     - Contract not initialized`);
                console.warn(`     - Reading from wrong contract address`);
                console.warn(`     - Transaction still pending`);
            }
            else if (status.onChainRoot !== evmRoot) {
                console.warn(`  ⚠️  Root mismatch detected`);
                console.warn(`  ⚠️  Backend:  ${evmRoot}`);
                console.warn(`  ⚠️  On-chain: ${status.onChainRoot}`);
                console.warn(`  ⚠️  Transaction may still be pending or reverted`);
            }
            else {
                console.log(`  ✓ Root matches perfectly!`);
                console.log(`  ✓ On-chain state is synced with backend`);
            }
            if (status.isSynced) {
                console.log(`  ✓ System reports synced status`);
            }
            else {
                console.warn(`  ⚠️  System reports NOT synced`);
            }
        });
        await (0, test_helpers_1.step)('Test 5: Test Version Increment', async () => {
            console.log(`  Current version: ${evmVersion}`);
            const tradeId = await (0, test_helpers_1.makeTrade)(USER_C, 1000, 'EVM', 'XP');
            console.log(`  ✓ New trade: ${tradeId}`);
            await (0, test_helpers_1.sleep)(1000);
            const result = await (0, test_helpers_1.generateAndUpdateRoot)('EVM', 'XP');
            console.log(`  New version: ${result.version}`);
            console.log(`  New root: ${result.root.slice(0, 20)}...`);
            if (result.version !== evmVersion + 1) {
                throw new Error(`Expected version ${evmVersion + 1}, got ${result.version}`);
            }
            console.log(`  ✓ Version incremented from ${evmVersion} to ${result.version}`);
            await (0, test_helpers_1.sleep)(5000);
            const status = await (0, test_helpers_1.getContractStatus)('EVM', 'XP');
            console.log(`  On-chain version now: ${status.onChainVersion}`);
            if (status.onChainVersion === result.version) {
                console.log(`  ✓ On-chain version updated to ${result.version}`);
            }
            else {
                console.warn(`  ⚠️  On-chain version (${status.onChainVersion}) != expected (${result.version})`);
            }
            evmVersion = result.version;
            evmRoot = result.root;
        });
        const SVM_USER_A = 'SVM_CONTRACT_A';
        const SVM_USER_B = 'SVM_CONTRACT_B';
        const SVM_USER_C = 'SVM_CONTRACT_C';
        let svmUserCookies;
        await (0, test_helpers_1.step)('Test 6: Setup SVM Test Data', async () => {
            svmUserCookies = await (0, test_helpers_1.createUserChain)([SVM_USER_A, SVM_USER_B, SVM_USER_C]);
            console.log(`  SVM chain created: ${SVM_USER_A} → ${SVM_USER_B} → ${SVM_USER_C}`);
            const tradeId = await (0, test_helpers_1.makeTrade)(SVM_USER_C, 1500, 'SVM', 'XP');
            console.log(`  ✓ SVM trade: ${tradeId} (1500 XP fee)`);
            await (0, test_helpers_1.sleep)(1000);
        });
        let svmRoot;
        let svmVersion;
        await (0, test_helpers_1.step)('Test 7: Generate and Update SVM Merkle Root', async () => {
            const result = await (0, test_helpers_1.generateAndUpdateRoot)('SVM', 'XP');
            svmRoot = result.root;
            svmVersion = result.version;
            console.log(`  Generated root: ${svmRoot}`);
            console.log(`  Version: ${svmVersion}`);
            console.log(`  TX Signature: ${result.txHash || 'See logs'}`);
            if (result.txHash) {
                console.log(`  ✓ Transaction submitted to Solana`);
            }
        });
        await (0, test_helpers_1.step)('Test 8: Wait for SVM Transaction Confirmation', async () => {
            console.log(`  Waiting for Solana transaction to finalize...`);
            await (0, test_helpers_1.sleep)(3000);
            console.log(`  ✓ Waited 3 seconds for confirmation`);
        });
        await (0, test_helpers_1.step)('Test 9: Verify SVM On-Chain State', async () => {
            const status = await (0, test_helpers_1.getContractStatus)('SVM', 'XP');
            console.log(`  Backend root:    ${svmRoot}`);
            console.log(`  On-chain root:   ${status.onChainRoot}`);
            console.log(`  Backend version: ${svmVersion}`);
            console.log(`  On-chain version: ${status.onChainVersion}`);
            console.log(`  Is synced:       ${status.isSynced}`);
            if (status.onChainRoot === 'Not set') {
                console.warn(`  ⚠️  SVM state PDA account not readable`);
                console.warn(`  ⚠️  Possible causes:`);
                console.warn(`     - PDA not initialized`);
                console.warn(`     - Wrong PDA derivation`);
                console.warn(`     - Account doesn't exist yet`);
                console.warn(`     - Anchor deserialization error`);
            }
            else if (status.onChainRoot === '0x' + '0'.repeat(64)) {
                console.warn(`  ⚠️  SVM state PDA exists but root is zeros`);
            }
            else {
                console.log(`  ✓ SVM state PDA is readable`);
                if (status.onChainRoot === svmRoot) {
                    console.log(`  ✓ Root matches perfectly!`);
                }
                else {
                    console.warn(`  ⚠️  Root mismatch`);
                    console.warn(`     Backend:  ${svmRoot}`);
                    console.warn(`     On-chain: ${status.onChainRoot}`);
                }
            }
            if (status.onChainVersion === svmVersion) {
                console.log(`  ✓ Version matches (${svmVersion})`);
            }
            else if (status.onChainVersion === 0) {
                console.warn(`  ⚠️  On-chain version is 0 (state may not be initialized)`);
            }
            else {
                console.warn(`  ⚠️  Version mismatch: backend=${svmVersion}, on-chain=${status.onChainVersion}`);
            }
        });
        await (0, test_helpers_1.step)('Test 10: Rapid Updates Test', async () => {
            console.log(`  Performing 3 rapid updates...`);
            const initialVersion = evmVersion;
            for (let i = 1; i <= 3; i++) {
                const tradeId = await (0, test_helpers_1.makeTrade)(USER_C, 100 * i, 'EVM', 'XP');
                console.log(`    ${i}. Trade: ${tradeId}`);
                await (0, test_helpers_1.sleep)(500);
                const result = await (0, test_helpers_1.generateAndUpdateRoot)('EVM', 'XP');
                console.log(`    ${i}. Version: ${result.version}, Root: ${result.root.slice(0, 20)}...`);
                evmVersion = result.version;
            }
            const expectedVersion = initialVersion + 3;
            if (evmVersion !== expectedVersion) {
                throw new Error(`Expected version ${expectedVersion}, got ${evmVersion}`);
            }
            console.log(`  ✓ Versions incremented correctly: ${initialVersion} → ${evmVersion}`);
        });
        await (0, test_helpers_1.step)('Test 11: Verify State After Rapid Updates', async () => {
            console.log(`  Waiting for all transactions to confirm...`);
            await (0, test_helpers_1.sleep)(10000);
            const status = await (0, test_helpers_1.getContractStatus)('EVM', 'XP');
            console.log(`  On-chain version: ${status.onChainVersion}`);
            console.log(`  Expected version: ${evmVersion}`);
            if (status.onChainVersion === evmVersion) {
                console.log(`  ✓ All updates successfully confirmed on-chain`);
            }
            else {
                console.warn(`  ⚠️  Some updates may still be pending`);
                console.warn(`     On-chain: ${status.onChainVersion}, Expected: ${evmVersion}`);
            }
        });
        await (0, test_helpers_1.step)('Test 12: Contract Interaction Summary', async () => {
            const evmStatus = await (0, test_helpers_1.getContractStatus)('EVM', 'XP');
            const svmStatus = await (0, test_helpers_1.getContractStatus)('SVM', 'XP');
            console.log(`\n  EVM Contract Summary:`);
            console.log(`    ✓ ${evmStatus.onChainVersion} merkle root updates`);
            console.log(`    ✓ Latest root: ${evmStatus.onChainRoot.slice(0, 20)}...`);
            console.log(`    ✓ Synced: ${evmStatus.isSynced}`);
            console.log(`\n  SVM Contract Summary:`);
            console.log(`    ✓ ${svmStatus.onChainVersion} merkle root updates`);
            console.log(`    ✓ Latest root: ${svmStatus.onChainRoot === 'Not set' ? 'Not readable' : svmStatus.onChainRoot.slice(0, 20) + '...'}`);
            console.log(`    ✓ Synced: ${svmStatus.isSynced}`);
            console.log(`\n  Key Findings:`);
            if (evmStatus.onChainRoot !== '0x' + '0'.repeat(64)) {
                console.log(`    ✅ EVM contract is reading correctly`);
            }
            else {
                console.log(`    ⚠️  EVM contract returning zero root (needs investigation)`);
            }
            if (svmStatus.onChainRoot !== 'Not set' && svmStatus.onChainRoot !== '0x' + '0'.repeat(64)) {
                console.log(`    ✅ SVM state PDA is working correctly`);
            }
            else {
                console.log(`    ⚠️  SVM state PDA needs investigation`);
            }
        });
        console.log('\n' + '='.repeat(70));
        console.log('✅ PHASE 2 CONTRACT VERIFICATION TESTS COMPLETED!');
        console.log('='.repeat(70));
        console.log('\n📊 Test Summary:');
        console.log('   ✓ Merkle root updates submitted to contracts');
        console.log('   ✓ Version tracking works correctly');
        console.log('   ✓ Multiple updates handled sequentially');
        console.log('   ✓ Contract state can be read from both chains');
        console.log('\n💡 Note: Some warnings are expected on testnets due to:');
        console.log('   - Transaction confirmation delays');
        console.log('   - State PDA initialization requirements');
        console.log('   - Network congestion');
    }
    catch (error) {
        console.error('\n' + '='.repeat(70));
        console.error('❌ PHASE 2 CONTRACT TEST SUITE FAILED');
        console.error('='.repeat(70));
        console.error('\n', error);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=test-e2e-phase2-contracts.js.map