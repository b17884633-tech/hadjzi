import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = fs.readFileSync(path.join(root, ".env"), "utf8");
for (const line of env.split(/\r?\n/)) {
  const eq = line.indexOf("=");
  if (eq === -1) continue;
  process.env[line.slice(0, eq).trim()] ||= line.slice(eq + 1).trim();
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const enums = await client.query(`
  SELECT t.typname, e.enumlabel
  FROM pg_type t
  JOIN pg_enum e ON t.oid = e.enumtypid
  JOIN pg_namespace n ON n.oid = t.typnamespace
  WHERE n.nspname = 'public'
  ORDER BY t.typname, e.enumsortorder
`);

const fks = await client.query(`
  SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table,
    rc.delete_rule
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
  JOIN information_schema.referential_constraints rc
    ON rc.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
  ORDER BY tc.table_name, kcu.column_name
`);

const counts = await client.query(`
  SELECT relname AS table_name, n_live_tup::int AS approx_rows
  FROM pg_stat_user_tables
  ORDER BY relname
`);

console.log("ENUMS:");
let current = "";
for (const row of enums.rows) {
  if (row.typname !== current) {
    current = row.typname;
    process.stdout.write(`\n${current}: `);
  } else process.stdout.write(", ");
  process.stdout.write(row.enumlabel);
}
console.log("\n\nFOREIGN KEYS:");
for (const row of fks.rows) {
  console.log(` ${row.table_name}.${row.column_name} -> ${row.foreign_table} (${row.delete_rule})`);
}
console.log("\nTABLE ROW COUNTS:");
for (const row of counts.rows) {
  console.log(` ${row.table_name}: ${row.approx_rows}`);
}

await client.end();
