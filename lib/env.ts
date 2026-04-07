/**
 * Environment variable validation using Zod.
 * Validates all required env vars at startup — fails fast with clear error messages.
 * Import this in lib/db.ts and lib/auth/session.ts to ensure env is validated.
 */
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters').optional()
    .refine(
      (val) => process.env.NODE_ENV !== 'production' || (val && val.length >= 32),
      'JWT_SECRET is required in production and must be at least 32 characters'
    ),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

// Only validate at runtime (not during next build) — DATABASE_URL not available at build time
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build';

const _env = isBuildTime
  ? { success: true as const, data: { DATABASE_URL: '', JWT_SECRET: undefined, NODE_ENV: 'production' as const } }
  : envSchema.safeParse(process.env);

if (!isBuildTime && !_env.success && 'error' in _env) {
  console.error('❌ Invalid environment variables:');
  console.error(_env.error.flatten().fieldErrors);
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Invalid environment configuration. Check server logs.');
  }
}

export const env = _env.success ? _env.data : { DATABASE_URL: process.env.DATABASE_URL ?? '', JWT_SECRET: process.env.JWT_SECRET, NODE_ENV: 'development' as const };
