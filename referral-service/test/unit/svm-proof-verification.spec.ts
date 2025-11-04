// Mock Solana and Anchor modules BEFORE imports
jest.mock('@solana/web3.js', () => {
  const mockPublicKey = jest.fn().mockImplementation((value: any) => ({
    toString: jest.fn().mockReturnValue(value?.toString() || 'MockAddress'),
    equals: jest.fn().mockReturnValue(true),
    toBase58: jest.fn().mockReturnValue('MockBase58Address'),
    toBuffer: jest.fn().mockReturnValue(Buffer.alloc(32)),
  }));

  (mockPublicKey as any).findProgramAddressSync = jest.fn().mockReturnValue([
    { toString: jest.fn().mockReturnValue('MockPDA') },
    255,
  ]);

  const mockKeypair = {
    publicKey: {
      toString: jest.fn().mockReturnValue('MockKeypairPublicKey'),
      equals: jest.fn().mockReturnValue(true),
    },
    secretKey: new Uint8Array(64),
  };

  return {
    Connection: jest.fn().mockImplementation(() => ({
      getAccountInfo: jest.fn(),
      getBalance: jest.fn(),
    })),
    PublicKey: mockPublicKey,
    Keypair: {
      generate: jest.fn().mockReturnValue(mockKeypair),
      fromSecretKey: jest.fn().mockReturnValue(mockKeypair),
    },
    Transaction: jest.fn(),
    SystemProgram: {
      programId: { toString: jest.fn().mockReturnValue('11111111111111111111111111111111') },
    },
  };
});

