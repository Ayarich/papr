// Brings any papr database up to date. Used by `npm run setup` and automatically by the app on start.
import fs from "fs";
import path from "path";

export async function migrate(client, root = process.cwd()) {
  await client.executeMultiple(fs.readFileSync(path.join(root, "db", "schema.sql"), "utf8"));
  const sql = fs.readFileSync(path.join(root, "db", "migrations.sql"), "utf8");
  // Add missing columns to tables that already exist (older databases), then create new tables and indexes.
  const addColumns = async () => {
    for (const line of sql.split(/\r?\n/)) {
      const m = line.match(/^--@column\s+(\w+)\s+(\w+)\s+(.+)$/);
      if (!m) continue;
      const [, table, column, type] = m;
      const cols = await client.execute(`PRAGMA table_info(${table})`);
      if (cols.rows.length && !cols.rows.some((r) => r.name === column)) await client.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    }
  };
  await addColumns();
  await client.executeMultiple(sql.split(/\r?\n/).filter((l) => !l.startsWith("--@")).join("\n"));
  await addColumns();
}
