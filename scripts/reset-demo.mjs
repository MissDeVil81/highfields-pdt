#!/usr/bin/env node
/**
 * reset-demo.mjs
 *
 * Resets the DEMO database to its standard demonstration state.
 * Admin-only operation — requires explicit confirmation.
 *
 * SAFETY GUARD: This script refuses to run unless APP_ENV=demo.
 *
 * Usage (from the Demo repl):
 *   DEMO_DATABASE_URL=$DEMO_DATABASE_URL APP_ENV=demo \
 *     node scripts/reset-demo.mjs
 */

import pg from "pg";
import readline from "readline";

const { Client } = pg;

// ── Safety guard ─────────────────────────────────────────────────────────────
const APP_ENV = process.env.APP_ENV;
if (APP_ENV !== "demo") {
  console.error("❌ REFUSED: reset-demo.mjs will only run when APP_ENV=demo.");
  console.error(`   Current APP_ENV: "${APP_ENV ?? "(not set)"}"`);
  console.error("   This script must never run against Development or Live.");
  process.exit(1);
}

const DATABASE_URL = process.env.DEMO_DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DEMO_DATABASE_URL is required.");
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

async function run() {
  console.log("\n⚠  DEMO DATABASE RESET\n");
  console.log("This will restore the demo database to its standard demonstration state.");
  console.log("All current demo data will be replaced with the standard demo dataset.\n");
  console.log("This will NOT affect the Live environment.\n");

  const confirm = (await ask('Type "reset demo" to confirm: ')).trim();
  rl.close();

  if (confirm !== "reset demo") {
    console.log("Cancelled.");
    process.exit(0);
  }

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  console.log("\n🗑  Wiping demo data...");
  await client.query(`
    TRUNCATE TABLE
      audit_log,
      additional_user_permissions,
      additional_team_permissions,
      user_teams,
      assessments,
      evidence,
      financial_progress,
      probation_action_evidence,
      probation_actions,
      probation_reflections,
      probation_assessments,
      probation_manager_reviews,
      teams,
      users
    RESTART IDENTITY CASCADE;
  `);

  await client.query(`
    TRUNCATE TABLE
      competencies,
      financial_targets,
      probation_items,
      roles,
      career_paths
    RESTART IDENTITY CASCADE;
  `);

  await client.end();

  console.log("\n✅ Demo database cleared.");
  console.log("   Restart the Demo API server — it will re-seed all demo data on startup.");
}

run().catch((err) => {
  console.error("❌ Reset failed:", err.message);
  process.exit(1);
});
