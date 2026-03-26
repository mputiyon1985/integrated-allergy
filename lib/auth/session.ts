import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'integrated-allergy-secret-key-change-in-production'
);

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

export async function signSessionJWT(user: UserContext): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(JWT_SECRET);
}

export async function signTempJWT(payload: TempTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30m')
    .sign(JWT_SECRET);
}

export async function verifyJWT<T>(token: string): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as T;
  } catch {
    return null;
  }
}

export async function setSessionCookie(user: UserContext): Promise<void> {
  const token = await signSessionJWT(user);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8 hours
    path: '/',
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

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

export async function requireAuth(req?: NextRequest): Promise<UserContext> {
  const user = await verifySession(req);
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export function canAccessEntity(user: UserContext, entityId: string): boolean {
  if (user.role === 'super_admin') return true;
  return user.entityId === entityId;
}

export function canAccessLocation(user: UserContext, locationId: string): boolean {
  if (user.role === 'super_admin') return true;
  if (user.role === 'entity_admin') return true; // entity_admin can access all locations within entity
  return user.locationIds.includes(locationId);
}

export function isEntityAdmin(user: UserContext): boolean {
  return user.role === 'entity_admin' || user.role === 'super_admin';
}

export function isSuperAdmin(user: UserContext): boolean {
  return user.role === 'super_admin';
}
