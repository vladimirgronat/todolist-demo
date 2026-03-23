/**
 * Automatic Supabase Migration Runner
 *
 * Reads migration files from supabase/migrations/, tracks applied ones
 * in a _migrations table, and runs new migrations via Supabase Management API.
 *
 * Required env vars:
 *   SUPABASE_PROJECT_REF  — project reference (from URL: https://<ref>.supabase.co)
 *   SUPABASE_ACCESS_TOKEN — personal access token (https://supabase.com/dashboard/account/tokens)
 *
 * Usage:
 *   npm run db:migrate
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Load .env.local if present (no dotenv dependency needed)
const envLocalPath = join(process.cwd(), ".env.local");
if (existsSync(envLocalPath)) {
  for (const line of readFileSync(envLocalPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

const PROJECT_REF =
  process.env.SUPABASE_PROJECT_REF ??
  process.env.NEXT_PUBLIC_SUPABASE_URL?.match(
    /https:\/\/([^.]+)\.supabase\.co/
  )?.[1];
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");
const API_BASE = "https://api.supabase.com";

if (!PROJECT_REF || !ACCESS_TOKEN) {
  console.error(
    "Missing env vars. Set SUPABASE_ACCESS_TOKEN (and optionally SUPABASE_PROJECT_REF).\n" +
      "  Project ref is auto-detected from NEXT_PUBLIC_SUPABASE_URL if available.\n" +
      "  Create an access token at: https://supabase.com/dashboard/account/tokens"
  );
  process.exit(1);
}

interface QueryResult {
  error?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result?: any;
}

const runSQL = async (sql: string): Promise<QueryResult> => {
  const res = await fetch(`${API_BASE}/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { error: `HTTP ${res.status}: ${text}` };
  }

  const data = await res.json();
  return { result: data };
};

const ensureMigrationsTable = async (): Promise<void> => {
  const sql = `
    CREATE TABLE IF NOT EXISTS public._migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `;
  const { error } = await runSQL(sql);
  if (error) {
    console.error("Failed to create _migrations table:", error);
    process.exit(1);
  }
};

const getAppliedMigrations = async (): Promise<Set<string>> => {
  const { result, error } = await runSQL(
    "SELECT name FROM public._migrations ORDER BY name;"
  );
  if (error) {
    console.error("Failed to read _migrations:", error);
    process.exit(1);
  }

  const applied = new Set<string>();
  if (Array.isArray(result)) {
    for (const row of result) {
      if (row.name) applied.add(row.name);
    }
  }
  return applied;
};

const getMigrationFiles = (): { name: string; sql: string }[] => {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  return files.map((name) => ({
    name,
    sql: readFileSync(join(MIGRATIONS_DIR, name), "utf8"),
  }));
};

const main = async () => {
  console.log(`Connecting to project: ${PROJECT_REF}`);

  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();
  const migrations = getMigrationFiles();

  console.log(`Found ${migrations.length} migration files, ${applied.size} already applied.\n`);

  let newCount = 0;

  for (const migration of migrations) {
    if (applied.has(migration.name)) {
      console.log(`  ✓ ${migration.name} (already applied)`);
      continue;
    }

    console.log(`  → Running ${migration.name}...`);

    // Run migration
    const { error } = await runSQL(migration.sql);
    if (error) {
      // If the error is just "already exists", treat as success and record it
      const alreadyExists =
        typeof error === "string" && /already exists/.test(error);
      if (alreadyExists) {
        console.log(`  ~ ${migration.name} (skipped — objects already exist)`);
      } else {
        console.error(`  ✗ FAILED: ${migration.name}`);
        console.error(`    ${error}`);
        process.exit(1);
      }
    }

    // Record in _migrations
    const escapedName = migration.name.replace(/'/g, "''");
    const { error: recordError } = await runSQL(
      `INSERT INTO public._migrations (name) VALUES ('${escapedName}');`
    );
    if (recordError) {
      console.error(`  ⚠ Migration ran but failed to record: ${recordError}`);
    }

    console.log(`  ✓ ${migration.name} (applied)`);
    newCount++;
  }

  if (newCount === 0) {
    console.log("\nDatabase is up to date.");
  } else {
    console.log(`\nApplied ${newCount} new migration(s).`);
  }

  // Show current DB version
  const { result } = await runSQL(
    "SELECT name, applied_at FROM public._migrations ORDER BY name DESC LIMIT 1;"
  );
  if (Array.isArray(result) && result.length > 0) {
    console.log(`\nDB version: ${result[0].name} (applied ${result[0].applied_at})`);
  }
};

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
