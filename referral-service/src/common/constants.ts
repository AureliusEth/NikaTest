/**
 * Application Constants
 *
 * Centralized constants used across the application.
 * Makes it easy to change values without modifying code.
 */

/**
 * Default cashback rate for new users (10%)
 */
export const DEFAULT_CASHBACK_RATE = 0.1;

/**
 * Internal email domain for users created without an email address
 * Used as placeholder: userId@internal.nika.com
 */
export const INTERNAL_EMAIL_DOMAIN = '@internal.nika.com';

/**
 * Commission rates for referral levels
 */
export const COMMISSION_RATES = {
  LEVEL_1: 0.3, // 30% for direct referrals
  LEVEL_2: 0.03, // 3% for second level
  LEVEL_3: 0.02, // 2% for third level
} as const;

/**
 * Treasury percentage (currently 0% - all goes to users/referrers)
 */
export const TREASURY_PERCENTAGE = 0;

/**
 * Maximum referral depth (levels)
 */
export const MAX_REFERRAL_DEPTH = 3;
