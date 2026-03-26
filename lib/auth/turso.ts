// Direct Turso HTTP client for auth operations
// Used instead of Prisma since auth tables are managed directly

const DB_URL = process.env.DATABASE_URL || '';
const DB_TOKEN = process.env.DATABASE_AUTH_TOKEN || '';

interface TursoRow {
  [key: string]: string | number | null;
}

interface TursoResult {
  cols: Array<{ name: string }>;
  rows: Array<Array<string | number | null>>;
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
    throw new Error(result.error.message);
  }
  return result.response.result;
}

function rowToObject(result: TursoResult): TursoRow[] {
  return result.rows.map(row =>
    Object.fromEntries(result.cols.map((col, i) => [col.name, row[i]]))
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
}

export interface UserLocationRow {
  locationId: string;
}

export async function getUserByEmail(email: string): Promise<AppUserRow | null> {
  const result = await tursoQuery(
    'SELECT id, email, passwordHash, name, role, entityId, mfaSecret, mfaEnabled, active FROM AppUser WHERE email = ? AND deletedAt IS NULL',
    [email]
  );
  const rows = rowToObject(result);
  if (rows.length === 0) return null;
  return rows[0] as unknown as AppUserRow;
}

export async function getUserById(id: string): Promise<AppUserRow | null> {
  const result = await tursoQuery(
    'SELECT id, email, passwordHash, name, role, entityId, mfaSecret, mfaEnabled, active FROM AppUser WHERE id = ? AND deletedAt IS NULL',
    [id]
  );
  const rows = rowToObject(result);
  if (rows.length === 0) return null;
  return rows[0] as unknown as AppUserRow;
}

export async function getUserLocationIds(userId: string): Promise<string[]> {
  const result = await tursoQuery(
    'SELECT locationId FROM UserLocationAccess WHERE userId = ?',
    [userId]
  );
  const rows = rowToObject(result);
  return rows.map(r => r.locationId as string);
}

export async function setMfaSecret(userId: string, secret: string): Promise<void> {
  await tursoQuery(
    'UPDATE AppUser SET mfaSecret = ?, mfaEnabled = 1 WHERE id = ?',
    [secret, userId]
  );
}

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
