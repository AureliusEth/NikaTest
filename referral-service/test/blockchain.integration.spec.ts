import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/prisma/services/prisma.service';
import { EvmBlockchainService } from '../src/infrastructure/services/evm-blockchain.service';
import { SvmBlockchainService } from '../src/infrastructure/services/svm-blockchain.service';
import { AuthService } from '../src/common/auth/auth.service';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import cookieParser from 'cookie-parser';

/**
 * Blockchain Integration Tests
 * 
 * Tests the full flow of:
 * - Merkle root generation
 * - Contract updates (mocked)
 * - Claim flow (simulated XP)
 * - Treasury balance tracking
 * - Contract status checks
 */
describe('Blockchain Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let evmService: EvmBlockchainService;
  let svmService: SvmBlockchainService;
  let authService: AuthService;

  // Mock blockchain service implementations
  const mockEvmService = {
    initialize: jest.fn(),
    isInitialized: jest.fn().mockReturnValue(true),
    updateMerkleRoot: jest.fn(),
    getMerkleRoot: jest.fn(),
    getMerkleRootVersion: jest.fn(),
    verifyProof: jest.fn(),
    getSignerAddress: jest.fn().mockReturnValue('0xMockSigner'),
  };

  const mockSvmService = {
    initialize: jest.fn(),
    isInitialized: jest.fn().mockReturnValue(true),
    updateMerkleRoot: jest.fn(),
    getMerkleRoot: jest.fn(),
    getMerkleRootVersion: jest.fn(),
    verifyProof: jest.fn(),
    getWalletAddress: jest.fn().mockReturnValue('MockWalletAddress'),
  };

  /**
   * Helper function to create a session and get cookie
   */
  async function createSessionCookie(userId: string): Promise<string> {
    const token = await authService.createSession(userId);
    return token;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EvmBlockchainService)
      .useValue(mockEvmService)
      .overrideProvider(SvmBlockchainService)
      .useValue(mockSvmService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    
    prisma = app.get<PrismaService>(PrismaService);
    evmService = app.get<EvmBlockchainService>(EvmBlockchainService);
    svmService = app.get<SvmBlockchainService>(SvmBlockchainService);
    authService = app.get<AuthService>(AuthService);
    
    await app.init();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Clean up database
    await prisma.claimRecord.deleteMany();
    await prisma.treasuryAccount.deleteMany();
    await prisma.merkleRoot.deleteMany();
    await prisma.commissionLedgerEntry.deleteMany();
    await prisma.trade.deleteMany();
    await prisma.referralLink.deleteMany();
    await prisma.idempotencyKey.deleteMany();
    await prisma.user.deleteMany();

    // Reset mocks
    jest.clearAllMocks();
    
    // Setup default mock responses
    mockEvmService.getMerkleRoot.mockResolvedValue('0x0000000000000000000000000000000000000000000000000000000000000000');
    mockEvmService.getMerkleRootVersion.mockResolvedValue(0);
    mockEvmService.verifyProof.mockResolvedValue(true);
    mockEvmService.updateMerkleRoot.mockResolvedValue('0xMockTxHash');
    
    mockSvmService.getMerkleRoot.mockResolvedValue('0x0000000000000000000000000000000000000000000000000000000000000000');
    mockSvmService.getMerkleRootVersion.mockResolvedValue(0);
    mockSvmService.verifyProof.mockResolvedValue(true);
    mockSvmService.updateMerkleRoot.mockResolvedValue('MockSvmTxHash');
  });

  describe('Treasury Balance Tracking', () => {
    it('should track treasury balance when processing trade', async () => {
      // Create user
      await prisma.user.create({
        data: { id: 'USER_TREASURY_001', email: 'user1@test.com' },
      });

      // Process trade with fee
      const tradeResponse = await request(app.getHttpServer())
        .post('/api/trades/mock')
        .set('x-user-id', 'USER_TREASURY_001')
        .send({
          tradeId: 'trade_treasury_001',
          userId: 'USER_TREASURY_001',
          feeAmount: 100,
          token: 'XP',
          chain: 'EVM',
        })
        .expect(201);

      expect(tradeResponse.body.ok).toBe(true);

      // Check treasury balance was tracked
      const treasury = await prisma.treasuryAccount.findFirst({
        where: { chain: 'EVM', token: 'XP' },
      });

      expect(treasury).toBeDefined();
      expect(Number(treasury!.balance)).toBeGreaterThan(0);
    });

    it('should accumulate treasury balance across multiple trades', async () => {
      await prisma.user.create({
        data: { id: 'USER_TREASURY_002', email: 'user2@test.com' },
      });

      // Process first trade
      await request(app.getHttpServer())
        .post('/api/trades/mock')
        .set('x-user-id', 'USER_TREASURY_002')
        .send({
          tradeId: 'trade_treasury_002a',
          userId: 'USER_TREASURY_002',
          feeAmount: 50,
          token: 'XP',
          chain: 'EVM',
        })
        .expect(201);

      // Process second trade
      await request(app.getHttpServer())
        .post('/api/trades/mock')
        .set('x-user-id', 'USER_TREASURY_002')
        .send({
          tradeId: 'trade_treasury_002b',
          userId: 'USER_TREASURY_002',
          feeAmount: 50,
          token: 'XP',
          chain: 'EVM',
        })
        .expect(201);

      // Check treasury balance accumulated
      const treasury = await prisma.treasuryAccount.findFirst({
        where: { chain: 'EVM', token: 'XP' },
      });

      expect(treasury).toBeDefined();
      expect(Number(treasury!.balance)).toBeGreaterThan(50); // Should be more than single trade
    });

    it('should track treasury separately for EVM and SVM chains', async () => {
      await prisma.user.create({
        data: { id: 'USER_TREASURY_003', email: 'user3@test.com' },
      });

      // Process EVM trade
      await request(app.getHttpServer())
        .post('/api/trades/mock')
        .set('x-user-id', 'USER_TREASURY_003')
        .send({
          tradeId: 'trade_treasury_003_evm',
          userId: 'USER_TREASURY_003',
          feeAmount: 100,
          token: 'XP',
          chain: 'EVM',
        })
        .expect(201);

      // Process SVM trade
      await request(app.getHttpServer())
        .post('/api/trades/mock')
        .set('x-user-id', 'USER_TREASURY_003')
        .send({
          tradeId: 'trade_treasury_003_svm',
          userId: 'USER_TREASURY_003',
          feeAmount: 100,
          token: 'XP',
          chain: 'SVM',
        })
        .expect(201);

      // Check both treasury balances exist
      const evmTreasury = await prisma.treasuryAccount.findFirst({
        where: { chain: 'EVM', token: 'XP' },
      });
      const svmTreasury = await prisma.treasuryAccount.findFirst({
        where: { chain: 'SVM', token: 'XP' },
      });

      expect(evmTreasury).toBeDefined();
      expect(svmTreasury).toBeDefined();
      expect(Number(evmTreasury!.balance)).toBeGreaterThan(0);
      expect(Number(svmTreasury!.balance)).toBeGreaterThan(0);
    });
  });

  describe('Merkle Root Generation', () => {
    beforeEach(async () => {
      // Setup test data: create users and trades with claimable balances
      await prisma.user.createMany({
        data: [
          { id: 'USER_MERKLE_001', email: 'user1@test.com' },
          { id: 'USER_MERKLE_002', email: 'user2@test.com' },
        ],
      });

      // Create referral link
      await prisma.referralLink.create({
        data: {
          referrerId: 'USER_MERKLE_001',
          refereeId: 'USER_MERKLE_002',
          level: 1,
        },
      });

      // Process trades to create claimable balances
      await prisma.trade.create({
        data: {
          id: 'trade_merkle_001',
          userId: 'USER_MERKLE_002',
          feeAmount: 100,
          chain: 'EVM',
        },
      });

      await prisma.commissionLedgerEntry.createMany({
        data: [
          {
            beneficiaryId: 'USER_MERKLE_002',
            sourceTradeId: 'trade_merkle_001',
            level: 0,
            rate: 0.1,
            amount: 10,
            token: 'XP',
            destination: 'claimable',
          },
          {
            beneficiaryId: 'USER_MERKLE_001',
            sourceTradeId: 'trade_merkle_001',
            level: 1,
            rate: 0.3,
            amount: 30,
            token: 'XP',
            destination: 'claimable',
          },
        ],
      });
    });

    it('should generate merkle root for EVM chain', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/merkle/generate/EVM/XP')
        .expect(201);

      expect(response.body).toHaveProperty('chain', 'EVM');
      expect(response.body).toHaveProperty('token', 'XP');
      expect(response.body).toHaveProperty('root');
      expect(response.body.root).toMatch(/^0x[a-f0-9]{64}$/);
      expect(response.body).toHaveProperty('version', 1);
      expect(response.body).toHaveProperty('leafCount', 2);
    });

    it('should generate merkle root for SVM chain', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/merkle/generate/SVM/XP')
        .expect(201);

      expect(response.body).toHaveProperty('chain', 'SVM');
      expect(response.body).toHaveProperty('token', 'XP');
      expect(response.body).toHaveProperty('root');
      expect(response.body.root).toMatch(/^0x[a-f0-9]{64}$/);
      expect(response.body).toHaveProperty('version', 1);
    });

    it('should increment version for each new root', async () => {
      const res1 = await request(app.getHttpServer())
        .post('/api/merkle/generate/EVM/XP')
        .expect(201);

      const res2 = await request(app.getHttpServer())
        .post('/api/merkle/generate/EVM/XP')
        .expect(201);

      expect(res2.body.version).toBe(res1.body.version + 1);
    });

    it('should include claimable balances only in merkle root', async () => {
      // Add treasury entry (should not be included)
      await prisma.commissionLedgerEntry.create({
        data: {
          beneficiaryId: 'NIKA_TREASURY',
          sourceTradeId: 'trade_merkle_001',
          level: -1,
          rate: 0.55,
          amount: 55,
          token: 'XP',
          destination: 'treasury',
        },
      });

      const response = await request(app.getHttpServer())
        .post('/api/merkle/generate/EVM/XP')
        .expect(201);

      // Should only include claimable entries (2 users), not treasury
      expect(response.body.leafCount).toBe(2);
    });
  });

  describe('Merkle Proof Generation', () => {
    beforeEach(async () => {
      await prisma.user.create({
        data: { id: 'USER_PROOF_001', email: 'user1@test.com' },
      });

      await prisma.trade.create({
        data: {
          id: 'trade_proof_001',
          userId: 'USER_PROOF_001',
          feeAmount: 100,
          chain: 'EVM',
        },
      });

      await prisma.commissionLedgerEntry.create({
        data: {
          beneficiaryId: 'USER_PROOF_001',
          sourceTradeId: 'trade_proof_001',
          level: 0,
          rate: 0.1,
          amount: 10,
          token: 'XP',
          destination: 'claimable',
        },
      });

      // Generate merkle root first
      await request(app.getHttpServer())
        .post('/api/merkle/generate/EVM/XP')
        .expect(201);
    });

    it('should generate proof for user with claimable balance', async () => {
      const sessionToken = await createSessionCookie('USER_PROOF_001');

      const response = await request(app.getHttpServer())
        .get('/api/merkle/proof/EVM/XP')
        .set('Cookie', `session=${sessionToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('beneficiaryId', 'USER_PROOF_001');
      expect(response.body).toHaveProperty('token', 'XP');
      expect(response.body).toHaveProperty('amount', 10);
      expect(response.body).toHaveProperty('proof');
      expect(Array.isArray(response.body.proof)).toBe(true);
      expect(response.body).toHaveProperty('leaf');
      expect(response.body).toHaveProperty('root');
      expect(response.body).toHaveProperty('verified', true);
    });

    it('should return error for user with no claimable balance', async () => {
      const sessionToken = await createSessionCookie('USER_NONE');

      const response = await request(app.getHttpServer())
        .get('/api/merkle/proof/EVM/XP')
        .set('Cookie', `session=${sessionToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('amount', 0);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Claim Flow (Simulated XP)', () => {
    beforeEach(async () => {
      // Setup: create user with claimable balance
      await prisma.user.create({
        data: { id: 'USER_CLAIM_001', email: 'user1@test.com' },
      });

      await prisma.trade.create({
        data: {
          id: 'trade_claim_001',
          userId: 'USER_CLAIM_001',
          feeAmount: 100,
          chain: 'EVM',
        },
      });

      await prisma.commissionLedgerEntry.create({
        data: {
          beneficiaryId: 'USER_CLAIM_001',
          sourceTradeId: 'trade_claim_001',
          level: 0,
          rate: 0.1,
          amount: 10,
          token: 'XP',
          destination: 'claimable',
        },
      });

      // Generate merkle root
      await request(app.getHttpServer())
        .post('/api/merkle/generate/EVM/XP')
        .expect(201);
    });

    it('should claim XP successfully (simulated)', async () => {
      const sessionToken = await createSessionCookie('USER_CLAIM_001');

      const response = await request(app.getHttpServer())
        .post('/api/merkle/claim/EVM/XP')
        .set('Cookie', `session=${sessionToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('claimId');
      
      // Verify claim was recorded
      const claim = await prisma.claimRecord.findUnique({
        where: { id: response.body.claimId },
      });

      expect(claim).toBeDefined();
      expect(claim!.userId).toBe('USER_CLAIM_001');
      expect(claim!.chain).toBe('EVM');
      expect(claim!.token).toBe('XP');
      expect(Number(claim!.amount)).toBe(10);
    });

    it('should prevent duplicate claims for same merkle version', async () => {
      const sessionToken = await createSessionCookie('USER_CLAIM_001');

      // First claim
      await request(app.getHttpServer())
        .post('/api/merkle/claim/EVM/XP')
        .set('Cookie', `session=${sessionToken}`)
        .expect(201);

      // Second claim (should fail)
      const response = await request(app.getHttpServer())
        .post('/api/merkle/claim/EVM/XP')
        .set('Cookie', `session=${sessionToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Already claimed');
    });

    it('should allow claim after new merkle root is generated', async () => {
      const sessionToken = await createSessionCookie('USER_CLAIM_001');

      // First claim
      await request(app.getHttpServer())
        .post('/api/merkle/claim/EVM/XP')
        .set('Cookie', `session=${sessionToken}`)
        .expect(201);

      // Generate new root
      await request(app.getHttpServer())
        .post('/api/merkle/generate/EVM/XP')
        .expect(201);

      // Should be able to claim again (new version)
      const response = await request(app.getHttpServer())
        .post('/api/merkle/claim/EVM/XP')
        .set('Cookie', `session=${sessionToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('Contract Status Checks', () => {
    beforeEach(async () => {
      // Setup contract address env var
      process.env.EVM_XP_CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890';
      
      // Generate merkle root
      await request(app.getHttpServer())
        .post('/api/merkle/generate/EVM/XP')
        .expect(201);
    });

    it('should check contract status when initialized', async () => {
      mockEvmService.getMerkleRoot.mockResolvedValue('0xDatabaseRoot123');
      mockEvmService.getMerkleRootVersion.mockResolvedValue(1);

      const response = await request(app.getHttpServer())
        .get('/api/merkle/contract-status/EVM/XP')
        .expect(200);

      expect(response.body).toHaveProperty('chain', 'EVM');
      expect(response.body).toHaveProperty('token', 'XP');
      expect(response.body).toHaveProperty('contractAddress');
      expect(response.body).toHaveProperty('onChainRoot');
      expect(response.body).toHaveProperty('onChainVersion');
      expect(response.body).toHaveProperty('databaseRoot');
      expect(response.body).toHaveProperty('databaseVersion');
      expect(response.body).toHaveProperty('synced');
    });

    it('should return error when contract not initialized', async () => {
      mockEvmService.isInitialized.mockReturnValue(false);

      const response = await request(app.getHttpServer())
        .get('/api/merkle/contract-status/EVM/XP')
        .expect(200);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not initialized');
    });
  });

  describe('On-Chain Merkle Root Updates', () => {
    beforeEach(async () => {
      process.env.EVM_XP_CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890';
      
      // Generate merkle root first
      await request(app.getHttpServer())
        .post('/api/merkle/generate/EVM/XP')
        .expect(201);
    });

    it('should update merkle root on-chain for EVM', async () => {
      mockEvmService.isInitialized.mockReturnValue(true);
      mockEvmService.updateMerkleRoot.mockResolvedValue('0xMockTxHash123');

      const response = await request(app.getHttpServer())
        .post('/api/merkle/update-on-chain/EVM/XP')
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('txHash', '0xMockTxHash123');
      expect(response.body).toHaveProperty('chain', 'EVM');
      expect(response.body).toHaveProperty('token', 'XP');
      expect(response.body).toHaveProperty('root');
      
      // Verify updateMerkleRoot was called
      expect(mockEvmService.updateMerkleRoot).toHaveBeenCalledTimes(1);
      expect(mockEvmService.updateMerkleRoot).toHaveBeenCalledWith(
        '0x1234567890123456789012345678901234567890',
        expect.stringMatching(/^0x[a-f0-9]{64}$/)
      );
    });

    it('should update merkle root on-chain for SVM', async () => {
      process.env.SVM_XP_CONTRACT_ADDRESS = 'MockSvmAddress123';
      
      await request(app.getHttpServer())
        .post('/api/merkle/generate/SVM/XP')
        .expect(201);

      mockSvmService.isInitialized.mockReturnValue(true);
      mockSvmService.updateMerkleRoot.mockResolvedValue('MockSvmTxHash123');

      const response = await request(app.getHttpServer())
        .post('/api/merkle/update-on-chain/SVM/XP')
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('txHash', 'MockSvmTxHash123');
      expect(mockSvmService.updateMerkleRoot).toHaveBeenCalledTimes(1);
    });

    it('should return error when blockchain service not initialized', async () => {
      mockEvmService.isInitialized.mockReturnValue(false);

      const response = await request(app.getHttpServer())
        .post('/api/merkle/update-on-chain/EVM/XP')
        .expect(201);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not initialized');
    });
  });

  describe('Treasury Transfer', () => {
    beforeEach(async () => {
      await prisma.user.create({
        data: { id: 'USER_TREASURY_TRANSFER', email: 'user@test.com' },
      });

      // Create treasury account with balance
      await prisma.treasuryAccount.create({
        data: {
          chain: 'EVM',
          token: 'XP',
          address: '0xTreasuryAddress',
          balance: 100,
          claimed: 0,
        },
      });
    });

    it('should transfer treasury funds (simulated)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/merkle/transfer-treasury/EVM/XP')
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('txHash');
      expect(response.body.txHash).toContain('simulated');

      // Verify claimed amount was updated
      const treasury = await prisma.treasuryAccount.findFirst({
        where: { chain: 'EVM', token: 'XP' },
      });

      expect(treasury).toBeDefined();
      expect(Number(treasury!.claimed)).toBe(100);
    });

    it('should return error when no treasury funds to transfer', async () => {
      // Set claimed to balance
      await prisma.treasuryAccount.updateMany({
        where: { chain: 'EVM', token: 'XP' },
        data: { claimed: 100 },
      });

      const response = await request(app.getHttpServer())
        .post('/api/merkle/transfer-treasury/EVM/XP')
        .expect(201);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('No treasury funds');
    });
  });

  describe('End-to-End Flow', () => {
    it('should complete full flow: trade → treasury → merkle → claim', async () => {
      // 1. Create users
      await prisma.user.createMany({
        data: [
          { id: 'USER_FLOW_001', email: 'user1@test.com' },
          { id: 'USER_FLOW_002', email: 'user2@test.com' },
        ],
      });

      // 2. Create referral link
      await prisma.referralLink.create({
        data: {
          referrerId: 'USER_FLOW_001',
          refereeId: 'USER_FLOW_002',
          level: 1,
        },
      });

      // 3. Process trade
      const tradeRes = await request(app.getHttpServer())
        .post('/api/trades/mock')
        .set('x-user-id', 'USER_FLOW_002')
        .send({
          tradeId: 'trade_flow_001',
          userId: 'USER_FLOW_002',
          feeAmount: 100,
          token: 'XP',
          chain: 'EVM',
        })
        .expect(201);

      expect(tradeRes.body.ok).toBe(true);

      // 4. Verify treasury balance tracked
      const treasury = await prisma.treasuryAccount.findFirst({
        where: { chain: 'EVM', token: 'XP' },
      });
      expect(treasury).toBeDefined();
      expect(Number(treasury!.balance)).toBeGreaterThan(0);

      // 5. Generate merkle root
      const rootRes = await request(app.getHttpServer())
        .post('/api/merkle/generate/EVM/XP')
        .expect(201);

      expect(rootRes.body).toHaveProperty('root');
      expect(rootRes.body.version).toBe(1);

      // 6. Get proof
      const proofRes = await request(app.getHttpServer())
        .get('/api/merkle/proof/EVM/XP')
        .set('x-user-id', 'USER_FLOW_002')
        .expect(200);

      expect(proofRes.body).toHaveProperty('proof');
      expect(proofRes.body.verified).toBe(true);

      // 7. Claim XP
      const sessionToken = await createSessionCookie('USER_FLOW_002');
      const claimRes = await request(app.getHttpServer())
        .post('/api/merkle/claim/EVM/XP')
        .set('Cookie', `session=${sessionToken}`)
        .expect(201);

      expect(claimRes.body).toHaveProperty('success', true);
      expect(claimRes.body).toHaveProperty('claimId');

      // 8. Verify claim recorded
      const claim = await prisma.claimRecord.findUnique({
        where: { id: claimRes.body.claimId },
      });
      expect(claim).toBeDefined();
      expect(claim!.userId).toBe('USER_FLOW_002');
    });
  });
});

