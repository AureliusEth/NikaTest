/**
 * Commission Policy Tests
 *
 * PURPOSE:
 * Tests how trade fees are split between cashback, referral commissions, and treasury.
 * This is the core economic model of the referral system.
 *
 * BUSINESS RULES:
 * - Cashback (Level 0): User-specific rate (default 10% of fee)
 * - Level 1 (direct referrer): 30% of fee
 * - Level 2 (referrer's referrer): 3% of fee
 * - Level 3 (L2's referrer): 2% of fee
 * - Treasury: Remainder (~55% when all levels present)
 *
 * EDGE CASES:
 * - Users with no referrer: Only cashback + treasury
 * - Users with partial referral chains (1-2 levels): Remaining % goes to treasury
 * - Zero cashback rate users: More goes to treasury
 * - Maximum 3-level referral chain depth
 *
 * INTEGRATION:
 * - DefaultPolicy implements the CommissionPolicy interface
 * - Used by CommissionService during trade processing
 * - Results stored in CommissionLedgerEntry table
 */

import { DefaultPolicy } from '../../../../src/infrastructure/policies/default-policy';

describe('Commission Policy', () => {
  let policy: DefaultPolicy;

  beforeEach(() => {
    policy = new DefaultPolicy();
  });

  describe('Standard Fee Split - Full Referral Chain', () => {
    it('should split 100 XP fee correctly for user with 3-level referral chain and 10% cashback', () => {
      // Arrange: User has full referral chain (3 ancestors) and 10% cashback rate
      const fee = 100;
      const context = {
        userId: 'trader',
        userCashbackRate: 0.1, // 10%
        ancestors: ['level1-referrer', 'level2-referrer', 'level3-referrer'],
        token: 'XP',
      };

      // Act: Calculate commission splits
      const splits = policy.calculateSplits(fee, context);

      // Assert: Verify 5 splits (cashback + 3 referral levels + treasury)
      expect(splits).toHaveLength(5);

      // Cashback: 10% of 100 = 10 XP
      const cashback = splits.find((s) => s.level === 0);
      expect(cashback).toBeDefined();
      expect(cashback!.beneficiaryId).toBe('trader');
      expect(cashback!.amount).toBeCloseTo(10);
      expect(cashback!.destination).toBe('claimable');

      // Level 1: 30% of 100 = 30 XP
      const level1 = splits.find((s) => s.level === 1);
      expect(level1).toBeDefined();
      expect(level1!.beneficiaryId).toBe('level1-referrer');
      expect(level1!.amount).toBeCloseTo(30);
      expect(level1!.destination).toBe('claimable');

      // Level 2: 3% of 100 = 3 XP
      const level2 = splits.find((s) => s.level === 2);
      expect(level2).toBeDefined();
      expect(level2!.beneficiaryId).toBe('level2-referrer');
      expect(level2!.amount).toBeCloseTo(3);
      expect(level2!.destination).toBe('claimable');

      // Level 3: 2% of 100 = 2 XP
      const level3 = splits.find((s) => s.level === 3);
      expect(level3).toBeDefined();
      expect(level3!.beneficiaryId).toBe('level3-referrer');
      expect(level3!.amount).toBeCloseTo(2);
      expect(level3!.destination).toBe('claimable');

      // Treasury: 55% of 100 = 55 XP
      const treasury = splits.find((s) => s.level === -1);
      expect(treasury).toBeDefined();
      expect(treasury!.beneficiaryId).toBe('NIKA_TREASURY');
      expect(treasury!.amount).toBeCloseTo(55);
      expect(treasury!.destination).toBe('treasury');
    });

    it('should calculate correct percentages regardless of fee amount', () => {
      // Arrange: Test with different fee amount
      const fee = 1000;
      const context = {
        userId: 'trader',
        userCashbackRate: 0.1,
        ancestors: ['ref1', 'ref2', 'ref3'],
        token: 'XP',
      };

      // Act
      const splits = policy.calculateSplits(fee, context);

      // Assert: Percentages remain constant
      expect(splits.find((s) => s.level === 0)!.amount).toBeCloseTo(100); // 10%
      expect(splits.find((s) => s.level === 1)!.amount).toBeCloseTo(300); // 30%
      expect(splits.find((s) => s.level === 2)!.amount).toBeCloseTo(30); // 3%
      expect(splits.find((s) => s.level === 3)!.amount).toBeCloseTo(20); // 2%
    });
  });

  describe('Partial Referral Chains', () => {
    it('should handle user with only 1 level referrer (no L2/L3)', () => {
      // Arrange: User has only direct referrer
      const fee = 100;
      const context = {
        userId: 'trader',
        userCashbackRate: 0.1,
        ancestors: ['level1-only'],
        token: 'XP',
      };

      // Act
      const splits = policy.calculateSplits(fee, context);

      // Assert: Cashback + level 1 + treasury
      expect(splits).toHaveLength(3);
      expect(splits.find((s) => s.level === 0)!.amount).toBeCloseTo(10);
      expect(splits.find((s) => s.level === 1)!.amount).toBeCloseTo(30);
      expect(splits.find((s) => s.level === 2)).toBeUndefined();
      expect(splits.find((s) => s.level === 3)).toBeUndefined();

      // Treasury gets remainder: 60 XP
      expect(splits.find((s) => s.level === -1)!.amount).toBeCloseTo(60);
    });

    it('should handle user with 2-level referral chain (no L3)', () => {
      // Arrange
      const fee = 100;
      const context = {
        userId: 'trader',
        userCashbackRate: 0.1,
        ancestors: ['ref1', 'ref2'],
        token: 'XP',
      };

      // Act
      const splits = policy.calculateSplits(fee, context);

      // Assert: Cashback + L1 + L2 + treasury
      expect(splits).toHaveLength(4);
      expect(splits.find((s) => s.level === 0)!.amount).toBeCloseTo(10);
      expect(splits.find((s) => s.level === 1)!.amount).toBeCloseTo(30);
      expect(splits.find((s) => s.level === 2)!.amount).toBeCloseTo(3);
      expect(splits.find((s) => s.level === 3)).toBeUndefined();

      // Treasury gets remainder: 57 XP
      expect(splits.find((s) => s.level === -1)!.amount).toBeCloseTo(57);
    });

    it('should handle user with no referrer (solo trader)', () => {
      // Arrange: User has no referrer
      const fee = 100;
      const context = {
        userId: 'solo-trader',
        userCashbackRate: 0.1,
        ancestors: [], // No referrers
        token: 'XP',
      };

      // Act
      const splits = policy.calculateSplits(fee, context);

      // Assert: Cashback + treasury
      expect(splits).toHaveLength(2);
      expect(splits.find((s) => s.level === 0)!.amount).toBeCloseTo(10);
      expect(splits.find((s) => s.level === 0)!.beneficiaryId).toBe(
        'solo-trader',
      );

      // Treasury gets remainder: 90 XP
      expect(splits.find((s) => s.level === -1)!.amount).toBeCloseTo(90);
    });
  });

  describe('Variable Cashback Rates', () => {
    it('should handle user with 0% cashback rate', () => {
      // Arrange: VIP user with no cashback (gets other benefits)
      const fee = 100;
      const context = {
        userId: 'vip-trader',
        userCashbackRate: 0, // 0% cashback
        ancestors: ['ref1'],
        token: 'XP',
      };

      // Act
      const splits = policy.calculateSplits(fee, context);

      // Assert: Referral commission + treasury (no cashback)
      expect(splits).toHaveLength(2);
      expect(splits.find((s) => s.level === 1)!.amount).toBeCloseTo(30);
      expect(splits.find((s) => s.level === 0)).toBeUndefined(); // No cashback

      // Treasury gets remainder: 70 XP
      expect(splits.find((s) => s.level === -1)!.amount).toBeCloseTo(70);
    });

    it('should handle user with custom 20% cashback rate', () => {
      // Arrange: Premium user with higher cashback
      const fee = 100;
      const context = {
        userId: 'premium-trader',
        userCashbackRate: 0.2, // 20% cashback
        ancestors: ['ref1'],
        token: 'XP',
      };

      // Act
      const splits = policy.calculateSplits(fee, context);

      // Assert: Higher cashback + referral + treasury
      expect(splits).toHaveLength(3);
      expect(splits.find((s) => s.level === 0)!.amount).toBeCloseTo(20);
      expect(splits.find((s) => s.level === 1)!.amount).toBeCloseTo(30);

      // Treasury gets remainder: 50 XP
      expect(splits.find((s) => s.level === -1)!.amount).toBeCloseTo(50);
    });
  });

  describe('Different Tokens', () => {
    it('should work with USDC token', () => {
      // Arrange: Same logic applies to all tokens
      const fee = 50.5; // USDC amount
      const context = {
        userId: 'trader',
        userCashbackRate: 0.1,
        ancestors: ['ref1'],
        token: 'USDC',
      };

      // Act
      const splits = policy.calculateSplits(fee, context);

      // Assert: Same percentage splits + treasury
      expect(splits).toHaveLength(3);
      expect(splits.find((s) => s.level === 0)!.amount).toBeCloseTo(5.05); // 10%
      expect(splits.find((s) => s.level === 1)!.amount).toBeCloseTo(15.15); // 30%
      expect(splits.find((s) => s.level === -1)!.amount).toBeCloseTo(30.3); // ~60% treasury
      expect(splits[0].token).toBe('USDC');
      expect(splits[1].token).toBe('USDC');
      expect(splits[2].token).toBe('USDC');
    });
  });

  describe('Metadata Verification', () => {
    it('should include correct rate metadata in splits', () => {
      // Arrange
      const fee = 100;
      const context = {
        userId: 'trader',
        userCashbackRate: 0.1,
        ancestors: ['ref1', 'ref2'],
        token: 'XP',
      };

      // Act
      const splits = policy.calculateSplits(fee, context);

      // Assert: Each split has correct rate
      expect(splits.find((s) => s.level === 0)!.rate).toBeCloseTo(0.1);
      expect(splits.find((s) => s.level === 1)!.rate).toBeCloseTo(0.3);
      expect(splits.find((s) => s.level === 2)!.rate).toBeCloseTo(0.03);
    });

    it('should set correct destinations for splits', () => {
      // Arrange
      const fee = 100;
      const context = {
        userId: 'trader',
        userCashbackRate: 0.1,
        ancestors: ['ref1'],
        token: 'XP',
      };

      // Act
      const splits = policy.calculateSplits(fee, context);

      // Assert: Claimable splits have 'claimable' destination, treasury has 'treasury'
      const claimableSplits = splits.filter((s) => s.level >= 0);
      const treasurySplits = splits.filter((s) => s.level === -1);

      claimableSplits.forEach((split) => {
        expect(split.destination).toBe('claimable');
      });

      treasurySplits.forEach((split) => {
        expect(split.destination).toBe('treasury');
        expect(split.beneficiaryId).toBe('NIKA_TREASURY');
      });
    });
  });

  describe('Fractional Amounts', () => {
    it('should handle fractional XP amounts correctly', () => {
      // Arrange: Fee that results in fractional splits
      const fee = 33.33;
      const context = {
        userId: 'trader',
        userCashbackRate: 0.1,
        ancestors: ['ref1', 'ref2', 'ref3'],
        token: 'XP',
      };

      // Act
      const splits = policy.calculateSplits(fee, context);

      // Assert: Correct fractional calculations
      expect(splits.find((s) => s.level === 0)!.amount).toBeCloseTo(3.333, 2); // 10%
      expect(splits.find((s) => s.level === 1)!.amount).toBeCloseTo(9.999, 2); // 30%
      expect(splits.find((s) => s.level === 2)!.amount).toBeCloseTo(0.9999, 2); // 3%
      expect(splits.find((s) => s.level === 3)!.amount).toBeCloseTo(0.6666, 2); // 2%
    });
  });
});
