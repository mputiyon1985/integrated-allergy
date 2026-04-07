/**
 * Environment variable validation using Zod.
 * Validates all required env vars at startup — fails fast with clear error messages.
 * Import this in lib/db.ts and lib/auth/session.ts to ensure env is validated.
 */
import { z } from 'zod';

// Runtime-only schema — all fields optional at build time, validated at request time
const envSchema = z.object({
  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters').optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

const _parsed = envSchema.safeParse(process.env);

// Validate critical secrets at runtime (not build time) in production
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build') {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET environment variable is required and must be at least 32 characters');
  }
}

export const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? '',
  JWT_SECRET: process.env.JWT_SECRET,
  NODE_ENV: (process.env.NODE_ENV ?? 'development') as 'development' | 'test' | 'production',
};

// Log warnings in dev if env vars are missing
if (process.env.NODE_ENV === 'development' && !_parsed.success) {
  console.warn('⚠️ Some environment variables are missing:', _parsed.error?.flatten().fieldErrors);
}
