import crypto from "crypto";
import { createClient, type Client, type InValue } from "@libsql/client";
// The SQL files are bundled into the app at build time (see next.config.mjs), so they work on Vercel too.
import SCHEMA_SQL from "../../db/schema.sql";
import MIGRATIONS_SQL from "../../db/migrations.sql";

// Database: a local file while developing, or Turso (libSQL in the cloud) when deployed.
// The Turso integration on Vercel sets TURSO_DATABASE_URL and TURSO_AUTH_TOKEN for you.
const DB_URL = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || "file:data/papr.db";
const DB_TOKEN = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN || undefined;

// One database connection, reused across requests and hot reloads.
const g = globalThis as unknown as { __db?: Client };
function connect(): Client {
  if (process.env.VERCEL && DB_URL.startsWith("file:"))
    throw new Error("papr needs a cloud database on Vercel. Add the Turso integration (Storage tab) so TURSO_DATABASE_URL is set, then redeploy.");
  return createClient({ url: DB_URL, authToken: DB_TOKEN });
}
let _client: Client | undefined = g.__db;
function db(): Client {
  if (!_client) { _client = connect(); if (process.env.NODE_ENV !== "production") g.__db = _client; }
  return _client;
}

type Args = InValue[];

// Upgrades the database to the latest tables/columns the first time it is used (same logic as db/migrate.mjs).
// A fingerprint of the SQL is kept in app_state so later cold starts skip the work.
const SCHEMA_HASH = crypto.createHash("sha1").update(SCHEMA_SQL + MIGRATIONS_SQL).digest("hex");
const gm = globalThis as unknown as { __migrated?: Promise<void> };
async function migrate() {
  try {
    const r = await db().execute({ sql: "SELECT value FROM app_state WHERE key = 'schema_hash'", args: [] });
    if (r.rows[0]?.[0] === SCHEMA_HASH) return;
  } catch { /* new database: no app_state table yet */ }
  await db().executeMultiple(SCHEMA_SQL);
  const sql = MIGRATIONS_SQL;
  // Add missing columns to tables that already exist (older databases), then create new tables and indexes.
  const addColumns = async () => {
    for (const line of sql.split(/\r?\n/)) {
      const m = line.match(/^--@column\s+(\w+)\s+(\w+)\s+(.+)$/);
      if (!m) continue;
      const cols = await db().execute(`PRAGMA table_info(${m[1]})`);
      if (cols.rows.length && !cols.rows.some((r) => r.name === m[2])) await db().execute(`ALTER TABLE ${m[1]} ADD COLUMN ${m[2]} ${m[3]}`);
    }
  };
  await addColumns();
  await db().executeMultiple(sql.split(/\r?\n/).filter((l) => !l.startsWith("--@")).join("\n"));
  await addColumns();
  await db().execute({ sql: "INSERT INTO app_state (key, value) VALUES ('schema_hash', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", args: [SCHEMA_HASH] });
}
export function ready() {
  gm.__migrated ??= migrate().catch((e) => { gm.__migrated = undefined; throw e; });
  return gm.__migrated;
}

/** Run a query and return all rows as plain objects. */
export async function all<T = Record<string, unknown>>(sql: string, args: Args = []): Promise<T[]> {
  await ready();
  const r = await db().execute({ sql, args });
  return r.rows.map((row) => Object.fromEntries(r.columns.map((c, i) => [c, row[i]]))) as T[];
}

/** Run a query and return the first row, or null. */
export async function one<T = Record<string, unknown>>(sql: string, args: Args = []): Promise<T | null> {
  return (await all<T>(sql, args))[0] ?? null;
}

/** Run an INSERT / UPDATE / DELETE. */
export async function run(sql: string, args: Args = []) {
  await ready();
  return db().execute({ sql, args });
}

export const newId = () => crypto.randomUUID();
export const nowIso = () => new Date().toISOString();

// ---- Row types (match db/schema.sql) ----
export type User = {
  id: string; email: string; name: string; role: string;
  institution: string | null; programme: string | null; level: string | null; created_at: string;
  handle: string | null; headline: string | null; bio: string | null; skills: string | null; linkedin: string | null;
  open_to_opps: number; interests: string | null; lecturer_requested: number;
};

export type Submission = {
  id: string; ref: string; status: string; owner_id: string;
  title: string; abstract: string; keywords: string; authors_text: string;
  field: string; type: string; year: string; institution: string; programme: string;
  current_version: number; supervisor_name: string; supervisor_email: string;
  supervisor_token: string | null; supervisor_confirmed_at: string | null;
  doi: string | null; views: number; downloads: number;
  published_at: string | null; withdrawn_at: string | null; created_at: string; updated_at: string;
  collection_id: string | null; campaign_id: string | null; claim_email: string | null; claim_token: string | null;
  claimed_at: string | null; imported: number; ideas_at: string | null;
};

export type Version = {
  id: string; submission_id: string; number: number; title: string; abstract: string; keywords: string;
  pdf_path: string; pdf_name: string; pdf_size: number; declarations: string; created_at: string;
  text: string | null; indexed_at: string | null;
};

export type Review = {
  id: string; submission_id: string; version_number: number; moderator_id: string;
  decision: string; note: string | null; checklist: string; similarity: number; created_at: string;
};

export type Event = { id: string; submission_id: string; text: string; created_at: string };

export type Collection = { id: string; slug: string; title: string; description: string; owner_id: string; institution: string; expected: number | null; deadline: string | null; created_at: string };
export type Opportunity = { id: string; title: string; org: string; type: string; fields: string; location: string; deadline: string | null; url: string; description: string; sample: number; created_at: string;
  source: string | null; level: string | null; country: string | null; funded: number; live: number; hidden: number; published_at: string | null };
export type Campaign = { id: string; title: string; message: string; badge: string; starts_at: string; ends_at: string };
export type Award = { id: string; month: string; submission_id: string; prize: string; sponsor: string; citation: string };

/** Builds "?,?,?" for an IN (...) list. */
export const qs = (n: number) => Array(n).fill("?").join(",");
