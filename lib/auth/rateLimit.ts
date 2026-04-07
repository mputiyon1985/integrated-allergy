/**
 * Persistent rate limiter using the database.
 * Stores login attempt counts per IP in AuditLog or a dedicated table.
 * HIPAA-compliant: survives serverless cold starts.
 *
 * Rate limit sequence (enforced in login route):
 *  1. Count recent failures for identifier
 *  2. If count >= maxAttempts → return 429 (deny BEFORE validating credentials)
 *  3. Validate credentials
 *  4. If credentials fail → log failure FIRST, then return 401
 * This ensures exactly maxAttempts (5) attempts before lockout, with no off-by-one.
 */
import prisma from '@/lib/db';

export async function checkLoginRateLimit(identifier: string): Promise<{ allowed: boolean; remaining: number }> {
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;
  const windowStart = new Date(Date.now() - windowMs);

  // Count recent failed login attempts for this identifier
  const recentAttempts = await prisma.auditLog.count({
    where: {
      action: 'Login Failed',
      details: { contains: identifier },
      createdAt: { gte: windowStart },
    },
  });

  // Block when recentAttempts >= maxAttempts (equivalent to: !allowed when count >= 5)
  return {
    allowed: recentAttempts < maxAttempts,
    remaining: Math.max(0, maxAttempts - recentAttempts),
  };
}
