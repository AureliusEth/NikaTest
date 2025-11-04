/**
 * EVM NikaTreasury Contract Integration Tests
 * 
 * PURPOSE:
 * Tests the NikaTreasury smart contract on EVM (Ethereum/Arbitrum) with real blockchain interactions.
 * These are integration tests that deploy and interact with the actual contract.
 * 
 * CONTRACT FUNCTIONALITY:
 * - Store Merkle root on-chain for verification
 * - Verify Merkle proofs for user claims
 * - Emit events for proof verification results
 * - Owner-only root updates
 * 
 * TESTING APPROACH:
 * - Uses ethers.js to interact with contract
 * - Can run against local Hardhat/Anvil node or testnet
 * - Tests real transaction execution and event emission
 * 
 * PROOF FORMAT:
 * - Proof: Array of sibling hashes (bytes32[])
 * - Leaf: keccak256(abi.encodePacked(userId, ":", token, ":", amount))
 * - Verification: Reconstruct root from leaf + proof
 * 
 * SETUP REQUIREMENTS:
 * - Contract ABI from compiled NikaTreasury.sol
 * - Deployed contract address or deploy script
 * - RPC endpoint (local or testnet)
 * - Wallet with funds for transactions
 */

import { ethers, keccak256 } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

// Contract ABI (simplified - only functions we test)
const NIKA_TREASURY_ABI = [
  'function merkleRoot() public view returns (bytes32)',
  'function updateRoot(bytes32 newRoot) public',
  'function verifyProof(bytes32[] memory proof, string memory user_id, string memory token, string memory amount_str) public view returns (bool)',
  'event RootUpdated(bytes32 oldRoot, bytes32 newRoot)',
  'event ProofVerified(string userId, string token, string amountStr, bool valid)',
];

