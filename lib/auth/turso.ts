/**
 * @file lib/auth/turso.ts — Direct Turso HTTP client for authentication queries
 *
 * @description
 * Provides a lightweight HTTP client for the Turso LibSQL database, used
 * exclusively for authentication-related queries that run during the login flow.
 *
 * Why not Prisma here?
 * During authentication (login, MFA), the Prisma client may not yet be initialized
 * or may have connection overhead. The direct HTTP API is faster and more
 * predictable for the latency-sensitive auth path.
 *
 * The client uses the Turso /v2/pipeline HTTP endpoint to execute parameterized SQL
 * with typed cell values (text, integer, float, null).
 *
 * Environment variables required:
 * - DATABASE_URL: libsql:// URL (converted to https:// for HTTP API calls)
 * - DATABASE_AUTH_TOKEN: Turso Bearer token
 */
// Direct Turso HTTP client for auth operations
// Used instead of Prisma since auth tables are managed directly

// Convert libsql:// to https:// for HTTP API calls
const DB_URL = (process.env.DATABASE_URL || '').replace(/^libsql:\/\//, 'https://');
const DB_TOKEN = process.env.DATABASE_AUTH_TOKEN || '';

interface TursoRow {
  [key: string]: string | number | null;
}

interface TursoCell {
  type: 'text' | 'integer' | 'float' | 'blob' | 'null';
  value?: string;
}

interface TursoResult {
  cols: Array<{ name: string }>;
  rows: Array<Array<TursoCell>>;
}

function unwrapCell(cell: TursoCell): string | number | null {
  if (cell.type === 'null' || cell.value === undefined) return null;
  if (cell.type === 'integer') return parseInt(cell.value, 10);
  if (cell.type === 'float') return parseFloat(cell.value);
  return cell.value; // text, blob
}

async function tursoQuery(sql: string, args: Array<string | number | null> = []): Promise<TursoResult> {
  const res = await fetch(`${DB_URL}/v2/pipeline`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DB_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          type: 'execute',
          stmt: {
            sql,
            args: args.map(a => {
              if (a === null) return { type: 'null' };
              if (typeof a === 'number') return { type: 'integer', value: String(a) };
              return { type: 'text', value: String(a) };
            }),
          },
        },
        { type: 'close' },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Turso error: ${res.statusText}`);
  }

  const data = await res.json();
  const result = data.results[0];
  if (result.type === 'error') {
    throw new Error(result.error?.message || 'Turso query error');
  }
  return result.response.result;
}

function rowToObject(result: TursoResult): TursoRow[] {
  return result.rows.map(row =>
    Object.fromEntries(result.cols.map((col, i) => [col.name, unwrapCell(row[i])]))
  );
}

export interface AppUserRow {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: string;
  entityId: string | null;
  mfaSecret: string | null;
  mfaEnabled: number;
  active: number;
  doctorId: string | null;
  nurseId: string | null;
}

export interface UserLocationRow {
  locationId: string;
}

/**
 * Looks up an active (non-deleted) user by their email address.
 * @param email - The user's email address (case-sensitive; normalize before calling)
 * @returns The AppUserRow if found and not soft-deleted, or null
 */
export async function getUserByEmail(email: string): Promise<AppUserRow | null> {
  const result = await tursoQuery(
    'SELECT id, email, passwordHash, name, role, entityId, mfaSecret, mfaEnabled, active, doctorId, nurseId FROM AppUser WHERE email = ? AND deletedAt IS NULL',
    [email]
  );
  const rows = rowToObject(result);
  if (rows.length === 0) return null;
  return rows[0] as unknown as AppUserRow;
}

/**
 * Looks up an active (non-deleted) user by their primary key ID.
 * @param id - The user's cuid primary key
 * @returns The AppUserRow if found and not soft-deleted, or null
 */
export async function getUserById(id: string): Promise<AppUserRow | null> {
  const result = await tursoQuery(
    'SELECT id, email, passwordHash, name, role, entityId, mfaSecret, mfaEnabled, active, doctorId, nurseId FROM AppUser WHERE id = ? AND deletedAt IS NULL',
    [id]
  );
  const rows = rowToObject(result);
  if (rows.length === 0) return null;
  return rows[0] as unknown as AppUserRow;
}

/**
 * Retrieves a doctor's name and title for session token enrichment.
 * @param doctorId - The doctor's cuid primary key
 * @returns An object with { name, title } or null if not found/deleted
 */
export async function getDoctorById(doctorId: string): Promise<{ name: string; title: string } | null> {
  const result = await tursoQuery(
    'SELECT name, title FROM Doctor WHERE id = ? AND deletedAt IS NULL',
    [doctorId]
  );
  const rows = rowToObject(result);
  if (rows.length === 0) return null;
  return { name: rows[0].name as string, title: rows[0].title as string };
}

/**
 * Retrieves a nurse's name and title for session token enrichment.
 * @param nurseId - The nurse's cuid primary key
 * @returns An object with { name, title } or null if not found/deleted
 */
export async function getNurseById(nurseId: string): Promise<{ name: string; title: string } | null> {
  const result = await tursoQuery(
    'SELECT name, title FROM Nurse WHERE id = ? AND deletedAt IS NULL',
    [nurseId]
  );
  const rows = rowToObject(result);
  if (rows.length === 0) return null;
  return { name: rows[0].name as string, title: rows[0].title as string };
}

/**
 * Returns the list of location IDs that a user has been granted access to.
 * Used to populate the locationIds array in the session JWT.
 * @param userId - The user's cuid primary key
 * @returns Array of locationId strings (may be empty for entity_admin/super_admin)
 */
export async function getUserLocationIds(userId: string): Promise<string[]> {
  const result = await tursoQuery(
    'SELECT locationId FROM UserLocationAccess WHERE userId = ?',
    [userId]
  );
  const rows = rowToObject(result);
  return rows.map(r => r.locationId as string);
}

/**
 * Saves a verified TOTP secret and enables MFA for the given user.
 * Called after the user successfully verifies their first TOTP code during setup.
 * @param userId - The user's cuid primary key
 * @param secret - The base32-encoded TOTP secret to store
 */
export async function setMfaSecret(userId: string, secret: string): Promise<void> {
  await tursoQuery(
    'UPDATE AppUser SET mfaSecret = ?, mfaEnabled = 1 WHERE id = ?',
    [secret, userId]
  );
}

/**
 * Fetches all application settings as a key→value map from the Settings table.
 * Used during login to check mfa_required and session_timeout settings.
 * @returns A Record<string, string> of all settings rows
 */
export async function getSettings(): Promise<Record<string, string>> {
  const result = await tursoQuery('SELECT key, value FROM Settings');
  const rows = rowToObject(result);
  return Object.fromEntries(rows.map((r) => [r.key as string, r.value as string]));
}

/**
 * Creates a new AppUser record directly via the Turso HTTP API.
 * Used as an alternative to Prisma for initial user seeding/creation scenarios.
 * @param user - The user data to insert (id must be pre-generated, e.g., cuid())
 */
export async function createUser(user: {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: string;
  entityId?: string | null;
}): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await tursoQuery(
    'INSERT INTO AppUser (id, email, passwordHash, name, role, entityId, active, mfaEnabled, createdAt) VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?)',
    [user.id, user.email, user.passwordHash, user.name, user.role, user.entityId || null, now]
  );
}
