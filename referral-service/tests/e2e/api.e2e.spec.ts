import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/prisma/services/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('API E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    
    prisma = app.get<PrismaService>(PrismaService);
    
    await app.init();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.commissionLedgerEntry.deleteMany();
    await prisma.trade.deleteMany();
    await prisma.referralLink.deleteMany();
    await prisma.idempotencyKey.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('GET /', () => {
    it('should return Hello World', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect('Hello World!');
    });
  });

  describe('POST /api/referral/generate', () => {
    it('should generate a referral code for new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/referral/generate')
        .set('x-user-id', 'API_USER_001')
        .expect(201);

      expect(response.body).toHaveProperty('code');
      expect(response.body.code).toMatch(/^ref_[a-z0-9]+$/);
    });

    it('should return same code for existing user', async () => {
      const res1 = await request(app.getHttpServer())
        .post('/api/referral/generate')
        .set('x-user-id', 'API_USER_002')
        .expect(201);

      const res2 = await request(app.getHttpServer())
        .post('/api/referral/generate')
        .set('x-user-id', 'API_USER_002')
        .expect(201);

      expect(res1.body.code).toBe(res2.body.code);
    });

    it('should fail without x-user-id header', async () => {
      await request(app.getHttpServer())
        .post('/api/referral/generate')
        .expect(401);
    });
  });

  describe('POST /api/referral/register', () => {
    it('should register user with valid referral code', async () => {
      // Generate code for referrer
      const genRes = await request(app.getHttpServer())
        .post('/api/referral/generate')
        .set('x-user-id', 'API_REFERRER_001')
        .expect(201);

      const code = genRes.body.code;

      // Register referee
      const regRes = await request(app.getHttpServer())
        .post('/api/referral/register')
        .set('x-user-id', 'API_REFEREE_001')
        .send({ code })
        .expect(201);

      expect(regRes.body).toHaveProperty('level');
      expect(regRes.body.level).toBe(1);
    });

    it('should fail with invalid referral code', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/referral/register')
        .set('x-user-id', 'API_REFEREE_002')
        .send({ code: 'ref_invalid' })
        .expect(500);

      expect(response.body).toHaveProperty('message');
    });

    it('should fail without code in body', async () => {
      await request(app.getHttpServer())
        .post('/api/referral/register')
        .set('x-user-id', 'API_REFEREE_003')
        .send({})
        .expect(400);
    });

    it('should register multi-level referrals correctly', async () => {
      // Level 0: Generate code
      const l0Res = await request(app.getHttpServer())
        .post('/api/referral/generate')
        .set('x-user-id', 'API_L0_USER')
        .expect(201);

      // Level 1: Register with L0 code
      await request(app.getHttpServer())
        .post('/api/referral/register')
        .set('x-user-id', 'API_L1_USER')
        .send({ code: l0Res.body.code })
        .expect(201);

      // Level 1: Generate code
      const l1Res = await request(app.getHttpServer())
        .post('/api/referral/generate')
        .set('x-user-id', 'API_L1_USER')
        .expect(201);

      // Level 2: Register with L1 code
      const l2Reg = await request(app.getHttpServer())
        .post('/api/referral/register')
        .set('x-user-id', 'API_L2_USER')
        .send({ code: l1Res.body.code })
        .expect(201);

      expect(l2Reg.body.level).toBe(2);
    });
  });

  describe('GET /api/referral/network', () => {
    it('should return empty network for user with no referrals', async () => {
      // Create user first
      await request(app.getHttpServer())
        .post('/api/referral/generate')
        .set('x-user-id', 'API_NO_NETWORK')
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/referral/network')
        .set('x-user-id', 'API_NO_NETWORK')
        .expect(200);

      expect(response.body).toEqual({
        level1: [],
        level2: [],
        level3: [],
      });
    });

    it('should return complete network tree', async () => {
      // Setup: L0 -> L1 -> L2
      const l0Res = await request(app.getHttpServer())
        .post('/api/referral/generate')
        .set('x-user-id', 'NET_L0')
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/referral/register')
        .set('x-user-id', 'NET_L1')
        .send({ code: l0Res.body.code })
        .expect(201);

      const l1Res = await request(app.getHttpServer())
        .post('/api/referral/generate')
        .set('x-user-id', 'NET_L1')
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/referral/register')
        .set('x-user-id', 'NET_L2')
        .send({ code: l1Res.body.code })
        .expect(201);

      // Get network
      const response = await request(app.getHttpServer())
        .get('/api/referral/network')
        .set('x-user-id', 'NET_L0')
        .expect(200);

      expect(response.body.level1).toContain('NET_L1');
      expect(response.body.level2).toContain('NET_L2');
      expect(response.body.level3).toEqual([]);
    });
  });

  describe('GET /api/referral/earnings', () => {
    it('should return zero earnings for user with no commissions', async () => {
      await request(app.getHttpServer())
        .post('/api/referral/generate')
        .set('x-user-id', 'API_NO_EARNINGS')
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/referral/earnings')
        .set('x-user-id', 'API_NO_EARNINGS')
        .expect(200);

      expect(response.body.total).toBe(0);
      expect(response.body.byLevel).toEqual({});
    });

    it('should calculate earnings from trades correctly', async () => {
      // Setup referral chain
      const l0Res = await request(app.getHttpServer())
        .post('/api/referral/generate')
        .set('x-user-id', 'EARN_L0')
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/referral/register')
        .set('x-user-id', 'EARN_L1')
        .send({ code: l0Res.body.code })
        .expect(201);

      // Execute trade
      await request(app.getHttpServer())
        .post('/api/trades/mock')
        .set('x-user-id', 'EARN_L1')
        .send({
          tradeId: 'EARN_TRADE_001',
          userId: 'EARN_L1',
          feeAmount: 100,
          token: 'XP',
        })
        .expect(201);

      // Check earnings (30% of 100 = 30)
      const response = await request(app.getHttpServer())
        .get('/api/referral/earnings')
        .set('x-user-id', 'EARN_L0')
        .expect(200);

      expect(response.body.total).toBe(30);
      expect(response.body.byLevel['1']).toBe(30);
    });
  });

  describe('POST /api/trades/mock', () => {
    it('should create a trade and distribute commissions', async () => {
      // Setup referral chain
      const l0Res = await request(app.getHttpServer())
        .post('/api/referral/generate')
        .set('x-user-id', 'TRADE_L0')
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/referral/register')
        .set('x-user-id', 'TRADE_L1')
        .send({ code: l0Res.body.code })
        .expect(201);

      // Execute trade
      const response = await request(app.getHttpServer())
        .post('/api/trades/mock')
        .set('x-user-id', 'TRADE_L1')
        .send({
          tradeId: 'MOCK_TRADE_001',
          userId: 'TRADE_L1',
          feeAmount: 200,
          token: 'XP',
        })
        .expect(201);

      expect(response.body).toEqual({ ok: true });

      // Verify commissions were created
      const earnings = await request(app.getHttpServer())
        .get('/api/referral/earnings')
        .set('x-user-id', 'TRADE_L0')
        .expect(200);

      expect(earnings.body.total).toBe(60); // 30% of 200
    });

    it('should validate tradeId length (min 6 chars)', async () => {
      await request(app.getHttpServer())
        .post('/api/trades/mock')
        .set('x-user-id', 'VALID_USER_001')
        .send({
          tradeId: 'short',
          userId: 'VALID_USER_001',
          feeAmount: 100,
        })
        .expect(400);
    });

    it('should validate userId length (min 6 chars)', async () => {
      await request(app.getHttpServer())
        .post('/api/trades/mock')
        .set('x-user-id', 'VALID_USER_002')
        .send({
          tradeId: 'TRADE_ID_001',
          userId: 'short',
          feeAmount: 100,
        })
        .expect(400);
    });

    it('should validate feeAmount is non-negative', async () => {
      await request(app.getHttpServer())
        .post('/api/trades/mock')
        .set('x-user-id', 'VALID_USER_003')
        .send({
          tradeId: 'TRADE_ID_002',
          userId: 'VALID_USER_003',
          feeAmount: -10,
        })
        .expect(400);
    });

    it('should handle idempotency (duplicate trade ID)', async () => {
      // Setup
      const l0Res = await request(app.getHttpServer())
        .post('/api/referral/generate')
        .set('x-user-id', 'IDEM_L0')
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/referral/register')
        .set('x-user-id', 'IDEM_L1')
        .send({ code: l0Res.body.code })
        .expect(201);

      // First trade
      await request(app.getHttpServer())
        .post('/api/trades/mock')
        .set('x-user-id', 'IDEM_L1')
        .send({
          tradeId: 'DUPLICATE_TRADE',
          userId: 'IDEM_L1',
          feeAmount: 100,
        })
        .expect(201);

      // Duplicate trade (same ID)
      await request(app.getHttpServer())
        .post('/api/trades/mock')
        .set('x-user-id', 'IDEM_L1')
        .send({
          tradeId: 'DUPLICATE_TRADE',
          userId: 'IDEM_L1',
          feeAmount: 100,
        })
        .expect(201);

      // Verify commissions were only recorded once
      const earnings = await request(app.getHttpServer())
        .get('/api/referral/earnings')
        .set('x-user-id', 'IDEM_L0')
        .expect(200);

      expect(earnings.body.total).toBe(30); // Should be 30, not 60
    });
  });

  describe('Edge Cases', () => {
    it('should prevent self-referral', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/referral/generate')
        .set('x-user-id', 'SELF_REF')
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/api/referral/register')
        .set('x-user-id', 'SELF_REF')
        .send({ code: res.body.code })
        .expect(500);

      expect(response.body.message).toBe('Cannot self-refer');
    });

    it('should prevent circular referrals', async () => {
      // A refers B
      const aRes = await request(app.getHttpServer())
        .post('/api/referral/generate')
        .set('x-user-id', 'CIRC_A')
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/referral/register')
        .set('x-user-id', 'CIRC_B')
        .send({ code: aRes.body.code })
        .expect(201);

      // B generates code
      const bRes = await request(app.getHttpServer())
        .post('/api/referral/generate')
        .set('x-user-id', 'CIRC_B')
        .expect(201);

      // Try to make A refer to B's code (circular)
      const response = await request(app.getHttpServer())
        .post('/api/referral/register')
        .set('x-user-id', 'CIRC_A')
        .send({ code: bRes.body.code })
        .expect(500);

      expect(response.body.message).toBe('Cycle detected');
    });

    it('should enforce maximum depth of 3 levels', async () => {
      // Create chain: L0 -> L1 -> L2 -> L3
      const l0Res = await request(app.getHttpServer())
        .post('/api/referral/generate')
        .set('x-user-id', 'DEPTH_L0')
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/referral/register')
        .set('x-user-id', 'DEPTH_L1')
        .send({ code: l0Res.body.code })
        .expect(201);

      const l1Res = await request(app.getHttpServer())
        .post('/api/referral/generate')
        .set('x-user-id', 'DEPTH_L1')
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/referral/register')
        .set('x-user-id', 'DEPTH_L2')
        .send({ code: l1Res.body.code })
        .expect(201);

      const l2Res = await request(app.getHttpServer())
        .post('/api/referral/generate')
        .set('x-user-id', 'DEPTH_L2')
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/referral/register')
        .set('x-user-id', 'DEPTH_L3')
        .send({ code: l2Res.body.code })
        .expect(201);

      // Try to add L4 (should fail - depth > 3)
      const l3Res = await request(app.getHttpServer())
        .post('/api/referral/generate')
        .set('x-user-id', 'DEPTH_L3')
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/api/referral/register')
        .set('x-user-id', 'DEPTH_L4')
        .send({ code: l3Res.body.code })
        .expect(500);

      expect(response.body.message).toBe('Depth exceeds 3 levels');
    });

    it('should prevent registering twice', async () => {
      const l0Res = await request(app.getHttpServer())
        .post('/api/referral/generate')
        .set('x-user-id', 'DOUBLE_L0')
        .expect(201);

      // First registration
      await request(app.getHttpServer())
        .post('/api/referral/register')
        .set('x-user-id', 'DOUBLE_L1')
        .send({ code: l0Res.body.code })
        .expect(201);

      // Second registration attempt
      const response = await request(app.getHttpServer())
        .post('/api/referral/register')
        .set('x-user-id', 'DOUBLE_L1')
        .send({ code: l0Res.body.code })
        .expect(500);

      expect(response.body.message).toBe('Referrer already set');
    });
  });
});

