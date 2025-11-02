import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../src/infrastructure/prisma/services/prisma.service';
import { PrismaUserRepository } from '../src/infrastructure/prisma/repositories/user.repository.prisma';
import { PrismaReferralRepository } from '../src/infrastructure/prisma/repositories/referral.repository.prisma';
import { PrismaLedgerRepository } from '../src/infrastructure/prisma/repositories/ledger.repository.prisma';
import { PrismaTradesRepository } from '../src/infrastructure/prisma/repositories/trade.repository.prisma';
import { PrismaIdempotencyStore } from '../src/infrastructure/prisma/idempotency.store.prisma';

describe('Repository Integration Tests', () => {
  let prisma: PrismaService;
  let userRepo: PrismaUserRepository;
  let referralRepo: PrismaReferralRepository;
  let ledgerRepo: PrismaLedgerRepository;
  let tradesRepo: PrismaTradesRepository;
  let idempotencyStore: PrismaIdempotencyStore;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        PrismaUserRepository,
        PrismaReferralRepository,
        PrismaLedgerRepository,
        PrismaTradesRepository,
        PrismaIdempotencyStore,
      ],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    userRepo = module.get<PrismaUserRepository>(PrismaUserRepository);
    referralRepo = module.get<PrismaReferralRepository>(PrismaReferralRepository);
    ledgerRepo = module.get<PrismaLedgerRepository>(PrismaLedgerRepository);
    tradesRepo = module.get<PrismaTradesRepository>(PrismaTradesRepository);
    idempotencyStore = module.get<PrismaIdempotencyStore>(PrismaIdempotencyStore);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.commissionLedgerEntry.deleteMany();
    await prisma.trade.deleteMany();
    await prisma.referralLink.deleteMany();
    await prisma.idempotencyKey.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('PrismaUserRepository', () => {
    it('should create a new user when generating referral code for non-existent user', async () => {
      const code = await userRepo.createOrGetReferralCode('TEST_USER_001');
      
      expect(code).toMatch(/^ref_[a-z0-9]+$/);
      
      // Verify user was actually created in database
      const user = await prisma.user.findUnique({ where: { id: 'TEST_USER_001' } });
      expect(user).toBeDefined();
      expect(user?.referralCode).toBe(code);
      expect(user?.email).toBe('TEST_USER_001@example.com');
    });

    it('should return existing referral code for existing user', async () => {
      const code1 = await userRepo.createOrGetReferralCode('TEST_USER_002');
      const code2 = await userRepo.createOrGetReferralCode('TEST_USER_002');
      
      expect(code1).toBe(code2);
    });

    it('should find user by referral code', async () => {
      const code = await userRepo.createOrGetReferralCode('TEST_USER_003');
      
      const user = await userRepo.findByReferralCode(code);
      
      expect(user).toBeDefined();
      expect(user?.id).toBe('TEST_USER_003');
    });

    it('should return null for non-existent referral code', async () => {
      const user = await userRepo.findByReferralCode('ref_nonexistent');
      expect(user).toBeNull();
    });

    it('should find user by id', async () => {
      await userRepo.createOrGetReferralCode('TEST_USER_004');
      
      const user = await userRepo.findById('TEST_USER_004');
      
      expect(user).toBeDefined();
      expect(user?.id).toBe('TEST_USER_004');
    });

    it('should return null for non-existent user id', async () => {
      const user = await userRepo.findById('NON_EXISTENT');
      expect(user).toBeNull();
    });
  });

  describe('PrismaReferralRepository', () => {
    it('should create a referral link', async () => {
      await userRepo.createOrGetReferralCode('REFERRER_001');
      await userRepo.createOrGetReferralCode('REFEREE_001');
      
      await referralRepo.createLink('REFERRER_001', 'REFEREE_001', 1);
      
      const link = await prisma.referralLink.findUnique({
        where: { refereeId: 'REFEREE_001' },
      });
      
      expect(link).toBeDefined();
      expect(link?.referrerId).toBe('REFERRER_001');
      expect(link?.level).toBe(1);
    });

    it('should check if user has referrer', async () => {
      await userRepo.createOrGetReferralCode('REFERRER_002');
      await userRepo.createOrGetReferralCode('REFEREE_002');
      
      expect(await referralRepo.hasReferrer('REFEREE_002')).toBe(false);
      
      await referralRepo.createLink('REFERRER_002', 'REFEREE_002', 1);
      
      expect(await referralRepo.hasReferrer('REFEREE_002')).toBe(true);
    });

    it('should get direct referees', async () => {
      await userRepo.createOrGetReferralCode('REFERRER_003');
      await userRepo.createOrGetReferralCode('REFEREE_003A');
      await userRepo.createOrGetReferralCode('REFEREE_003B');
      
      await referralRepo.createLink('REFERRER_003', 'REFEREE_003A', 1);
      await referralRepo.createLink('REFERRER_003', 'REFEREE_003B', 1);
      
      const referees = await referralRepo.getDirectReferees('REFERRER_003');
      
      expect(referees).toHaveLength(2);
      expect(referees).toContain('REFEREE_003A');
      expect(referees).toContain('REFEREE_003B');
    });

    it('should get ancestors up to max levels', async () => {
      await userRepo.createOrGetReferralCode('USER_L0');
      await userRepo.createOrGetReferralCode('USER_L1');
      await userRepo.createOrGetReferralCode('USER_L2');
      await userRepo.createOrGetReferralCode('USER_L3');
      
      await referralRepo.createLink('USER_L0', 'USER_L1', 1);
      await referralRepo.createLink('USER_L1', 'USER_L2', 2);
      await referralRepo.createLink('USER_L2', 'USER_L3', 3);
      
      const ancestors = await referralRepo.getAncestors('USER_L3', 3);
      
      expect(ancestors).toEqual(['USER_L2', 'USER_L1', 'USER_L0']);
    });

    it('should limit ancestors to maxLevels', async () => {
      await userRepo.createOrGetReferralCode('USER_A');
      await userRepo.createOrGetReferralCode('USER_B');
      await userRepo.createOrGetReferralCode('USER_C');
      
      await referralRepo.createLink('USER_A', 'USER_B', 1);
      await referralRepo.createLink('USER_B', 'USER_C', 2);
      
      const ancestors = await referralRepo.getAncestors('USER_C', 1);
      
      expect(ancestors).toHaveLength(1);
      expect(ancestors[0]).toBe('USER_B');
    });
  });

  describe('PrismaTradesRepository', () => {
    it('should create a trade', async () => {
      await userRepo.createOrGetReferralCode('TRADER_001');
      
      await tradesRepo.createTrade('TRADE_001', 'TRADER_001', 100.50);
      
      const trade = await prisma.trade.findUnique({ where: { id: 'TRADE_001' } });
      
      expect(trade).toBeDefined();
      expect(trade?.userId).toBe('TRADER_001');
      expect(Number(trade?.feeAmount)).toBe(100.50);
    });

    it('should handle decimal precision correctly', async () => {
      await userRepo.createOrGetReferralCode('TRADER_002');
      
      await tradesRepo.createTrade('TRADE_002', 'TRADER_002', 123.456789);
      
      const trade = await prisma.trade.findUnique({ where: { id: 'TRADE_002' } });
      
      expect(Number(trade?.feeAmount)).toBeCloseTo(123.456789, 6);
    });
  });

  describe('PrismaLedgerRepository', () => {
    it('should record ledger entries', async () => {
      await userRepo.createOrGetReferralCode('BENEFICIARY_001');
      
      await ledgerRepo.recordEntries([
        {
          beneficiaryId: 'BENEFICIARY_001',
          sourceTradeId: 'TRADE_L001',
          level: 1,
          rate: 0.30,
          amount: 30,
          token: 'XP',
        },
      ]);
      
      const entries = await prisma.commissionLedgerEntry.findMany({
        where: { beneficiaryId: 'BENEFICIARY_001' },
      });
      
      expect(entries).toHaveLength(1);
      expect(Number(entries[0].amount)).toBe(30);
      expect(Number(entries[0].rate)).toBe(0.30);
    });

    it('should skip duplicate entries with skipDuplicates', async () => {
      await userRepo.createOrGetReferralCode('BENEFICIARY_002');
      
      await ledgerRepo.recordEntries([
        {
          beneficiaryId: 'BENEFICIARY_002',
          sourceTradeId: 'TRADE_L002',
          level: 1,
          rate: 0.30,
          amount: 30,
          token: 'XP',
        },
      ]);
      
      // Try to record the same entry again (same beneficiary, trade, level)
      await ledgerRepo.recordEntries([
        {
          beneficiaryId: 'BENEFICIARY_002',
          sourceTradeId: 'TRADE_L002',
          level: 1,
          rate: 0.30,
          amount: 30,
          token: 'XP',
        },
      ]);
      
      const entries = await prisma.commissionLedgerEntry.findMany({
        where: { beneficiaryId: 'BENEFICIARY_002' },
      });
      
      expect(entries).toHaveLength(1);
    });

    it('should get earnings summary grouped by level', async () => {
      await userRepo.createOrGetReferralCode('BENEFICIARY_003');
      
      await ledgerRepo.recordEntries([
        { beneficiaryId: 'BENEFICIARY_003', sourceTradeId: 'T1', level: 1, rate: 0.30, amount: 30, token: 'XP' },
        { beneficiaryId: 'BENEFICIARY_003', sourceTradeId: 'T2', level: 1, rate: 0.30, amount: 20, token: 'XP' },
        { beneficiaryId: 'BENEFICIARY_003', sourceTradeId: 'T3', level: 2, rate: 0.03, amount: 3, token: 'XP' },
      ]);
      
      const summary = await ledgerRepo.getEarningsSummary('BENEFICIARY_003');
      
      expect(summary.total).toBe(53);
      expect(summary.byLevel[1]).toBe(50);
      expect(summary.byLevel[2]).toBe(3);
    });

    it('should return empty summary for user with no earnings', async () => {
      const summary = await ledgerRepo.getEarningsSummary('NO_EARNINGS_USER');
      
      expect(summary.total).toBe(0);
      expect(Object.keys(summary.byLevel)).toHaveLength(0);
    });
  });

  describe('PrismaIdempotencyStore', () => {
    it('should check if key exists', async () => {
      expect(await idempotencyStore.exists('KEY_001')).toBe(false);
      
      await prisma.idempotencyKey.create({ data: { key: 'KEY_001' } });
      
      expect(await idempotencyStore.exists('KEY_001')).toBe(true);
    });

    it('should set a key', async () => {
      await idempotencyStore.set('KEY_002');
      
      const key = await prisma.idempotencyKey.findUnique({ where: { key: 'KEY_002' } });
      
      expect(key).toBeDefined();
    });

    it('should handle duplicate key silently', async () => {
      await idempotencyStore.set('KEY_003');
      
      // Should not throw error on duplicate
      await expect(idempotencyStore.set('KEY_003')).resolves.not.toThrow();
    });
  });
});

