/**
 * @file lib/auth/session.ts — JWT session management for the Integrated Allergy IMS
 *
 * @description
 * Handles creation, verification, and lifecycle of user sessions.
 * Sessions are stored as signed JWT tokens in an httpOnly cookie (ia_session).
 *
 * Two token types are used:
 * - **Session JWT** (8h expiry): Full user context; set after successful login + MFA.
 * - **Temp JWT** (30m expiry): Used during MFA flow (mfa_verify or mfa_setup step)
 *   before the full session is established.
 *
 * Role-based helpers (canAccessEntity, canAccessLocation, isEntityAdmin, isSuperAdmin)
 * are used by API routes to enforce authorization after authentication.
 */
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production');
}
const secret = jwtSecret || 'integrated-allergy-dev-secret-only';
const JWT_SECRET = new TextEncoder().encode(secret);

const SESSION_COOKIE = 'ia_session';
const _TEMP_COOKIE_PREFIX = 'ia_temp_';

export interface UserContext {
  userId: string;
  role: string;
  entityId: string | null;
  locationIds: string[];
  name: string;
  email: string;
  doctorId?: string | null;
  nurseId?: string | null;
  doctorName?: string | null;
  nurseTitle?: string | null;
}

export interface TempTokenPayload {
  userId: string;
  purpose: 'mfa_verify' | 'mfa_setup';
}

/**
 * Signs a full session JWT containing the user's context (role, locations, identity).
 * @param user - The authenticated user's context to embed in the token
 * @returns A signed JWT string (HS256, 8h expiry)
 */
export async function signSessionJWT(user: UserContext): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(JWT_SECRET);
}

/**
 * Signs a short-lived temporary JWT used during the MFA authentication flow.
 * @param payload - The userId and purpose ('mfa_verify' | 'mfa_setup')
 * @returns A signed JWT string (HS256, 30m expiry)
 */
export async function signTempJWT(payload: TempTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30m')
    .sign(JWT_SECRET);
}

/**
 * Verifies and decodes any JWT signed by this application.
 * @param token - The raw JWT string to verify
 * @returns The decoded payload typed as T, or null if invalid/expired
 */
export async function verifyJWT<T>(token: string): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as T;
  } catch {
    return null;
  }
}

/**
 * Signs a session JWT and sets it as an httpOnly cookie on the response.
 * @param user - The authenticated user context to encode in the session
 */
export async function setSessionCookie(user: UserContext): Promise<void> {
  const token = await signSessionJWT(user);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 8, // 8 hours
    path: '/',
  });
}

/**
 * Removes the ia_session cookie, effectively logging the user out.
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Verifies the ia_session cookie and returns the user context if valid.
 * @param req - Optional NextRequest; if omitted, reads from the Next.js cookie store (Server Component context)
 * @returns The decoded UserContext, or null if the session is absent/expired/invalid
 */
export async function verifySession(req?: NextRequest): Promise<UserContext | null> {
  let token: string | undefined;

  if (req) {
    token = req.cookies.get(SESSION_COOKIE)?.value;
  } else {
    const cookieStore = await cookies();
    token = cookieStore.get(SESSION_COOKIE)?.value;
  }

  if (!token) return null;

  const payload = await verifyJWT<UserContext>(token);
  return payload;
}

/**
 * Verifies the session and throws if unauthenticated. Use in API routes that require login.
 * @param req - Optional NextRequest for reading cookies in API route context
 * @returns The authenticated UserContext
 * @throws Error('Unauthorized') if no valid session exists
 */
export async function requireAuth(req?: NextRequest): Promise<UserContext> {
  const user = await verifySession(req);
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

/**
 * Returns true if the user is allowed to access data belonging to the given entity.
 * super_admin can access all entities; other roles can only access their own.
 * @param user - The authenticated user context
 * @param entityId - The entity ID to check access for
 */
export function canAccessEntity(user: UserContext, entityId: string): boolean {
  if (user.role === 'super_admin') return true;
  return user.entityId === entityId;
}

/**
 * Returns true if the user is allowed to access data for the given clinic location.
 * super_admin and entity_admin can access all locations; location_staff is restricted
 * to their assigned locations via UserLocationAccess.
 * @param user - The authenticated user context
 * @param locationId - The location ID to check access for
 */
export function canAccessLocation(user: UserContext, locationId: string): boolean {
  if (user.role === 'super_admin') return true;
  if (user.role === 'entity_admin') return true; // entity_admin can access all locations within entity
  return user.locationIds.includes(locationId);
}

/**
 * Returns true if the user has entity-level admin privileges (entity_admin or super_admin).
 * @param user - The authenticated user context
 */
export function isEntityAdmin(user: UserContext): boolean {
  return user.role === 'entity_admin' || user.role === 'super_admin';
}

/**
 * Returns true if the user is a super administrator with full system access.
 * @param user - The authenticated user context
 */
export function isSuperAdmin(user: UserContext): boolean {
  return user.role === 'super_admin';
}

/**
 * Decode the JWT payload (without signature verification) to get the token age in minutes.
 * Used for server-side session timeout enforcement.
 */
export function getTokenAge(token: string): number {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return Infinity;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return Math.floor((Date.now() / 1000 - (payload.iat ?? 0)) / 60); // minutes
  } catch {
    return Infinity;
  }
}