describe('EVM NikaTreasury Contract Integration', () => {
  let provider: ethers.JsonRpcProvider;
  let wallet: ethers.Wallet;
  let contract: ethers.Contract;
  let contractAddress: string;

  // Skip tests if no local node is running
  const skipTests = !process.env.EVM_TEST_RPC_URL && !process.env.CI;

  beforeAll(async () => {
    if (skipTests) {
      console.log('⚠️  Skipping EVM contract tests: No EVM_TEST_RPC_URL set');
      console.log('   To run these tests:');
      console.log('   1. Start local Anvil node: anvil');
      console.log('   2. Deploy contract: cd contracts/evm && forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast');
      console.log('   3. Set EVM_TEST_RPC_URL=http://localhost:8545');
      return;
    }

    // Setup provider and wallet
    const rpcUrl = process.env.EVM_TEST_RPC_URL || 'http://127.0.0.1:8545';
    provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Use test wallet (Anvil default account or env var)
    const privateKey = process.env.EVM_TEST_PRIVATE_KEY || 
      '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Anvil default #0
    wallet = new ethers.Wallet(privateKey, provider);

    // Get contract address from deployment or env
    contractAddress = process.env.EVM_XP_CONTRACT_ADDRESS || '';
    
    if (!contractAddress) {
      console.log('⚠️  No contract address found. Attempting to deploy...');
      // In real scenario, you'd deploy here or throw error
      throw new Error('Please deploy contract first and set EVM_XP_CONTRACT_ADDRESS');
    }

    // Connect to contract
    contract = new ethers.Contract(contractAddress, NIKA_TREASURY_ABI, wallet);
  });

  describe('Root Storage and Retrieval', () => {
    (skipTests ? it.skip : it)('should read current merkle root from contract', async () => {
      // Act: Read current root
      const currentRoot = await contract.merkleRoot();

      // Assert: Root is bytes32 (32 bytes = 64 hex chars + 0x prefix)
      expect(currentRoot).toMatch(/^0x[a-f0-9]{64}$/);
    });

    (skipTests ? it.skip : it)('should update merkle root as owner', async () => {
      // Arrange: New test root
      const oldRoot = await contract.merkleRoot();
      const newRoot = keccak256(Buffer.from('test-root-' + Date.now()));

      // Act: Update root
      const tx = await contract.updateRoot(newRoot);
      const receipt = await tx.wait();

      // Assert: Transaction succeeded
      expect(receipt.status).toBe(1);

      // Assert: Root was updated
      const updatedRoot = await contract.merkleRoot();
      expect(updatedRoot).toBe(newRoot);
      expect(updatedRoot).not.toBe(oldRoot);
    });

    (skipTests ? it.skip : it)('should emit RootUpdated event on update', async () => {
      // Arrange
      const oldRoot = await contract.merkleRoot();
      const newRoot = keccak256(Buffer.from('test-root-event-' + Date.now()));

      // Act: Update root and get events
      const tx = await contract.updateRoot(newRoot);
      const receipt = await tx.wait();

      // Assert: RootUpdated event emitted
      const event = receipt?.logs.find((log: any) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed?.name === 'RootUpdated';
        } catch {
          return false;
        }
      });

      expect(event).toBeDefined();
      if (event) {
        const parsed = contract.interface.parseLog(event);
        expect(parsed?.args.oldRoot).toBe(oldRoot);
        expect(parsed?.args.newRoot).toBe(newRoot);
      }
    });
  });

  describe('Proof Verification - Single Leaf', () => {
    (skipTests ? it.skip : it)('should verify valid proof for single-user tree', async () => {
      // Arrange: Create single-leaf merkle tree
      const userId = 'testuser@example.com';
      const token = 'XP';
      const amount = '100.00000000';

      // Leaf is the root when tree has 1 leaf
      const leafData = `${userId}:${token}:${amount}`;
      const leafHash = keccak256(Buffer.from(leafData));
      const root = leafHash; // Single leaf = root

      // Update contract root
      await (await contract.updateRoot(root)).wait();

      // Act: Verify proof (empty array for single leaf)
      const proof: string[] = [];
      const isValid = await contract.verifyProof(proof, userId, token, amount);

      // Assert: Proof is valid
      expect(isValid).toBe(true);
    });

    (skipTests ? it.skip : it)('should reject invalid proof for single-user tree', async () => {
      // Arrange: Set up valid tree
      const userId = 'testuser@example.com';
      const token = 'XP';
      const amount = '100.00000000';
      const leafHash = keccak256(Buffer.from(`${userId}:${token}:${amount}`));
      await (await contract.updateRoot(leafHash)).wait();

      // Act: Try to verify with wrong amount
      const proof: string[] = [];
      const wrongAmount = '999.00000000';
      const isValid = await contract.verifyProof(proof, userId, token, wrongAmount);

      // Assert: Proof invalid
      expect(isValid).toBe(false);
    });
  });

  describe('Proof Verification - Multi-Leaf Tree', () => {
    (skipTests ? it.skip : it)('should verify valid proof in 2-user tree', async () => {
      // Arrange: Create 2-leaf tree
      const user1 = 'user1@example.com';
      const user2 = 'user2@example.com';
      const token = 'XP';
      const amount1 = '100.00000000';
      const amount2 = '200.00000000';

      // Generate leaves
      const leaf1 = keccak256(Buffer.from(`${user1}:${token}:${amount1}`));
      const leaf2 = keccak256(Buffer.from(`${user2}:${token}:${amount2}`));

      // Generate root (hash of sorted leaves)
      const [sortedLeaf1, sortedLeaf2] = [leaf1, leaf2].sort();
      const root = keccak256(Buffer.from(sortedLeaf1.slice(2) + sortedLeaf2.slice(2), 'hex'));

      // Update contract root
      await (await contract.updateRoot(root)).wait();

      // Act: Verify proof for user1 (proof = [leaf2])
      const proofForUser1 = [leaf2];
      const isValidUser1 = await contract.verifyProof(proofForUser1, user1, token, amount1);

      // Act: Verify proof for user2 (proof = [leaf1])
      const proofForUser2 = [leaf1];
      const isValidUser2 = await contract.verifyProof(proofForUser2, user2, token, amount2);

      // Assert: Both proofs valid
      expect(isValidUser1).toBe(true);
      expect(isValidUser2).toBe(true);
    });

    (skipTests ? it.skip : it)('should reject proof with wrong sibling hash', async () => {
      // Arrange: Set up 2-user tree
      const user1 = 'user1@example.com';
      const token = 'XP';
      const amount1 = '100.00000000';
      
      const leaf1 = keccak256(Buffer.from(`${user1}:${token}:${amount1}`));
      const leaf2 = keccak256(Buffer.from('other-data'));
      const [sortedLeaf1, sortedLeaf2] = [leaf1, leaf2].sort();
      const root = keccak256(Buffer.from(sortedLeaf1.slice(2) + sortedLeaf2.slice(2), 'hex'));

      await (await contract.updateRoot(root)).wait();

      // Act: Try with wrong sibling hash
      const wrongProof = [keccak256(Buffer.from('wrong-sibling'))];
      const isValid = await contract.verifyProof(wrongProof, user1, token, amount1);

      // Assert: Invalid
      expect(isValid).toBe(false);
    });
  });

  describe('String Parameter Handling', () => {
    (skipTests ? it.skip : it)('should handle email addresses as user IDs', async () => {
      // Arrange: User ID is email address
      const userId = 'test.user+tag@example.co.uk';
      const token = 'XP';
      const amount = '123.45678900';

      const leafHash = keccak256(Buffer.from(`${userId}:${token}:${amount}`));
      await (await contract.updateRoot(leafHash)).wait();

      // Act: Verify with email
      const isValid = await contract.verifyProof([], userId, token, amount);

      // Assert: Works with complex email
      expect(isValid).toBe(true);
    });

    (skipTests ? it.skip : it)('should handle different tokens (USDC, XP, etc)', async () => {
      // Arrange: Test different token names
      const userId = 'user@example.com';
      const tests = [
        { token: 'XP', amount: '100.00000000' },
        { token: 'USDC', amount: '50.12345678' },
        { token: 'ETH', amount: '0.01234567' },
      ];

      for (const test of tests) {
        const leafHash = keccak256(Buffer.from(`${userId}:${test.token}:${test.amount}`));
        await (await contract.updateRoot(leafHash)).wait();

        // Act & Assert
        const isValid = await contract.verifyProof([], userId, test.token, test.amount);
        expect(isValid).toBe(true);
      }
    });

    (skipTests ? it.skip : it)('should require exactly 8 decimal places in amount string', async () => {
      // Arrange
      const userId = 'user@example.com';
      const token = 'XP';
      const correctAmount = '100.00000000'; // 8 decimals

      const leafHash = keccak256(Buffer.from(`${userId}:${token}:${correctAmount}`));
      await (await contract.updateRoot(leafHash)).wait();

      // Act: Try with wrong decimal precision
      const wrongAmounts = [
        '100',           // No decimals
        '100.0',         // 1 decimal
        '100.000000',    // 6 decimals
        '100.000000000', // 9 decimals
      ];

      for (const wrongAmount of wrongAmounts) {
        const isValid = await contract.verifyProof([], userId, token, wrongAmount);
        expect(isValid).toBe(false);
      }

      // Assert: Correct format works
      const validResult = await contract.verifyProof([], userId, token, correctAmount);
      expect(validResult).toBe(true);
    });
  });

  describe('Gas Usage', () => {
    (skipTests ? it.skip : it)('should have reasonable gas cost for root update', async () => {
      // Arrange
      const newRoot = keccak256(Buffer.from('gas-test-' + Date.now()));

      // Act: Update and measure gas
      const tx = await contract.updateRoot(newRoot);
      const receipt = await tx.wait();

      // Assert: Gas usage is reasonable (< 50k gas)
      expect(receipt?.gasUsed).toBeDefined();
      const gasUsed = Number(receipt?.gasUsed);
      expect(gasUsed).toBeLessThan(50000);
      
      console.log(`Root update gas used: ${gasUsed}`);
    });

    (skipTests ? it.skip : it)('should have reasonable gas for proof verification', async () => {
      // Arrange: Small proof
      const userId = 'user@example.com';
      const token = 'XP';
      const amount = '100.00000000';
      const leafHash = keccak256(Buffer.from(`${userId}:${token}:${amount}`));
      await (await contract.updateRoot(leafHash)).wait();

      // Act: Verify proof (view call, no gas cost, but we can estimate)
      const proof: string[] = [];
      const isValid = await contract.verifyProof(proof, userId, token, amount);

      // Assert: Call succeeded
      expect(isValid).toBe(true);
      
      // Note: View calls don't consume gas, but we can estimate
      const gasEstimate = await contract.verifyProof.estimateGas(proof, userId, token, amount);
      console.log(`Proof verification estimated gas: ${gasEstimate}`);
    });
  });

  describe('Edge Cases', () => {
    (skipTests ? it.skip : it)('should handle zero root', async () => {
      // Arrange: Set root to zero
      const zeroRoot = '0x' + '0'.repeat(64);
      await (await contract.updateRoot(zeroRoot)).wait();

      // Act: Read root
      const currentRoot = await contract.merkleRoot();

      // Assert: Can store and read zero root
      expect(currentRoot).toBe(zeroRoot);
    });

    (skipTests ? it.skip : it)('should handle very long user IDs', async () => {
      // Arrange: User ID is very long string
      const userId = 'a'.repeat(200) + '@example.com';
      const token = 'XP';
      const amount = '100.00000000';

      const leafHash = keccak256(Buffer.from(`${userId}:${token}:${amount}`));
      await (await contract.updateRoot(leafHash)).wait();

      // Act: Verify
      const isValid = await contract.verifyProof([], userId, token, amount);

      // Assert: Handles long strings
      expect(isValid).toBe(true);
    });

    (skipTests ? it.skip : it)('should handle large proof arrays', async () => {
      // Arrange: Create large proof (simulating deep tree)
      const userId = 'user@example.com';
      const token = 'XP';
      const amount = '100.00000000';

      // Generate dummy proof with 10 elements (would come from ~1024 leaf tree)
      const dummyProof = Array.from({ length: 10 }, (_, i) => 
        keccak256(Buffer.from(`sibling-${i}`))
      );

      // Note: This will fail verification since it's not a real proof
      // This test just ensures the contract accepts large arrays
      try {
        await contract.verifyProof(dummyProof, userId, token, amount);
      } catch (error: any) {
        // Expected to fail verification, but should not revert with gas error
        expect(error.message).not.toContain('out of gas');
      }
    });
  });
});

