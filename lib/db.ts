import { createClient, type Client, type InValue } from "@libsql/client";

let client: Client | null = null;
let ready: Promise<void> | null = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  source TEXT NOT NULL,
  summary TEXT,
  found INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS businesses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  place_id TEXT UNIQUE,
  batch_id INTEGER,
  is_sample INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  category TEXT,
  primary_type TEXT,
  types TEXT,
  profile TEXT,
  address TEXT,
  street TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  phone TEXT,
  email TEXT,
  socials TEXT,
  listed_website TEXT,
  hours TEXT,
  rating REAL,
  review_count INTEGER,
  reviews TEXT,
  photos TEXT,
  maps_url TEXT,
  lat REAL,
  lng REAL,
  business_status TEXT,
  search_query TEXT,
  slug TEXT UNIQUE NOT NULL,
  token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  channel TEXT,
  notes TEXT,
  deal_value REAL,
  follow_up_at TEXT,
  followups_sent INTEGER NOT NULL DEFAULT 0,
  contacted_at TEXT,
  email_message_id TEXT,
  needs_response INTEGER NOT NULL DEFAULT 0,
  last_reply_at TEXT,
  last_reply_snippet TEXT,
  scans INTEGER NOT NULL DEFAULT 0,
  views INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_biz_status ON businesses(status);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER,
  type TEXT NOT NULL,
  detail TEXT,
  meta TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_events_biz ON events(business_id);
CREATE TABLE IF NOT EXISTS suppression (
  value TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

function getClient(): Client {
  if (!client) {
    client = createClient({
      url: process.env.DATABASE_URL || "file:local.db",
      authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
    });
  }
  return client;
}

// Columns added after the first release. SQLite has no "ADD COLUMN IF NOT EXISTS", so failures are ignored.
const MIGRATIONS = [
  "ALTER TABLE businesses ADD COLUMN lead_type TEXT NOT NULL DEFAULT 'no_site'",
  "ALTER TABLE businesses ADD COLUMN site_score INTEGER",
  "ALTER TABLE businesses ADD COLUMN site_issues TEXT",
  "ALTER TABLE businesses ADD COLUMN site_checked_at TEXT",
];

async function migrate(c: Client) {
  await c.executeMultiple(SCHEMA);
  for (const m of MIGRATIONS) await c.execute(m).catch(() => {});
}

export async function db(): Promise<Client> {
  const c = getClient();
  if (!ready) {
    ready = migrate(c).catch((e) => {
      ready = null;
      throw e;
    });
  }
  await ready;
  return c;
}

export type Row = Record<string, unknown>;

export async function all<T = Row>(sql: string, args: InValue[] = []): Promise<T[]> {
  const c = await db();
  const r = await c.execute({ sql, args });
  return r.rows.map((row) => ({ ...row }) as T);
}

export async function one<T = Row>(sql: string, args: InValue[] = []): Promise<T | null> {
  const rows = await all<T>(sql, args);
  return rows[0] ?? null;
}

export async function run(sql: string, args: InValue[] = []) {
  const c = await db();
  return c.execute({ sql, args });
}

export function nowIso() {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

export async function logEvent(
  businessId: number | null,
  type: string,
  detail?: string,
  meta?: unknown,
) {
  await run("INSERT INTO events (business_id, type, detail, meta) VALUES (?, ?, ?, ?)", [
    businessId,
    type,
    detail ?? null,
    meta === undefined ? null : JSON.stringify(meta),
  ]);
}
