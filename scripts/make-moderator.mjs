// Gives an account moderator rights (creates the account if needed).
// Usage:  npm run make-moderator -- someone@example.com "Their Name"
import { createClient } from "@libsql/client";
import fs from "fs";
import crypto from "crypto";

const env = {};
try { for (const l of fs.readFileSync(".env", "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z_]+)\s*=\s*"?([^"]*)"?\s*$/); if (m) env[m[1]] = m[2]; } } catch {}
// Works on the local database, or on Turso when TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are set.
const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || env.TURSO_DATABASE_URL || env.DATABASE_URL || "file:data/papr.db";
const authToken = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN || env.TURSO_AUTH_TOKEN || undefined;
const db = createClient({ url, authToken });
const email = (process.argv[2] || "").trim().toLowerCase();
const name = process.argv[3] || "";
if (!email.includes("@")) { console.log('Usage: npm run make-moderator -- someone@example.com "Their Name"'); process.exit(1); }

const found = await db.execute({ sql: "SELECT id FROM users WHERE email = ?", args: [email] });
if (found.rows.length) await db.execute({ sql: "UPDATE users SET role = 'moderator' WHERE email = ?", args: [email] });
else await db.execute({ sql: "INSERT INTO users (id, email, name, role, created_at) VALUES (?,?,?,?,?)", args: [crypto.randomUUID(), email, name, "moderator", new Date().toISOString()] });
console.log(`${email} is now a moderator. They can log in at /login.`);
