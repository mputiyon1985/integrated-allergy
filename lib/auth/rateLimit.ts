/**
 * Persistent rate limiter using the database.
 * Stores login attempt counts per IP in AuditLog or a dedicated table.
 * HIPAA-compliant: survives serverless cold starts.
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

  return {
    allowed: recentAttempts < maxAttempts,
    remaining: Math.max(0, maxAttempts - recentAttempts),
  };
}
