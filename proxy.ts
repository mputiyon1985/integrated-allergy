/**
 * @file proxy.ts — Next.js middleware for JWT session authentication
 *
 * @description
 * Acts as the application's authentication gateway. Every request passes through
 * this middleware before reaching a page or API route.
 *
 * Behavior:
 * - Public paths (/login, /api/auth/*) bypass auth checks.
 * - Next.js internal paths (/_next, /favicon) are allowed through.
 * - Authenticated requests have the JWT payload injected as request headers
 *   (x-user-id, x-user-role, x-user-entity, x-user-locations) so API routes
 *   can access the caller's identity without re-verifying the token.
 * - Expired or invalid tokens redirect to /login?from=<original-path> and
 *   clear the ia_session cookie.
 *
 * @security JWT is signed with HS256 using JWT_SECRET env var.
 *           The ia_session cookie is httpOnly, secure in production, sameSite=strict.
 */
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'integrated-allergy-secret-key-change-in-production'
);

const SESSION_COOKIE = 'ia_session';

const PUBLIC_PATHS = ['/login', '/api/auth'];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow Next.js internals
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);

    // Inject user context into request headers for API routes
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-user-id', payload.userId as string);
    requestHeaders.set('x-user-role', payload.role as string);
    requestHeaders.set('x-user-entity', payload.entityId as string || '');
    requestHeaders.set('x-user-locations', JSON.stringify(payload.locationIds || []));

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  } catch {
    // Token invalid or expired
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
