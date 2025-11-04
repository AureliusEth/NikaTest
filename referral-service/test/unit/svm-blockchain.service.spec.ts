// Mock Solana and Anchor modules BEFORE imports
jest.mock('@solana/web3.js', () => {
  const mockPublicKey = jest.fn().mockImplementation((value: any) => {
    const addressStr = value?.toString() || 'MockAddress';
    return {
      toString: jest.fn().mockReturnValue(addressStr),
      equals: jest.fn().mockImplementation((other: any) => {
        // Compare addresses properly
        const otherStr = other?.toString?.() || '';
        return addressStr === otherStr;
      }),
      toBase58: jest.fn().mockReturnValue('MockBase58Address'),
      toBuffer: jest.fn().mockReturnValue(Buffer.alloc(32)),
    };
  });

  (mockPublicKey as any).findProgramAddressSync = jest.fn().mockReturnValue([
    { toString: jest.fn().mockReturnValue('MockPDA') },
    255,
  ]);

  const mockKeypair = {
    publicKey: {
      toString: jest.fn().mockReturnValue('MockKeypairPublicKey'),
      equals: jest.fn().mockImplementation((other: any) => {
        const otherStr = other?.toString?.() || '';
        return 'MockKeypairPublicKey' === otherStr;
      }),
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
import { Logger } from '@nestjs/common';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import * as fs from 'fs';
import * as path from 'path';

describe('SvmBlockchainService - updateMerkleRoot', () => {
  let service: SvmBlockchainService;
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
        initialize: jest.fn().mockReturnValue({
          accounts: jest.fn().mockReturnThis(),
          signers: jest.fn().mockReturnThis(),
          rpc: jest.fn().mockResolvedValue('InitTxHash123'),
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

  describe('updateMerkleRoot - should persist root after update', () => {
    it('should update merkle root and verify it persists on-chain', async () => {
      // Arrange: Create a test state keypair file
      const testStateKeypair = Keypair.generate();
      const testStateAddress = testStateKeypair.publicKey.toString();
      const testKeypairPath = path.join(__dirname, '../../test-fixtures/state-keypair.json');
      
      // Ensure directory exists
      const dir = path.dirname(testKeypairPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Write test keypair
      fs.writeFileSync(testKeypairPath, JSON.stringify(Array.from(testStateKeypair.secretKey)));

      // Set environment
      process.env.SVM_STATE_KEYPAIR_PATH = testKeypairPath;
      process.env.SVM_XP_CONTRACT_ADDRESS = 'EkEP6vRisXSE4TSBDvr8FcpzZgSaYeVKc9uRdFpnXQVB';

      // Mock the state account to return zero root initially, then updated root
      const zeroRoot = new Array(32).fill(0);
      const newRootBytes = Buffer.from('176b19ebf031dbd0f5efa66eea9e05b7006cb79d7fcdf92089707fe4b5853a63', 'hex');
      
      let fetchCallCount = 0;
      mockProgram.account.state.fetch = jest.fn().mockImplementation(() => {
        fetchCallCount++;
        if (fetchCallCount === 1) {
          // First fetch (ensureStateInitialized check)
          return Promise.resolve({
            merkleRoot: zeroRoot,
            version: 0,
            authority: {
              toString: jest.fn().mockReturnValue('MockWalletAddress123'),
            },
          });
        } else if (fetchCallCount === 2) {
          // Second fetch (authority check before update)
          return Promise.resolve({
            merkleRoot: zeroRoot,
            version: 0,
            authority: {
              toString: jest.fn().mockReturnValue('MockWalletAddress123'),
            },
          });
        } else if (fetchCallCount === 3) {
          // Third fetch (after updateRoot) - should return new root
          return Promise.resolve({
            merkleRoot: Array.from(newRootBytes),
            version: 1,
            authority: {
              toString: jest.fn().mockReturnValue('MockWalletAddress123'),
            },
          });
        }
        return Promise.resolve(mockStateAccount);
      });

      // Mock updateRoot
      const updateRootMock = {
        accounts: jest.fn().mockReturnThis(),
        simulate: jest.fn().mockResolvedValue({ value: { err: null } }),
        rpc: jest.fn().mockResolvedValue('MockTxHash123'),
      };
      mockProgram.methods.updateRoot = jest.fn().mockReturnValue(updateRootMock);

      // Initialize service AFTER setting up mocks
      service = new SvmBlockchainService();
      service.initialize(
        process.env.SVM_RPC_URL!,
        process.env.SVM_PRIVATE_KEY
      );

      // Inject the mock program into the service
      (service as any).program = mockProgram;
      (service as any).wallet = mockWallet;

      // Act: Update merkle root
      const newRootHex = '0x176b19ebf031dbd0f5efa66eea9e05b7006cb79d7fcdf92089707fe4b5853a63';
      const txHash = await service.updateMerkleRoot(
        'EkEP6vRisXSE4TSBDvr8FcpzZgSaYeVKc9uRdFpnXQVB',
        newRootHex
      );

      // Assert: Transaction should succeed
      expect(txHash).toBe('MockTxHash123');
      
      // Assert: updateRoot should be called with correct parameters
      expect(mockProgram.methods.updateRoot).toHaveBeenCalled();
      const updateRootCall = mockProgram.methods.updateRoot.mock.calls[0];
      expect(updateRootCall[0]).toEqual(expect.arrayContaining([
        expect.any(Number)
      ]));
      expect(updateRootCall[0].length).toBe(32);

      // Assert: simulate should be called before rpc
      expect(updateRootMock.simulate).toHaveBeenCalled();
      expect(updateRootMock.rpc).toHaveBeenCalled();

      // Assert: accounts should be called with correct state address
      expect(updateRootMock.accounts).toHaveBeenCalledWith({
        state: expect.any(Object),
        authority: mockWallet.publicKey,
      });

      // Assert: State should be fetched multiple times
      expect(mockProgram.account.state.fetch).toHaveBeenCalled();

      // Cleanup test file
      if (fs.existsSync(testKeypairPath)) {
        fs.unlinkSync(testKeypairPath);
      }
    });

    it('should throw error if authority mismatch', async () => {
      // Arrange
      const testStateKeypair = Keypair.generate();
      const testKeypairPath = path.join(__dirname, '../../test-fixtures/state-keypair.json');
      const dir = path.dirname(testKeypairPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(testKeypairPath, JSON.stringify(Array.from(testStateKeypair.secretKey)));

      process.env.SVM_STATE_KEYPAIR_PATH = testKeypairPath;
      process.env.SVM_XP_CONTRACT_ADDRESS = 'EkEP6vRisXSE4TSBDvr8FcpzZgSaYeVKc9uRdFpnXQVB';

      // Mock state account with different authority
      // The authority will be 'DifferentAuthority123', wallet will be 'MockWalletAddress123'
      const authorityAddress = 'DifferentAuthority123';
      const walletAddress = 'MockWalletAddress123';
      
      // Create a custom wallet public key that definitely won't match
      const walletPublicKey = {
        toString: jest.fn().mockReturnValue(walletAddress),
        equals: jest.fn().mockReturnValue(true), // Will equal itself
        toBase58: jest.fn().mockReturnValue(walletAddress),
        toBuffer: jest.fn().mockReturnValue(Buffer.alloc(32)),
      };
      
      mockProgram.account.state.fetch = jest.fn()
        .mockResolvedValueOnce({
          // First call: ensureStateInitialized
          merkleRoot: new Array(32).fill(0),
          version: 0,
          authority: {
            toString: jest.fn().mockReturnValue(authorityAddress),
          },
        })
        .mockResolvedValueOnce({
          // Second call: authority check - this one matters
          merkleRoot: new Array(32).fill(0),
          version: 0,
          authority: {
            toString: jest.fn().mockReturnValue(authorityAddress),
          },
        });

      service = new SvmBlockchainService();
      service.initialize(
        process.env.SVM_RPC_URL!,
        process.env.SVM_PRIVATE_KEY
      );

      // Override the global PublicKey mock for this test
      // When new PublicKey(authorityAddress) is called, it should create an object
      // whose equals() returns false when compared to walletPublicKey
      const originalPublicKey = (PublicKey as any).getMockImplementation();
      (PublicKey as any).mockImplementation((value: any) => {
        const addressStr = value?.toString() || 'MockAddress';
        if (addressStr === authorityAddress) {
          // This is the authority PublicKey - its equals should return false for wallet
          return {
            toString: jest.fn().mockReturnValue(addressStr),
            equals: jest.fn().mockImplementation((other: any) => {
              // Should return false when compared to wallet
              return false;
            }),
            toBase58: jest.fn().mockReturnValue(addressStr),
            toBuffer: jest.fn().mockReturnValue(Buffer.alloc(32)),
          };
        }
        // Default behavior for other addresses
        return originalPublicKey?.(value) || {
          toString: jest.fn().mockReturnValue(addressStr),
          equals: jest.fn().mockReturnValue(true),
          toBase58: jest.fn().mockReturnValue(addressStr),
          toBuffer: jest.fn().mockReturnValue(Buffer.alloc(32)),
        };
      });

      // Inject the mock program with mismatched authority
      (service as any).program = mockProgram;
      (service as any).wallet = {
        publicKey: walletPublicKey,
      };

      // Act & Assert: Should throw error for authority mismatch BEFORE calling updateRoot
      const newRootHex = '0x176b19ebf031dbd0f5efa66eea9e05b7006cb79d7fcdf92089707fe4b5853a63';
      
      await expect(
        service.updateMerkleRoot(
          'EkEP6vRisXSE4TSBDvr8FcpzZgSaYeVKc9uRdFpnXQVB',
          newRootHex
        )
      ).rejects.toThrow('Authority mismatch');

      // Cleanup
      if (fs.existsSync(testKeypairPath)) {
        fs.unlinkSync(testKeypairPath);
      }
    });

    it('should throw error if root mismatch after updateRoot transaction', async () => {
      // Arrange
      const testStateKeypair = Keypair.generate();
      const testKeypairPath = path.join(__dirname, '../../test-fixtures/state-keypair.json');
      const dir = path.dirname(testKeypairPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(testKeypairPath, JSON.stringify(Array.from(testStateKeypair.secretKey)));

      process.env.SVM_STATE_KEYPAIR_PATH = testKeypairPath;
      process.env.SVM_XP_CONTRACT_ADDRESS = 'EkEP6vRisXSE4TSBDvr8FcpzZgSaYeVKc9uRdFpnXQVB';

      const zeroRoot = new Array(32).fill(0);
      mockProgram.account.state.fetch = jest.fn()
        .mockResolvedValueOnce({
          // First call: ensureStateInitialized
          merkleRoot: zeroRoot,
          version: 0,
          authority: {
            toString: jest.fn().mockReturnValue('MockWalletAddress123'),
          },
        })
        .mockResolvedValueOnce({
          // Second call: authority check
          merkleRoot: zeroRoot,
          version: 0,
          authority: {
            toString: jest.fn().mockReturnValue('MockWalletAddress123'),
          },
        })
        .mockResolvedValueOnce({
          // Third call: after update - still returns zero (simulating failed update)
          merkleRoot: zeroRoot,
          version: 0,
          authority: {
            toString: jest.fn().mockReturnValue('MockWalletAddress123'),
          },
        });

      const updateRootMock = {
        accounts: jest.fn().mockReturnThis(),
        simulate: jest.fn().mockResolvedValue({ value: { err: null } }),
        rpc: jest.fn().mockResolvedValue('MockTxHash123'),
      };
      mockProgram.methods.updateRoot = jest.fn().mockReturnValue(updateRootMock);

      service = new SvmBlockchainService();
      service.initialize(
        process.env.SVM_RPC_URL!,
        process.env.SVM_PRIVATE_KEY
      );

      // Inject the mock program
      (service as any).program = mockProgram;
      (service as any).wallet = mockWallet;

      // Act & Assert: Should detect that root doesn't match expected value
      const newRootHex = '0x176b19ebf031dbd0f5efa66eea9e05b7006cb79d7fcdf92089707fe4b5853a63';
      
      await expect(
        service.updateMerkleRoot(
          'EkEP6vRisXSE4TSBDvr8FcpzZgSaYeVKc9uRdFpnXQVB',
          newRootHex
        )
      ).rejects.toThrow('Root mismatch after update');

      // Cleanup
      if (fs.existsSync(testKeypairPath)) {
        fs.unlinkSync(testKeypairPath);
      }
    });

    it('should throw error if transaction simulation fails', async () => {
      // Arrange
      const testStateKeypair = Keypair.generate();
      const testKeypairPath = path.join(__dirname, '../../test-fixtures/state-keypair.json');
      const dir = path.dirname(testKeypairPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(testKeypairPath, JSON.stringify(Array.from(testStateKeypair.secretKey)));

      process.env.SVM_STATE_KEYPAIR_PATH = testKeypairPath;
      process.env.SVM_XP_CONTRACT_ADDRESS = 'EkEP6vRisXSE4TSBDvr8FcpzZgSaYeVKc9uRdFpnXQVB';

      mockProgram.account.state.fetch = jest.fn()
        .mockResolvedValueOnce({
          // First call: ensureStateInitialized
          merkleRoot: new Array(32).fill(0),
          version: 0,
          authority: {
            toString: jest.fn().mockReturnValue('MockWalletAddress123'),
          },
        })
        .mockResolvedValueOnce({
          // Second call: authority check
          merkleRoot: new Array(32).fill(0),
          version: 0,
          authority: {
            toString: jest.fn().mockReturnValue('MockWalletAddress123'),
          },
        });

      const updateRootMock = {
        accounts: jest.fn().mockReturnThis(),
        simulate: jest.fn().mockResolvedValue({ 
          value: { err: { code: 6001, name: 'Unauthorized' } } 
        }),
        rpc: jest.fn(),
      };
      mockProgram.methods.updateRoot = jest.fn().mockReturnValue(updateRootMock);

      service = new SvmBlockchainService();
      service.initialize(
        process.env.SVM_RPC_URL!,
        process.env.SVM_PRIVATE_KEY
      );

      // Inject the mock program
      (service as any).program = mockProgram;
      (service as any).wallet = mockWallet;

      // Act & Assert: Should throw error for simulation failure
      const newRootHex = '0x176b19ebf031dbd0f5efa66eea9e05b7006cb79d7fcdf92089707fe4b5853a63';
      
      await expect(
        service.updateMerkleRoot(
          'EkEP6vRisXSE4TSBDvr8FcpzZgSaYeVKc9uRdFpnXQVB',
          newRootHex
        )
      ).rejects.toThrow('Transaction simulation failed');

      // Should not call rpc if simulation fails
      expect(updateRootMock.rpc).not.toHaveBeenCalled();

      // Cleanup
      if (fs.existsSync(testKeypairPath)) {
        fs.unlinkSync(testKeypairPath);
      }
    });

    it('should skip updating zero root to prevent overwriting valid data', async () => {
      // Arrange: Create a test state keypair file
      const testStateKeypair = Keypair.generate();
      const testKeypairPath = path.join(__dirname, '../../test-fixtures/state-keypair.json');
      
      const dir = path.dirname(testKeypairPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(testKeypairPath, JSON.stringify(Array.from(testStateKeypair.secretKey)));

      process.env.SVM_STATE_KEYPAIR_PATH = testKeypairPath;
      process.env.SVM_XP_CONTRACT_ADDRESS = 'EkEP6vRisXSE4TSBDvr8FcpzZgSaYeVKc9uRdFpnXQVB';

      service = new SvmBlockchainService();
      service.initialize(
        process.env.SVM_RPC_URL!,
        process.env.SVM_PRIVATE_KEY
      );

      // Inject the mock program into the service
      (service as any).program = mockProgram;
      (service as any).wallet = mockWallet;

      // Act: Try to update to zero root (should be skipped)
      const zeroRootHex = '0x0000000000000000000000000000000000000000000000000000000000000000';
      const txHash = await service.updateMerkleRoot(
        'EkEP6vRisXSE4TSBDvr8FcpzZgSaYeVKc9uRdFpnXQVB',
        zeroRootHex
      );

      // Assert: Should return skip message
      expect(txHash).toBe('skipped:zero-root');
      
      // Should log warning about skipping
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        expect.stringContaining('Skipping on-chain update to zero root')
      );

      // Cleanup
      if (fs.existsSync(testKeypairPath)) {
        fs.unlinkSync(testKeypairPath);
      }
    });
  });
});

