import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../src/infrastructure/prisma/services/prisma.service';
import { MerkleTreeService } from '../../src/infrastructure/services/merkle-tree.service';
import { ClaimService } from '../../src/infrastructure/services/claim.service';
import { TradesAppService } from '../../src/application/trades.app.service';
import { ReferralAppService } from '../../src/application/referral.app.service';
import { CommissionLedgerEntry, ClaimRecord, Trade, User } from '@prisma/client';

/**
 * Unit Tests for XP Claim Flow
 * 
 * Tests cover:
 * 1. Double-spend prevention (critical bug we caught)
 * 2. XP tracking: earned, claimed, unclaimed
 * 3. Multi-chain claims (EVM + SVM)
 * 4. Trade generation and XP accumulation
 * 5. Merkle root generation and claims
 */
describe('XP Claim Flow (Unit Tests)', () => {
  let prisma: PrismaService;
  let merkleService: MerkleTreeService;
  let claimService: ClaimService;
  let tradesService: TradesAppService;
  let referralService: ReferralAppService;
  let module: TestingModule;

  // Test users
  const USER_A = 'test-user-a';
  const USER_B = 'test-user-b'; // Referee of A

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        PrismaService,
        MerkleTreeService,
        ClaimService,
        TradesAppService,
        ReferralAppService,
        // Mock other dependencies as needed
      ],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    merkleService = module.get<MerkleTreeService>(MerkleTreeService);
    claimService = module.get<ClaimService>(ClaimService);
    tradesService = module.get<TradesAppService>(TradesAppService);
    referralService = module.get<ReferralAppService>(ReferralAppService);

    // Clean up test data
    await prisma.claimRecord.deleteMany({ where: { userId: { in: [USER_A, USER_B] } } });
    await prisma.commissionLedgerEntry.deleteMany({ where: { beneficiaryId: { in: [USER_A, USER_B] } } });
    await prisma.trade.deleteMany({ where: { userId: { in: [USER_A, USER_B] } } });
    await prisma.referralLink.deleteMany({ where: { OR: [{ referrerId: USER_A }, { refereeId: USER_B }] } });
    await prisma.user.deleteMany({ where: { id: { in: [USER_A, USER_B] } } });
  });

  afterEach(async () => {
    // Clean up
    await prisma.claimRecord.deleteMany({ where: { userId: { in: [USER_A, USER_B] } } });
    await prisma.commissionLedgerEntry.deleteMany({ where: { beneficiaryId: { in: [USER_A, USER_B] } } });
    await prisma.trade.deleteMany({ where: { userId: { in: [USER_A, USER_B] } } });
    await prisma.referralLink.deleteMany({ where: { OR: [{ referrerId: USER_A }, { refereeId: USER_B }] } });
    await prisma.user.deleteMany({ where: { id: { in: [USER_A, USER_B] } } });
    await module.close();
  });

  describe('Double-Spend Prevention', () => {
    it('should prevent claiming more XP than earned', async () => {
      // Setup: User A has 100 XP earned
      await prisma.user.create({ data: { id: USER_A, email: `${USER_A}@test.com` } });
      await prisma.trade.create({
        data: { id: 'TRADE_1', userId: USER_A, feeAmount: 100, chain: 'EVM' },
      });
      await prisma.commissionLedgerEntry.create({
        data: {
          beneficiaryId: USER_A,
          sourceTradeId: 'TRADE_1',
          level: 0,
          rate: 1.0,
          amount: 100,
          token: 'XP',
          destination: 'claimable',
        },
      });

      // Generate Merkle root (version 1)
      await merkleService.generateAndStoreRoot('EVM', 'XP');

      // First claim: Should succeed for 100 XP
      const claim1 = await claimService.claim(USER_A, 'EVM', 'XP');
      expect(claim1.success).toBe(true);

      // Check dashboard: Unclaimed should be 0
      const dashboard1 = await referralService.getDashboard(USER_A);
      expect(dashboard1.totalEarned).toBe(100);
      expect(dashboard1.totalClaimed).toBe(100);
      expect(dashboard1.unclaimedXP).toBe(0);

      // Generate another Merkle root (version 2) - same data
      await merkleService.generateAndStoreRoot('EVM', 'XP');

      // Second claim attempt: Should fail (already claimed all XP)
      const claim2 = await claimService.claim(USER_A, 'EVM', 'XP');
      expect(claim2.success).toBe(false);
      expect(claim2.error).toContain('No claimable balance');

      // Dashboard should remain unchanged
      const dashboard2 = await referralService.getDashboard(USER_A);
      expect(dashboard2.totalEarned).toBe(100);
      expect(dashboard2.totalClaimed).toBe(100);
      expect(dashboard2.unclaimedXP).toBe(0);
    });

    it('should correctly track unclaimed XP after partial claims', async () => {
      // Setup: User A earns 100 XP, then claims, then earns 50 more
      await prisma.user.create({ data: { id: USER_A, email: `${USER_A}@test.com` } });

      // First trade: 100 XP
      await prisma.trade.create({
        data: { id: 'TRADE_1', userId: USER_A, feeAmount: 100, chain: 'EVM' },
      });
      await prisma.commissionLedgerEntry.create({
        data: {
          beneficiaryId: USER_A,
          sourceTradeId: 'TRADE_1',
          level: 0,
          rate: 1.0,
          amount: 100,
          token: 'XP',
          destination: 'claimable',
        },
      });

      // Generate root and claim 100 XP
      await merkleService.generateAndStoreRoot('EVM', 'XP');
      const claim1 = await claimService.claim(USER_A, 'EVM', 'XP');
      expect(claim1.success).toBe(true);

      // Dashboard: Earned=100, Claimed=100, Unclaimed=0
      const dashboard1 = await referralService.getDashboard(USER_A);
      expect(dashboard1.unclaimedXP).toBe(0);

      // Second trade: 50 XP more
      await prisma.trade.create({
        data: { id: 'TRADE_2', userId: USER_A, feeAmount: 50, chain: 'EVM' },
      });
      await prisma.commissionLedgerEntry.create({
        data: {
          beneficiaryId: USER_A,
          sourceTradeId: 'TRADE_2',
          level: 0,
          rate: 1.0,
          amount: 50,
          token: 'XP',
          destination: 'claimable',
        },
      });

      // Dashboard: Earned=150, Claimed=100, Unclaimed=50
      const dashboard2 = await referralService.getDashboard(USER_A);
      expect(dashboard2.totalEarned).toBe(150);
      expect(dashboard2.totalClaimed).toBe(100);
      expect(dashboard2.unclaimedXP).toBe(50);

      // Generate new root and claim the remaining 50 XP
      await merkleService.generateAndStoreRoot('EVM', 'XP');
      const claim2 = await claimService.claim(USER_A, 'EVM', 'XP');
      expect(claim2.success).toBe(true);

      // Dashboard: Earned=150, Claimed=150, Unclaimed=0
      const dashboard3 = await referralService.getDashboard(USER_A);
      expect(dashboard3.totalEarned).toBe(150);
      expect(dashboard3.totalClaimed).toBe(150);
      expect(dashboard3.unclaimedXP).toBe(0);
    });
  });

  describe('Multi-Chain XP Tracking', () => {
    it('should track EVM and SVM XP separately', async () => {
      await prisma.user.create({ data: { id: USER_A, email: `${USER_A}@test.com` } });

      // EVM trade: 100 XP
      await prisma.trade.create({
        data: { id: 'TRADE_EVM', userId: USER_A, feeAmount: 100, chain: 'EVM' },
      });
      await prisma.commissionLedgerEntry.create({
        data: {
          beneficiaryId: USER_A,
          sourceTradeId: 'TRADE_EVM',
          level: 0,
          rate: 1.0,
          amount: 100,
          token: 'XP',
          destination: 'claimable',
        },
      });

      // SVM trade: 50 XP
      await prisma.trade.create({
        data: { id: 'TRADE_SVM', userId: USER_A, feeAmount: 50, chain: 'SVM' },
      });
      await prisma.commissionLedgerEntry.create({
        data: {
          beneficiaryId: USER_A,
          sourceTradeId: 'TRADE_SVM',
          level: 0,
          rate: 1.0,
          amount: 50,
          token: 'XP',
          destination: 'claimable',
        },
      });

      // Total dashboard shows combined XP
      const dashboard = await referralService.getDashboard(USER_A);
      expect(dashboard.totalEarned).toBe(150); // 100 EVM + 50 SVM

      // Generate roots for both chains
      await merkleService.generateAndStoreRoot('EVM', 'XP');
      await merkleService.generateAndStoreRoot('SVM', 'XP');

      // Claim EVM only
      const evmClaim = await claimService.claim(USER_A, 'EVM', 'XP');
      expect(evmClaim.success).toBe(true);

      // Dashboard: Earned=150, Claimed=100 (EVM only), Unclaimed=50 (SVM)
      const dashboard2 = await referralService.getDashboard(USER_A);
      expect(dashboard2.totalEarned).toBe(150);
      expect(dashboard2.totalClaimed).toBe(100);
      expect(dashboard2.unclaimedXP).toBe(50);

      // Claim SVM
      const svmClaim = await claimService.claim(USER_A, 'SVM', 'XP');
      expect(svmClaim.success).toBe(true);

      // Dashboard: All claimed
      const dashboard3 = await referralService.getDashboard(USER_A);
      expect(dashboard3.totalEarned).toBe(150);
      expect(dashboard3.totalClaimed).toBe(150);
      expect(dashboard3.unclaimedXP).toBe(0);
    });

    it('should allow claiming from same chain multiple times as XP accumulates', async () => {
      await prisma.user.create({ data: { id: USER_A, email: `${USER_A}@test.com` } });

      // First EVM trade
      await prisma.trade.create({
        data: { id: 'TRADE_EVM_1', userId: USER_A, feeAmount: 100, chain: 'EVM' },
      });
      await prisma.commissionLedgerEntry.create({
        data: {
          beneficiaryId: USER_A,
          sourceTradeId: 'TRADE_EVM_1',
          level: 0,
          rate: 1.0,
          amount: 100,
          token: 'XP',
          destination: 'claimable',
        },
      });

      // Claim first time
      await merkleService.generateAndStoreRoot('EVM', 'XP');
      const claim1 = await claimService.claim(USER_A, 'EVM', 'XP');
      expect(claim1.success).toBe(true);

      const dashboard1 = await referralService.getDashboard(USER_A);
      expect(dashboard1.unclaimedXP).toBe(0);

      // Second EVM trade (user continues trading)
      await prisma.trade.create({
        data: { id: 'TRADE_EVM_2', userId: USER_A, feeAmount: 75, chain: 'EVM' },
      });
      await prisma.commissionLedgerEntry.create({
        data: {
          beneficiaryId: USER_A,
          sourceTradeId: 'TRADE_EVM_2',
          level: 0,
          rate: 1.0,
          amount: 75,
          token: 'XP',
          destination: 'claimable',
        },
      });

      // Should now have unclaimed XP
      const dashboard2 = await referralService.getDashboard(USER_A);
      expect(dashboard2.totalEarned).toBe(175);
      expect(dashboard2.totalClaimed).toBe(100);
      expect(dashboard2.unclaimedXP).toBe(75);

      // Claim second time (new merkle root version)
      await merkleService.generateAndStoreRoot('EVM', 'XP');
      const claim2 = await claimService.claim(USER_A, 'EVM', 'XP');
      expect(claim2.success).toBe(true);

      // All should be claimed
      const dashboard3 = await referralService.getDashboard(USER_A);
      expect(dashboard3.totalEarned).toBe(175);
      expect(dashboard3.totalClaimed).toBe(175);
      expect(dashboard3.unclaimedXP).toBe(0);
    });
  });

  describe('Trade Generation and XP Accumulation', () => {
    it('should correctly accumulate XP from referral trades', async () => {
      // Setup: User A refers User B
      await prisma.user.create({ data: { id: USER_A, email: `${USER_A}@test.com`, referralCode: 'REF_A' } });
      await prisma.user.create({ data: { id: USER_B, email: `${USER_B}@test.com` } });
      await prisma.referralLink.create({
        data: { referrerId: USER_A, refereeId: USER_B, level: 1 },
      });

      // User B makes a trade (fee: 100)
      await prisma.trade.create({
        data: { id: 'TRADE_B_1', userId: USER_B, feeAmount: 100, chain: 'EVM' },
      });

      // User A should earn commission (30% of 100 = 30 XP)
      await prisma.commissionLedgerEntry.create({
        data: {
          beneficiaryId: USER_A,
          sourceTradeId: 'TRADE_B_1',
          level: 1,
          rate: 0.30,
          amount: 30,
          token: 'XP',
          destination: 'claimable',
        },
      });

      // Check User A's dashboard
      const dashboard1 = await referralService.getDashboard(USER_A);
      expect(dashboard1.totalEarned).toBe(30);
      expect(dashboard1.unclaimedXP).toBe(30);

      // User B makes another trade (fee: 200)
      await prisma.trade.create({
        data: { id: 'TRADE_B_2', userId: USER_B, feeAmount: 200, chain: 'EVM' },
      });
      await prisma.commissionLedgerEntry.create({
        data: {
          beneficiaryId: USER_A,
          sourceTradeId: 'TRADE_B_2',
          level: 1,
          rate: 0.30,
          amount: 60,
          token: 'XP',
          destination: 'claimable',
        },
      });

      // User A should now have 90 XP total
      const dashboard2 = await referralService.getDashboard(USER_A);
      expect(dashboard2.totalEarned).toBe(90); // 30 + 60
      expect(dashboard2.unclaimedXP).toBe(90); // None claimed yet
    });

    it('should continue accumulating XP after partial claims', async () => {
      await prisma.user.create({ data: { id: USER_A, email: `${USER_A}@test.com`, referralCode: 'REF_A' } });
      await prisma.user.create({ data: { id: USER_B, email: `${USER_B}@test.com` } });
      await prisma.referralLink.create({
        data: { referrerId: USER_A, refereeId: USER_B, level: 1 },
      });

      // Trade 1: User B trades, A earns 30 XP
      await prisma.trade.create({
        data: { id: 'TRADE_1', userId: USER_B, feeAmount: 100, chain: 'EVM' },
      });
      await prisma.commissionLedgerEntry.create({
        data: {
          beneficiaryId: USER_A,
          sourceTradeId: 'TRADE_1',
          level: 1,
          rate: 0.30,
          amount: 30,
          token: 'XP',
          destination: 'claimable',
        },
      });

      // Claim
      await merkleService.generateAndStoreRoot('EVM', 'XP');
      await claimService.claim(USER_A, 'EVM', 'XP');

      const dashboard1 = await referralService.getDashboard(USER_A);
      expect(dashboard1.totalEarned).toBe(30);
      expect(dashboard1.totalClaimed).toBe(30);
      expect(dashboard1.unclaimedXP).toBe(0);

      // Trade 2: User B trades again, A earns 60 more XP
      await prisma.trade.create({
        data: { id: 'TRADE_2', userId: USER_B, feeAmount: 200, chain: 'EVM' },
      });
      await prisma.commissionLedgerEntry.create({
        data: {
          beneficiaryId: USER_A,
          sourceTradeId: 'TRADE_2',
          level: 1,
          rate: 0.30,
          amount: 60,
          token: 'XP',
          destination: 'claimable',
        },
      });

      // Should show new unclaimed XP
      const dashboard2 = await referralService.getDashboard(USER_A);
      expect(dashboard2.totalEarned).toBe(90); // 30 + 60
      expect(dashboard2.totalClaimed).toBe(30); // Only first claim
      expect(dashboard2.unclaimedXP).toBe(60); // New XP from Trade 2

      // This is the critical assertion: Users can continue earning and claiming
      expect(dashboard2.unclaimedXP).toBeGreaterThan(0);
    });
  });

  describe('Merkle Root and Claim Lifecycle', () => {
    it('should prevent claiming same merkle version twice', async () => {
      await prisma.user.create({ data: { id: USER_A, email: `${USER_A}@test.com` } });
      await prisma.trade.create({
        data: { id: 'TRADE_1', userId: USER_A, feeAmount: 100, chain: 'EVM' },
      });
      await prisma.commissionLedgerEntry.create({
        data: {
          beneficiaryId: USER_A,
          sourceTradeId: 'TRADE_1',
          level: 0,
          rate: 1.0,
          amount: 100,
          token: 'XP',
          destination: 'claimable',
        },
      });

      // Generate merkle root (version 1)
      const root1 = await merkleService.generateAndStoreRoot('EVM', 'XP');

      // First claim for version 1
      const claim1 = await claimService.claim(USER_A, 'EVM', 'XP');
      expect(claim1.success).toBe(true);

      // Second claim attempt for same version should fail
      const claim2 = await claimService.claim(USER_A, 'EVM', 'XP');
      expect(claim2.success).toBe(false);
      expect(claim2.error).toContain(`Already claimed for merkle root version ${root1.version}`);
    });

    it('should allow claiming after new merkle root with new XP', async () => {
      await prisma.user.create({ data: { id: USER_A, email: `${USER_A}@test.com` } });
      
      // First trade and claim
      await prisma.trade.create({
        data: { id: 'TRADE_1', userId: USER_A, feeAmount: 100, chain: 'EVM' },
      });
      await prisma.commissionLedgerEntry.create({
        data: {
          beneficiaryId: USER_A,
          sourceTradeId: 'TRADE_1',
          level: 0,
          rate: 1.0,
          amount: 100,
          token: 'XP',
          destination: 'claimable',
        },
      });
      const root1 = await merkleService.generateAndStoreRoot('EVM', 'XP');
      await claimService.claim(USER_A, 'EVM', 'XP');

      // New trade adds more XP
      await prisma.trade.create({
        data: { id: 'TRADE_2', userId: USER_A, feeAmount: 50, chain: 'EVM' },
      });
      await prisma.commissionLedgerEntry.create({
        data: {
          beneficiaryId: USER_A,
          sourceTradeId: 'TRADE_2',
          level: 0,
          rate: 1.0,
          amount: 50,
          token: 'XP',
          destination: 'claimable',
        },
      });

      // New merkle root (version 2)
      const root2 = await merkleService.generateAndStoreRoot('EVM', 'XP');
      expect(root2.version).toBeGreaterThan(root1.version);

      // Claim for version 2 should succeed
      const claim2 = await claimService.claim(USER_A, 'EVM', 'XP');
      expect(claim2.success).toBe(true);

      // Total claimed should be 150 (100 + 50)
      const dashboard = await referralService.getDashboard(USER_A);
      expect(dashboard.totalClaimed).toBe(150);
    });
  });
});



