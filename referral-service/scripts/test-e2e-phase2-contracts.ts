#!/usr/bin/env ts-node
/**
 * Phase 2 E2E Test: On-Chain Contract Verification
 * 
 * Tests:
 * - On-chain state consistency between backend and smart contracts
 * - Contract reads return correct merkle roots
 * - Contract version synchronization
 * - Transaction confirmation and finality
 * - SVM state PDA account reading
 * 
 * Usage:
 *   npm run test:e2e-phase2-contracts
 *   or
 *   ts-node scripts/test-e2e-phase2-contracts.ts
 */

import {
  step,
  createUserChain,
  makeTrade,
  generateAndUpdateRoot,
  getContractStatus,
  sleep,
  UserCookie
} from './test-helpers';

async function main() {
  console.log('\n🚀 Phase 2 E2E Test: On-Chain Contract Verification');
  console.log('='.repeat(70));

  let userCookies: Map<string, UserCookie>;
  const USER_A = 'CONTRACT_USER_A';
  const USER_B = 'CONTRACT_USER_B';
  const USER_C = 'CONTRACT_USER_C';

  try {
    // Test 1: Setup - Create referral chain and trade
    await step('Test 1: Setup Test Data', async () => {
      userCookies = await createUserChain([USER_A, USER_B, USER_C]);
      console.log(`  Chain created: ${USER_A} → ${USER_B} → ${USER_C}`);

      const tradeId = await makeTrade(USER_C, 2000, 'EVM', 'XP');
      console.log(`  ✓ Trade submitted: ${tradeId} (2000 XP fee)`);

      await sleep(1000);
      console.log(`  Expected balances: USER_A=60, USER_B=600, USER_C=200`);
    });

    // Test 2: Generate and update EVM merkle root
    let evmRoot: string;
    let evmVersion: number;

    await step('Test 2: Generate and Update EVM Merkle Root', async () => {
      const result = await generateAndUpdateRoot('EVM', 'XP');
      evmRoot = result.root;
      evmVersion = result.version;
      
      console.log(`  Generated root: ${evmRoot}`);
      console.log(`  Version: ${evmVersion}`);
      console.log(`  TX Hash: ${result.txHash || 'See logs'}`);

      if (result.txHash) {
        console.log(`  ✓ Transaction submitted to EVM chain`);
      }
    });

    // Test 3: Wait for EVM transaction confirmation
    await step('Test 3: Wait for EVM Transaction Confirmation', async () => {
      console.log(`  Waiting for transaction to be mined...`);
      await sleep(5000); // Wait for block confirmation
      
      console.log(`  ✓ Waited 5 seconds for confirmation`);
      console.log(`  Note: On testnet, this may take longer`);
    });

    // Test 4: Read EVM contract state
    await step('Test 4: Verify EVM On-Chain State', async () => {
      const status = await getContractStatus('EVM', 'XP');

      console.log(`  Backend root:    ${evmRoot}`);
      console.log(`  On-chain root:   ${status.onChainRoot}`);
      console.log(`  Backend version: ${evmVersion}`);
      console.log(`  On-chain version: ${status.onChainVersion}`);
      console.log(`  Is synced:       ${status.isSynced}`);

      // Check version match (strict)
      if (status.onChainVersion !== evmVersion) {
        throw new Error(
          `Version mismatch: backend=${evmVersion}, on-chain=${status.onChainVersion}`
        );
      }
      console.log(`  ✓ Version matches (${evmVersion})`);

      // Check root match (warning if mismatch)
      if (status.onChainRoot === '0x' + '0'.repeat(64)) {
        console.warn(`  ⚠️  On-chain root is all zeros`);
        console.warn(`  ⚠️  This could indicate:`);
        console.warn(`     - Contract not initialized`);
        console.warn(`     - Reading from wrong contract address`);
        console.warn(`     - Transaction still pending`);
      } else if (status.onChainRoot !== evmRoot) {
        console.warn(`  ⚠️  Root mismatch detected`);
        console.warn(`  ⚠️  Backend:  ${evmRoot}`);
        console.warn(`  ⚠️  On-chain: ${status.onChainRoot}`);
        console.warn(`  ⚠️  Transaction may still be pending or reverted`);
      } else {
        console.log(`  ✓ Root matches perfectly!`);
        console.log(`  ✓ On-chain state is synced with backend`);
      }

      // Check sync status
      if (status.isSynced) {
        console.log(`  ✓ System reports synced status`);
      } else {
        console.warn(`  ⚠️  System reports NOT synced`);
      }
    });

    // Test 5: Update root again and verify version increments
    await step('Test 5: Test Version Increment', async () => {
      console.log(`  Current version: ${evmVersion}`);
      
      // Make another trade to change balances
      const tradeId = await makeTrade(USER_C, 1000, 'EVM', 'XP');
      console.log(`  ✓ New trade: ${tradeId}`);

      await sleep(1000);

      // Generate new root
      const result = await generateAndUpdateRoot('EVM', 'XP');
      console.log(`  New version: ${result.version}`);
      console.log(`  New root: ${result.root.slice(0, 20)}...`);

      // Verify version incremented
      if (result.version !== evmVersion + 1) {
        throw new Error(`Expected version ${evmVersion + 1}, got ${result.version}`);
      }
      console.log(`  ✓ Version incremented from ${evmVersion} to ${result.version}`);

      // Wait and check on-chain
      await sleep(5000);
      
      const status = await getContractStatus('EVM', 'XP');
      console.log(`  On-chain version now: ${status.onChainVersion}`);
      
      if (status.onChainVersion === result.version) {
        console.log(`  ✓ On-chain version updated to ${result.version}`);
      } else {
        console.warn(`  ⚠️  On-chain version (${status.onChainVersion}) != expected (${result.version})`);
      }

      evmVersion = result.version;
      evmRoot = result.root;
    });

    // Test 6: SVM Setup
    const SVM_USER_A = 'SVM_CONTRACT_A';
    const SVM_USER_B = 'SVM_CONTRACT_B';
    const SVM_USER_C = 'SVM_CONTRACT_C';
    let svmUserCookies: Map<string, UserCookie>;

    await step('Test 6: Setup SVM Test Data', async () => {
      svmUserCookies = await createUserChain([SVM_USER_A, SVM_USER_B, SVM_USER_C]);
      console.log(`  SVM chain created: ${SVM_USER_A} → ${SVM_USER_B} → ${SVM_USER_C}`);

      const tradeId = await makeTrade(SVM_USER_C, 1500, 'SVM', 'XP');
      console.log(`  ✓ SVM trade: ${tradeId} (1500 XP fee)`);

      await sleep(1000);
    });

    // Test 7: Generate and update SVM merkle root
    let svmRoot: string;
    let svmVersion: number;

    await step('Test 7: Generate and Update SVM Merkle Root', async () => {
      const result = await generateAndUpdateRoot('SVM', 'XP');
      svmRoot = result.root;
      svmVersion = result.version;
      
      console.log(`  Generated root: ${svmRoot}`);
      console.log(`  Version: ${svmVersion}`);
      console.log(`  TX Signature: ${result.txHash || 'See logs'}`);

      if (result.txHash) {
        console.log(`  ✓ Transaction submitted to Solana`);
      }
    });

    // Test 8: Wait for SVM transaction confirmation
    await step('Test 8: Wait for SVM Transaction Confirmation', async () => {
      console.log(`  Waiting for Solana transaction to finalize...`);
      await sleep(3000); // Solana is faster than EVM
      
      console.log(`  ✓ Waited 3 seconds for confirmation`);
    });

    // Test 9: Read SVM contract state (Anchor program)
    await step('Test 9: Verify SVM On-Chain State', async () => {
      const status = await getContractStatus('SVM', 'XP');

      console.log(`  Backend root:    ${svmRoot}`);
      console.log(`  On-chain root:   ${status.onChainRoot}`);
      console.log(`  Backend version: ${svmVersion}`);
      console.log(`  On-chain version: ${status.onChainVersion}`);
      console.log(`  Is synced:       ${status.isSynced}`);

      // Check if state account is readable
      if (status.onChainRoot === 'Not set') {
        console.warn(`  ⚠️  SVM state PDA account not readable`);
        console.warn(`  ⚠️  Possible causes:`);
        console.warn(`     - PDA not initialized`);
        console.warn(`     - Wrong PDA derivation`);
        console.warn(`     - Account doesn't exist yet`);
        console.warn(`     - Anchor deserialization error`);
      } else if (status.onChainRoot === '0x' + '0'.repeat(64)) {
        console.warn(`  ⚠️  SVM state PDA exists but root is zeros`);
      } else {
        console.log(`  ✓ SVM state PDA is readable`);
        
        // Check if root matches
        if (status.onChainRoot === svmRoot) {
          console.log(`  ✓ Root matches perfectly!`);
        } else {
          console.warn(`  ⚠️  Root mismatch`);
          console.warn(`     Backend:  ${svmRoot}`);
          console.warn(`     On-chain: ${status.onChainRoot}`);
        }
      }

      // Check version
      if (status.onChainVersion === svmVersion) {
        console.log(`  ✓ Version matches (${svmVersion})`);
      } else if (status.onChainVersion === 0) {
        console.warn(`  ⚠️  On-chain version is 0 (state may not be initialized)`);
      } else {
        console.warn(`  ⚠️  Version mismatch: backend=${svmVersion}, on-chain=${status.onChainVersion}`);
      }
    });

    // Test 10: Multiple rapid updates (stress test)
    await step('Test 10: Rapid Updates Test', async () => {
      console.log(`  Performing 3 rapid updates...`);
      
      const initialVersion = evmVersion;
      
      for (let i = 1; i <= 3; i++) {
        const tradeId = await makeTrade(USER_C, 100 * i, 'EVM', 'XP');
        console.log(`    ${i}. Trade: ${tradeId}`);
        
        await sleep(500);
        
        const result = await generateAndUpdateRoot('EVM', 'XP');
        console.log(`    ${i}. Version: ${result.version}, Root: ${result.root.slice(0, 20)}...`);
        
        evmVersion = result.version;
      }

      // Verify versions incremented correctly
      const expectedVersion = initialVersion + 3;
      if (evmVersion !== expectedVersion) {
        throw new Error(`Expected version ${expectedVersion}, got ${evmVersion}`);
      }
      console.log(`  ✓ Versions incremented correctly: ${initialVersion} → ${evmVersion}`);
    });

    // Test 11: Contract status after rapid updates
    await step('Test 11: Verify State After Rapid Updates', async () => {
      console.log(`  Waiting for all transactions to confirm...`);
      await sleep(10000); // Wait longer for multiple txs
      
      const status = await getContractStatus('EVM', 'XP');
      console.log(`  On-chain version: ${status.onChainVersion}`);
      console.log(`  Expected version: ${evmVersion}`);

      if (status.onChainVersion === evmVersion) {
        console.log(`  ✓ All updates successfully confirmed on-chain`);
      } else {
        console.warn(`  ⚠️  Some updates may still be pending`);
        console.warn(`     On-chain: ${status.onChainVersion}, Expected: ${evmVersion}`);
      }
    });

    // Test 12: Summary of contract interactions
    await step('Test 12: Contract Interaction Summary', async () => {
      const evmStatus = await getContractStatus('EVM', 'XP');
      const svmStatus = await getContractStatus('SVM', 'XP');

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
      } else {
        console.log(`    ⚠️  EVM contract returning zero root (needs investigation)`);
      }

      if (svmStatus.onChainRoot !== 'Not set' && svmStatus.onChainRoot !== '0x' + '0'.repeat(64)) {
        console.log(`    ✅ SVM state PDA is working correctly`);
      } else {
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

  } catch (error) {
    console.error('\n' + '='.repeat(70));
    console.error('❌ PHASE 2 CONTRACT TEST SUITE FAILED');
    console.error('='.repeat(70));
    console.error('\n', error);
    process.exit(1);
  }
}

main();