jest.mock('@coral-xyz/anchor', () => ({
  AnchorProvider: jest.fn(),
  Program: jest.fn(),
  Wallet: jest.fn(),
  setProvider: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { SvmBlockchainService } from '../../src/infrastructure/services/svm-blockchain.service';
import { MerkleTreeService } from '../../src/infrastructure/services/merkle-tree.service';
import { Logger } from '@nestjs/common';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { PrismaService } from '../../src/infrastructure/prisma/services/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import { keccak256 } from 'ethers';

/**
 * SVM Proof Verification Tests with keccak256
 * 
 * Tests cover:
 * 1. keccak256 hashing matches backend and contract
 * 2. Root updates with keccak256
 * 3. Proof verification with single leaf (proofLen=0)
 * 4. Proof verification with multiple leaves
 * 5. Invalid proof detection
 */
describe('SVM Proof Verification with keccak256', () => {
  let svmService: SvmBlockchainService;
  let merkleService: MerkleTreeService;
  let mockProgram: any;
  let mockWallet: any;
  let mockProvider: any;
  let mockConnection: any;
  let mockStateAccount: any;

  beforeEach(() => {
    // Mock Logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    // Mock wallet
    const mockKeypair = {
      publicKey: {
        toString: jest.fn().mockReturnValue('MockWalletAddress123'),
        equals: jest.fn(),
      },
    };
    mockWallet = {
      publicKey: {
        toString: jest.fn().mockReturnValue('MockWalletAddress123'),
        equals: jest.fn().mockReturnValue(true),
      },
    };

    // Mock connection
    mockConnection = {};

    // Mock provider
    mockProvider = {
      wallet: mockWallet,
    };

    // Mock state account
    mockStateAccount = {
      merkleRoot: new Array(32).fill(0),
      version: 0,
      authority: {
        toString: jest.fn().mockReturnValue('MockWalletAddress123'),
      },
    };

    // Mock program
    mockProgram = {
      methods: {
        updateRoot: jest.fn().mockReturnValue({
          accounts: jest.fn().mockReturnThis(),
          simulate: jest.fn().mockResolvedValue({ value: { err: null } }),
          rpc: jest.fn().mockResolvedValue('MockTxHash123'),
        }),
        verifyProof: jest.fn().mockReturnValue({
          accounts: jest.fn().mockReturnThis(),
          simulate: jest.fn().mockResolvedValue({ value: true }),
        }),
      },
      account: {
        state: {
          fetch: jest.fn().mockResolvedValue(mockStateAccount),
        },
      },
      provider: mockProvider,
      programId: {
        toString: jest.fn().mockReturnValue('EkEP6vRisXSE4TSBDvr8FcpzZgSaYeVKc9uRdFpnXQVB'),
      },
    };

    // Mock AnchorProvider
    (AnchorProvider as any).mockImplementation(() => mockProvider);

    // Mock Program
    (Program as any).mockImplementation(() => mockProgram);

    // Mock Connection
    (Connection as any).mockImplementation(() => mockConnection);

    // Mock PublicKey
    (PublicKey as any).mockImplementation((address: string) => ({
      toString: jest.fn().mockReturnValue(address),
      equals: jest.fn().mockReturnValue(true),
    }));

    // Mock Keypair
    (Keypair as any).fromSecretKey = jest.fn().mockReturnValue(mockKeypair);
    (Wallet as any).mockImplementation(() => mockWallet);

    // Setup environment
    process.env.SVM_RPC_URL = 'https://api.devnet.solana.com';
    process.env.SVM_PRIVATE_KEY = JSON.stringify([1, 2, 3, 4]);
    process.env.SVM_STATE_KEYPAIR_PATH = path.join(__dirname, '../../test-fixtures/state-keypair.json');
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.SVM_STATE_KEYPAIR_PATH;
    jest.useRealTimers();
  });

  describe('keccak256 Hashing', () => {
    it('should generate leaf hash using keccak256 matching backend format', () => {
      // Backend format: `${balance.beneficiaryId}:${balance.token}:${balance.totalAmount.toFixed(8)}`
      const userId = 'MATTHEWPINNOCK.MP@GMAIL.COM';
      const token = 'XP';
      const amount = '1821.30000000';
      
      const data = `${userId}:${token}:${amount}`;
      const hash = keccak256(Buffer.from(data));
      
      // Should be a valid keccak256 hash (66 chars: 0x + 64 hex)
      expect(hash).toMatch(/^0x[0-9a-f]{64}$/i);
      
      // Verify it's keccak256 (not SHA256)
      // keccak256("test") = 0x9c22ff5f21f0b81b113e63f7db6da94fedef11b2119b4088b89664cb9a2cb268
      // sha256("test") = 0x9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08
      const testHash = keccak256(Buffer.from('test'));
      expect(testHash).toBe('0x9c22ff5f21f0b81b113e63f7db6da94fedef11b2119b4088b89664cb9a2cb268');
    });

    it('should generate merkle tree root using keccak256', async () => {
      const module = await Test.createTestingModule({
        providers: [PrismaService, MerkleTreeService],
      }).compile();
      
      merkleService = module.get<MerkleTreeService>(MerkleTreeService);
      
      const balances = [
        { beneficiaryId: 'USER_A', token: 'XP', totalAmount: 100.5 },
        { beneficiaryId: 'USER_B', token: 'XP', totalAmount: 200.75 },
      ];
      
      const { root } = merkleService.generateTree(balances, 'SVM');
      
      // Root should be keccak256 hash
      expect(root).toMatch(/^0x[0-9a-f]{64}$/i);
      expect(root).not.toBe('0x0000000000000000000000000000000000000000000000000000000000000000');
    });
  });

  describe('Root Update and Proof Verification Flow', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it('should update root and verify proof with single leaf (proofLen=0)', async () => {
      // Arrange: Create test state keypair
      const testStateKeypair = Keypair.generate();
      const testStateAddress = testStateKeypair.publicKey.toString();
      const testKeypairPath = path.join(__dirname, '../../test-fixtures/state-keypair.json');
      
      const dir = path.dirname(testKeypairPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(testKeypairPath, JSON.stringify(Array.from(testStateKeypair.secretKey)));

      process.env.SVM_STATE_KEYPAIR_PATH = testKeypairPath;
      process.env.SVM_XP_CONTRACT_ADDRESS = 'EkEP6vRisXSE4TSBDvr8FcpzZgSaYeVKc9uRdFpnXQVB';

      // Initialize services
      svmService = new SvmBlockchainService();
      svmService.initialize(process.env.SVM_RPC_URL!, process.env.SVM_PRIVATE_KEY);

      const module = Test.createTestingModule({
        providers: [PrismaService, MerkleTreeService],
      }).compile();
      merkleService = module.get<MerkleTreeService>(MerkleTreeService);

      // Generate merkle tree with single leaf
      const balances = [
        { beneficiaryId: 'MATTHEWPINNOCK.MP@GMAIL.COM', token: 'XP', totalAmount: 1821.3 },
      ];
      const { root } = merkleService.generateTree(balances, 'SVM');
      const proof = merkleService.generateProof('MATTHEWPINNOCK.MP@GMAIL.COM', balances);

      expect(proof).not.toBeNull();
      expect(proof!.proof.length).toBe(0); // Single leaf = empty proof array
      expect(proof!.amount).toBe(1821.3);

      // Mock state account fetches
      const rootBytes = Buffer.from(root.slice(2), 'hex');
      let fetchCallCount = 0;
      mockProgram.account.state.fetch = jest.fn().mockImplementation(() => {
        fetchCallCount++;
        if (fetchCallCount === 1) {
          return Promise.resolve({
            merkleRoot: new Array(32).fill(0),
            version: 0,
            authority: { toString: jest.fn().mockReturnValue('MockWalletAddress123') },
          });
        } else if (fetchCallCount === 2) {
          return Promise.resolve({
            merkleRoot: Array.from(rootBytes),
            version: 1,
            authority: { toString: jest.fn().mockReturnValue('MockWalletAddress123') },
          });
        }
        return Promise.resolve({
          merkleRoot: Array.from(rootBytes),
          version: 1,
          authority: { toString: jest.fn().mockReturnValue('MockWalletAddress123') },
        });
      });

      // Mock updateRoot
      const updateRootMock = {
        accounts: jest.fn().mockReturnThis(),
        simulate: jest.fn().mockResolvedValue({ value: { err: null } }),
        rpc: jest.fn().mockResolvedValue('MockTxHash123'),
      };
      mockProgram.methods.updateRoot = jest.fn().mockReturnValue(updateRootMock);

      // Act 1: Update root
      const txPromise = svmService.updateMerkleRoot(testStateAddress, root);
      jest.advanceTimersByTime(1000);
      const txHash = await txPromise;
      
      expect(txHash).toBe('MockTxHash123');

      // Mock verifyProof to return events array with proofVerified event (matches actual Anchor format)
      const verifyProofMock = {
        accounts: jest.fn().mockReturnThis(),
        simulate: jest.fn().mockResolvedValue({
          events: [
            {
              name: 'proofVerified',
              data: {
                userId: proof!.beneficiaryId,
                token: proof!.token,
                amountStr: proof!.amount.toFixed(8),
                valid: true,
              },
            },
          ],
        }),
      };
      mockProgram.methods.verifyProof = jest.fn().mockReturnValue(verifyProofMock);

      // Act 2: Verify proof (should succeed even with proofLen=0)
      const isValid = await svmService.verifyProof(
        testStateAddress,
        proof!.proof,
        proof!.beneficiaryId,
        proof!.token,
        proof!.amount.toFixed(8)
      );

      // Assert: Proof should be valid
      expect(isValid).toBe(true);
      expect(mockProgram.methods.verifyProof).toHaveBeenCalledWith(
        proof!.beneficiaryId,
        proof!.token,
        proof!.amount.toFixed(8),
        expect.any(Array) // proofBytes array
      );
      expect(verifyProofMock.accounts).toHaveBeenCalledWith({
        state: expect.any(Object),
      });

      // Cleanup
      if (fs.existsSync(testKeypairPath)) {
        fs.unlinkSync(testKeypairPath);
      }
    });

    it('should verify proof with multiple leaves', async () => {
      // Arrange
      const testStateKeypair = Keypair.generate();
      const testStateAddress = testStateKeypair.publicKey.toString();
      const testKeypairPath = path.join(__dirname, '../../test-fixtures/state-keypair.json');
      
      const dir = path.dirname(testKeypairPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(testKeypairPath, JSON.stringify(Array.from(testStateKeypair.secretKey)));

      process.env.SVM_STATE_KEYPAIR_PATH = testKeypairPath;
      process.env.SVM_XP_CONTRACT_ADDRESS = 'EkEP6vRisXSE4TSBDvr8FcpzZgSaYeVKc9uRdFpnXQVB';

      svmService = new SvmBlockchainService();
      svmService.initialize(process.env.SVM_RPC_URL!, process.env.SVM_PRIVATE_KEY);

      const module = Test.createTestingModule({
        providers: [PrismaService, MerkleTreeService],
      }).compile();
      merkleService = module.get<MerkleTreeService>(MerkleTreeService);

      // Generate merkle tree with multiple leaves
      const balances = [
        { beneficiaryId: 'USER_A', token: 'XP', totalAmount: 100.5 },
        { beneficiaryId: 'USER_B', token: 'XP', totalAmount: 200.75 },
        { beneficiaryId: 'USER_C', token: 'XP', totalAmount: 300.25 },
      ];
      const { root } = merkleService.generateTree(balances, 'SVM');
      const proof = merkleService.generateProof('USER_B', balances);

      expect(proof).not.toBeNull();
      expect(proof!.proof.length).toBeGreaterThan(0); // Multiple leaves = non-empty proof

      // Mock state account
      const rootBytes = Buffer.from(root.slice(2), 'hex');
      mockProgram.account.state.fetch = jest.fn().mockResolvedValue({
        merkleRoot: Array.from(rootBytes),
        version: 1,
        authority: { toString: jest.fn().mockReturnValue('MockWalletAddress123') },
      });

      // Mock verifyProof with events array format
      const verifyProofMock = {
        accounts: jest.fn().mockReturnThis(),
        simulate: jest.fn().mockResolvedValue({
          events: [
            {
              name: 'proofVerified',
              data: {
                userId: proof!.beneficiaryId,
                token: proof!.token,
                amountStr: proof!.amount.toFixed(8),
                valid: true,
              },
            },
          ],
        }),
      };
      mockProgram.methods.verifyProof = jest.fn().mockReturnValue(verifyProofMock);

      // Act: Verify proof
      const isValid = await svmService.verifyProof(
        testStateAddress,
        proof!.proof,
        proof!.beneficiaryId,
        proof!.token,
        proof!.amount.toFixed(8)
      );

      // Assert
      expect(isValid).toBe(true);
      expect(mockProgram.methods.verifyProof).toHaveBeenCalled();

      // Cleanup
      if (fs.existsSync(testKeypairPath)) {
        fs.unlinkSync(testKeypairPath);
      }
    });

    it('should detect invalid proof', async () => {
      // Arrange
      const testStateKeypair = Keypair.generate();
      const testStateAddress = testStateKeypair.publicKey.toString();
      const testKeypairPath = path.join(__dirname, '../../test-fixtures/state-keypair.json');
      
      const dir = path.dirname(testKeypairPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(testKeypairPath, JSON.stringify(Array.from(testStateKeypair.secretKey)));

      process.env.SVM_STATE_KEYPAIR_PATH = testKeypairPath;
      process.env.SVM_XP_CONTRACT_ADDRESS = 'EkEP6vRisXSE4TSBDvr8FcpzZgSaYeVKc9uRdFpnXQVB';

      svmService = new SvmBlockchainService();
      svmService.initialize(process.env.SVM_RPC_URL!, process.env.SVM_PRIVATE_KEY);

      // Mock state account with different root
      const wrongRootBytes = Buffer.from('a'.repeat(64), 'hex');
      mockProgram.account.state.fetch = jest.fn().mockResolvedValue({
        merkleRoot: Array.from(wrongRootBytes),
        version: 1,
        authority: { toString: jest.fn().mockReturnValue('MockWalletAddress123') },
      });

      // Mock verifyProof to return false (invalid proof) via events
      const verifyProofMock = {
        accounts: jest.fn().mockReturnThis(),
        simulate: jest.fn().mockResolvedValue({
          events: [
            {
              name: 'proofVerified',
              data: {
                userId: 'WRONG_USER',
                token: 'XP',
                amountStr: '999.99999999',
                valid: false,
              },
            },
          ],
        }),
      };
      mockProgram.methods.verifyProof = jest.fn().mockReturnValue(verifyProofMock);

      // Act: Verify proof with wrong data
      const isValid = await svmService.verifyProof(
        testStateAddress,
        ['0xabcd1234', '0x5678ef90'],
        'WRONG_USER',
        'XP',
        '999.99999999'
      );

      // Assert
      expect(isValid).toBe(false);
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        expect.stringContaining('SVM proof invalid')
      );

      // Cleanup
      if (fs.existsSync(testKeypairPath)) {
        fs.unlinkSync(testKeypairPath);
      }
    });

    it('should handle simulate() return value format variations', async () => {
      // Arrange
      const testStateKeypair = Keypair.generate();
      const testStateAddress = testStateKeypair.publicKey.toString();
      const testKeypairPath = path.join(__dirname, '../../test-fixtures/state-keypair.json');
      
      const dir = path.dirname(testKeypairPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(testKeypairPath, JSON.stringify(Array.from(testStateKeypair.secretKey)));

      process.env.SVM_STATE_KEYPAIR_PATH = testKeypairPath;
      process.env.SVM_XP_CONTRACT_ADDRESS = 'EkEP6vRisXSE4TSBDvr8FcpzZgSaYeVKc9uRdFpnXQVB';

      svmService = new SvmBlockchainService();
      svmService.initialize(process.env.SVM_RPC_URL!, process.env.SVM_PRIVATE_KEY);

      const rootBytes = Buffer.from('b'.repeat(64), 'hex');
      mockProgram.account.state.fetch = jest.fn().mockResolvedValue({
        merkleRoot: Array.from(rootBytes),
        version: 1,
        authority: { toString: jest.fn().mockReturnValue('MockWalletAddress123') },
      });

      // Test case 1: events array format (current Anchor format)
      let verifyProofMock1 = {
        accounts: jest.fn().mockReturnThis(),
        simulate: jest.fn().mockResolvedValue({
          events: [
            {
              name: 'proofVerified',
              data: {
                userId: 'USER_A',
                token: 'XP',
                amountStr: '100.00000000',
                valid: true,
              },
            },
          ],
        }),
      };
      mockProgram.methods.verifyProof = jest.fn().mockReturnValue(verifyProofMock1);
      
      const isValid1 = await svmService.verifyProof(
        testStateAddress,
        [],
        'USER_A',
        'XP',
        '100.00000000'
      );
      expect(isValid1).toBe(true);

      // Test case 2: sim.value is boolean (fallback for older Anchor versions)
      let verifyProofMock2 = {
        accounts: jest.fn().mockReturnThis(),
        simulate: jest.fn().mockResolvedValue({ value: true }),
      };
      mockProgram.methods.verifyProof = jest.fn().mockReturnValue(verifyProofMock2);
      
      const isValid2 = await svmService.verifyProof(
        testStateAddress,
        [],
        'USER_B',
        'XP',
        '200.00000000'
      );
      expect(isValid2).toBe(true);

      // Cleanup
      if (fs.existsSync(testKeypairPath)) {
        fs.unlinkSync(testKeypairPath);
      }
    });
  });
});

