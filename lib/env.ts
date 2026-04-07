/**
 * Environment variable access with runtime validation.
 * Import `env` to access validated environment variables.
 * Validation only runs on first API request, not during build.
 */

let validated = false;

/**
 * Validates critical environment variables at runtime.
 * Called lazily on first use to avoid build-time failures.
 */
export function validateEnv(): void {
  if (validated) return;
  validated = true;

  if (process.env.NODE_ENV !== 'production') return;

  const errors: string[] = [];

  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL is required');
  }

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET is required and must be at least 32 characters');
  }

  if (errors.length > 0) {
    throw new Error(`❌ Invalid environment configuration:\n${errors.join('\n')}`);
  }
}

/** Typed environment variable accessor */
export const env = {
  get DATABASE_URL() { return process.env.DATABASE_URL ?? ''; },
  get JWT_SECRET() { return process.env.JWT_SECRET; },
  get NODE_ENV() { return (process.env.NODE_ENV ?? 'development') as 'development' | 'test' | 'production'; },
};
