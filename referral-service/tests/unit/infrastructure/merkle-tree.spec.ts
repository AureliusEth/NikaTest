import { MerkleTreeService } from '../../../src/infrastructure/services/merkle-tree.service';
import { keccak256 } from 'ethers';

describe('Merkle Tree Service', () => {
  let service: MerkleTreeService;

  beforeEach(() => {
    service = new MerkleTreeService(null as any);
  });

  describe('Leaf Hash Generation', () => {
    it('should generate deterministic leaf hash from user data using keccak256', () => {
      // Arrange: Standard user balance
      const balance = {
        beneficiaryId: 'user@example.com',
        token: 'XP',
        totalAmount: 100.5,
      };

      // Act: Generate tree with single leaf
      const { root, leaves } = service.generateTree([balance], 'EVM');

      // Assert: Leaf hash is deterministic keccak256 of formatted data
      const expectedLeafData = `user@example.com:XP:${balance.totalAmount.toFixed(8)}`;
      const expectedLeafHash = keccak256(Buffer.from(expectedLeafData));

      expect(leaves.size).toBe(1);
      expect(leaves.has(balance.beneficiaryId)).toBe(true);
      expect(leaves.get(balance.beneficiaryId)).toBe(expectedLeafHash);
    });

    it('should format amount to 8 decimal places consistently', () => {
      // Arrange: Amounts with different decimal precision
      const balances = [
        { beneficiaryId: 'user1', token: 'XP', totalAmount: 100 }, // Integer
        { beneficiaryId: 'user2', token: 'XP', totalAmount: 100.5 }, // 1 decimal
        { beneficiaryId: 'user3', token: 'XP', totalAmount: 100.123456789 }, // 9 decimals
      ];

      // Act: Generate leaves
      const { leaves } = service.generateTree(balances, 'EVM');

      // Assert: All formatted to 8 decimals
      expect(leaves.get('user1')).toBe(
        keccak256(Buffer.from('user1:XP:100.00000000')),
      );
      expect(leaves.get('user2')).toBe(
        keccak256(Buffer.from('user2:XP:100.50000000')),
      );
      expect(leaves.get('user3')).toBe(
        keccak256(Buffer.from('user3:XP:100.12345679')),
      ); // Rounded
    });

    it('should use keccak256 not SHA256', () => {
      // Arrange: Test data
      const testString = 'test';

      // Known hashes for verification:
      // keccak256("test") = 0x9c22ff5f21f0b81b113e63f7db6da94fedef11b2119b4088b89664fb9a3cb658
      // sha256("test")    = 0x9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08

      const hash = keccak256(Buffer.from(testString));

      // Assert: Must be keccak256 (starts with 0x9c22...)
      expect(hash).toBe(
        '0x9c22ff5f21f0b81b113e63f7db6da94fedef11b2119b4088b89664fb9a3cb658',
      );
      expect(hash).not.toBe(
        '0x9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      );
    });

    it('should handle special characters in user IDs (emails)', () => {
      // Arrange: Email addresses with special chars
      const balances = [
        {
          beneficiaryId: 'user+tag@example.com',
          token: 'XP',
          totalAmount: 100,
        },
        {
          beneficiaryId: 'user.name@example.co.uk',
          token: 'XP',
          totalAmount: 200,
        },
      ];

      // Act
      const { leaves } = service.generateTree(balances, 'EVM');

      // Assert: Hashes generated without errors
      expect(leaves.size).toBe(2);
      const hash1 = leaves.get(balances[0].beneficiaryId)!;
      const hash2 = leaves.get(balances[1].beneficiaryId)!;
      expect(hash1).toMatch(/^0x[a-f0-9]{64}$/);
      expect(hash2).toMatch(/^0x[a-f0-9]{64}$/);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Tree Construction', () => {
    it('should build correct Merkle tree for single leaf', () => {
      // Arrange: Single user
      const balances = [
        { beneficiaryId: 'solo-user', token: 'XP', totalAmount: 100 },
      ];

      // Act
      const { root, leaves } = service.generateTree(balances, 'EVM');

      // Assert: Root equals leaf hash (no parent nodes needed)
      const leafHash = leaves.get(balances[0].beneficiaryId)!;
      expect(root).toBe(leafHash);
      expect(root).toMatch(/^0x[a-f0-9]{64}$/);
    });

    it('should build correct tree for two leaves', () => {
      // Arrange: Two users
      const balances = [
        { beneficiaryId: 'user1', token: 'XP', totalAmount: 100 },
        { beneficiaryId: 'user2', token: 'XP', totalAmount: 200 },
      ];

      // Act
      const { root, leaves } = service.generateTree(balances, 'EVM');

      // Assert: Root is hash of two leaf hashes (sorted)
      expect(leaves.size).toBe(2);
      expect(root).toMatch(/^0x[a-f0-9]{64}$/);
      const hash1 = leaves.get(balances[0].beneficiaryId)!;
      const hash2 = leaves.get(balances[1].beneficiaryId)!;
      expect(root).not.toBe(hash1);
      expect(root).not.toBe(hash2);

      // Root should be keccak256(sortedHash1 + sortedHash2)
      const [sortedHash1, sortedHash2] = [hash1, hash2].sort();
      const expectedRoot = keccak256(
        Buffer.from(sortedHash1.slice(2) + sortedHash2.slice(2), 'hex'),
      );
      expect(root).toBe(expectedRoot);
    });

    it('should build balanced tree for power-of-2 leaves', () => {
      // Arrange: 4 users (perfect binary tree)
      const balances = [
        { beneficiaryId: 'user1', token: 'XP', totalAmount: 100 },
        { beneficiaryId: 'user2', token: 'XP', totalAmount: 200 },
        { beneficiaryId: 'user3', token: 'XP', totalAmount: 300 },
        { beneficiaryId: 'user4', token: 'XP', totalAmount: 400 },
      ];

      // Act
      const { root, leaves } = service.generateTree(balances, 'EVM');

      // Assert: Tree structure is valid
      expect(leaves.size).toBe(4);
      expect(root).toMatch(/^0x[a-f0-9]{64}$/);

      // All leaves should be unique
      const uniqueHashes = new Set(leaves.values());
      expect(uniqueHashes.size).toBe(4);
    });

    it('should handle odd number of leaves correctly', () => {
      // Arrange: 3 users (unbalanced tree)
      const balances = [
        { beneficiaryId: 'user1', token: 'XP', totalAmount: 100 },
        { beneficiaryId: 'user2', token: 'XP', totalAmount: 200 },
        { beneficiaryId: 'user3', token: 'XP', totalAmount: 300 },
      ];

      // Act: MerkleTreeJS handles odd leaves by duplicating the last one
      const { root, leaves } = service.generateTree(balances, 'EVM');

      // Assert: Root is still valid
      expect(leaves.size).toBe(3);
      expect(root).toMatch(/^0x[a-f0-9]{64}$/);
    });

    it('should generate different roots for different data', () => {
      // Arrange: Two different datasets
      const balances1 = [
        { beneficiaryId: 'user1', token: 'XP', totalAmount: 100 },
      ];
      const balances2 = [
        { beneficiaryId: 'user1', token: 'XP', totalAmount: 200 }, // Different amount
      ];

      // Act
      const { root: root1 } = service.generateTree(balances1, 'EVM');
      const { root: root2 } = service.generateTree(balances2, 'EVM');

      // Assert: Different data produces different roots
      expect(root1).not.toBe(root2);
    });

    it('should generate same root for same data (deterministic)', () => {
      // Arrange: Same dataset
      const balances = [
        { beneficiaryId: 'user1', token: 'XP', totalAmount: 100 },
        { beneficiaryId: 'user2', token: 'XP', totalAmount: 200 },
      ];

      // Act: Generate tree twice
      const { root: root1 } = service.generateTree(balances, 'EVM');
      const { root: root2 } = service.generateTree(balances, 'EVM');

      // Assert: Identical roots
      expect(root1).toBe(root2);
    });
  });

  describe('Proof Generation', () => {
    it('should generate empty proof for single-leaf tree', () => {
      // Arrange: Single user
      const balances = [
        { beneficiaryId: 'solo-user', token: 'XP', totalAmount: 100 },
      ];

      // Act: Generate proof for the only user
      const proof = service.generateProof('solo-user', balances);

      // Assert: No siblings needed, empty proof array
      expect(proof).not.toBeNull();
      expect(proof!.proof).toEqual([]);
      expect(proof!.amount).toBe(100);
      expect(proof!.beneficiaryId).toBe('solo-user');
    });

    it('should generate 1-element proof for 2-leaf tree', () => {
      // Arrange: Two users
      const balances = [
        { beneficiaryId: 'user1', token: 'XP', totalAmount: 100 },
        { beneficiaryId: 'user2', token: 'XP', totalAmount: 200 },
      ];

      // Act: Generate proof for user1
      const proof = service.generateProof('user1', balances);

      // Assert: Proof contains user2's leaf hash (sibling)
      expect(proof).not.toBeNull();
      expect(proof!.proof).toHaveLength(1);
      expect(proof!.proof[0]).toMatch(/^0x[a-f0-9]{64}$/);
    });

    it('should generate 2-element proof for 4-leaf tree', () => {
      // Arrange: Four users (depth 2)
      const balances = [
        { beneficiaryId: 'user1', token: 'XP', totalAmount: 100 },
        { beneficiaryId: 'user2', token: 'XP', totalAmount: 200 },
        { beneficiaryId: 'user3', token: 'XP', totalAmount: 300 },
        { beneficiaryId: 'user4', token: 'XP', totalAmount: 400 },
      ];

      // Act: Generate proof for any user
      const proof = service.generateProof('user1', balances);

      // Assert: Proof has 2 elements (tree depth)
      expect(proof).not.toBeNull();
      expect(proof!.proof).toHaveLength(2);
    });

    it('should return null for non-existent beneficiary', () => {
      // Arrange: Dataset without target user
      const balances = [
        { beneficiaryId: 'user1', token: 'XP', totalAmount: 100 },
      ];

      // Act: Try to generate proof for missing user
      const proof = service.generateProof('non-existent', balances);

      // Assert: No proof available
      expect(proof).toBeNull();
    });

    it('should include all metadata in proof', () => {
      // Arrange
      const balances = [
        {
          beneficiaryId: 'user@example.com',
          token: 'USDC',
          totalAmount: 123.456789,
        },
      ];

      // Act
      const proof = service.generateProof('user@example.com', balances);

      // Assert: All fields present
      expect(proof).not.toBeNull();
      expect(proof!.beneficiaryId).toBe('user@example.com');
      expect(proof!.token).toBe('USDC');
      expect(proof!.amount).toBe(123.456789);
      expect(proof!.leaf).toMatch(/^0x[a-f0-9]{64}$/);
      expect(Array.isArray(proof!.proof)).toBe(true);
      // Note: root is not stored in the proof, it's determined during verification
    });
  });

  describe('Proof Verification', () => {
    it('should verify valid proof for single-leaf tree', () => {
      // Arrange: Generate tree and proof
      const balances = [
        { beneficiaryId: 'user1', token: 'XP', totalAmount: 100 },
      ];
      const { root } = service.generateTree(balances, 'EVM');
      const proof = service.generateProof('user1', balances);

      // Act: Verify proof
      const isValid = service.verifyProof(proof!, root);

      // Assert: Proof is valid
      expect(isValid).toBe(true);
    });

    it('should verify valid proof for multi-leaf tree', () => {
      // Arrange: Generate tree with multiple leaves
      const balances = [
        { beneficiaryId: 'user1', token: 'XP', totalAmount: 100 },
        { beneficiaryId: 'user2', token: 'XP', totalAmount: 200 },
        { beneficiaryId: 'user3', token: 'XP', totalAmount: 300 },
      ];
      const { root } = service.generateTree(balances, 'EVM');
      const proof1 = service.generateProof('user1', balances);
      const proof2 = service.generateProof('user2', balances);
      const proof3 = service.generateProof('user3', balances);

      // Act & Assert: All proofs verify
      expect(service.verifyProof(proof1!, root)).toBe(true);
      expect(service.verifyProof(proof2!, root)).toBe(true);
      expect(service.verifyProof(proof3!, root)).toBe(true);
    });

    it('should reject proof with wrong root', () => {
      // Arrange: Generate proof for one tree, verify against another with multiple users
      const balances1 = [
        { beneficiaryId: 'user1', token: 'XP', totalAmount: 100 },
        { beneficiaryId: 'user2', token: 'XP', totalAmount: 150 },
      ];
      const balances2 = [
        { beneficiaryId: 'user1', token: 'XP', totalAmount: 200 }, // Different amount
        { beneficiaryId: 'user2', token: 'XP', totalAmount: 250 },
      ];

      const proof1 = service.generateProof('user1', balances1);
      const { root: root2 } = service.generateTree(balances2, 'EVM');

      // Act: Verify proof1 against root2 (different tree)
      const isValid = service.verifyProof(proof1!, root2);

      // Assert: Invalid proof (from different tree)
      expect(isValid).toBe(false);
    });

    it('should reject proof for user not in tree', () => {
      // Arrange: Tree with 2 users
      const balances = [
        { beneficiaryId: 'user1', token: 'XP', totalAmount: 100 },
        { beneficiaryId: 'user2', token: 'XP', totalAmount: 200 },
      ];
      const { root } = service.generateTree(balances, 'EVM');

      // Act: Try to generate proof for user not in tree
      const proof = service.generateProof('attacker', balances);

      // Assert: No proof available for non-existent user
      expect(proof).toBeNull();
    });
  });

  describe('Large Trees', () => {
    it('should handle 100 users efficiently', () => {
      // Arrange: Large dataset
      const balances = Array.from({ length: 100 }, (_, i) => ({
        beneficiaryId: `user${i}`,
        token: 'XP',
        totalAmount: Math.random() * 1000,
      }));

      // Act: Generate tree
      const startTime = Date.now();
      const { root, leaves } = service.generateTree(balances, 'EVM');
      const elapsed = Date.now() - startTime;

      // Assert: Completes quickly
      expect(leaves.size).toBe(100);
      expect(root).toMatch(/^0x[a-f0-9]{64}$/);
      expect(elapsed).toBeLessThan(1000); // Should take < 1 second
    });

    it('should generate and verify proofs for large trees', () => {
      // Arrange: 100 users
      const balances = Array.from({ length: 100 }, (_, i) => ({
        beneficiaryId: `user${i}`,
        token: 'XP',
        totalAmount: i * 10,
      }));
      const { root } = service.generateTree(balances, 'EVM');

      // Act: Generate and verify multiple proofs
      const proof1 = service.generateProof('user0', balances);
      const proof50 = service.generateProof('user50', balances);
      const proof99 = service.generateProof('user99', balances);

      // Assert: All proofs valid
      expect(service.verifyProof(proof1!, root)).toBe(true);
      expect(service.verifyProof(proof50!, root)).toBe(true);
      expect(service.verifyProof(proof99!, root)).toBe(true);

      // Proof size should be logarithmic (log2(100) ≈ 7)
      expect(proof1!.proof.length).toBeLessThan(10);
      expect(proof50!.proof.length).toBeLessThan(10);
    });
  });

  describe('Chain Compatibility', () => {
    it('should generate identical trees for EVM and SVM chains', () => {
      // Arrange: Same dataset
      const balances = [
        { beneficiaryId: 'user1', token: 'XP', totalAmount: 100.12345678 },
        { beneficiaryId: 'user2', token: 'XP', totalAmount: 200.87654321 },
      ];

      // Act: Generate for both chains
      const evmTree = service.generateTree(balances, 'EVM');
      const svmTree = service.generateTree(balances, 'SVM');

      // Assert: Roots must match (keccak256 used for both)
      expect(evmTree.root).toBe(svmTree.root);
      expect(evmTree.leaves).toEqual(svmTree.leaves);
    });
  });
});
