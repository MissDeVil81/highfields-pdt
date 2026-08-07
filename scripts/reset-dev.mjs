#!/usr/bin/env node
/**
 * reset-dev.mjs
 *
 * Resets the DEVELOPMENT database to a clean seed state.
 * Wipes all user data and re-runs the startup seed.
 *
 * SAFETY GUARD: This script refuses to run unless APP_ENV=development.
 *
 * Usage (from this repl, which is the dev environment):
 *   DEVELOPMENT_DATABASE_URL=$DEVELOPMENT_DATABASE_URL APP_ENV=development \
 *     node scripts/reset-dev.mjs
 */

import pg from "pg";
import readline from "readline";

const { Client } = pg;

// ── Safety guard ─────────────────────────────────────────────────────────────
const APP_ENV = process.env.APP_ENV;
if (APP_ENV !== "development") {
  console.error("❌ REFUSED: reset-dev.mjs will only run when APP_ENV=development.");
  console.error(`   Current APP_ENV: "${APP_ENV ?? "(not set)"}"`);
  console.error("   This script must never run against Demo or Live.");
  process.exit(1);
}

const DATABASE_URL = process.env.DEVELOPMENT_DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DEVELOPMENT_DATABASE_URL is required.");
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

async function run() {
  console.log("\n⚠  DEVELOPMENT DATABASE RESET\n");
  console.log("This will DELETE all user data (users, assessments, evidence,");
  console.log("probation records, financial progress) from the development database.");
  console.log("System config (career paths, roles, competencies) will be re-seeded.\n");

  const confirm = (await ask('Type "reset development" to confirm: ')).trim();
  rl.close();

  if (confirm !== "reset development") {
    console.log("Cancelled.");
    process.exit(0);
  }

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  console.log("\n🗑  Wiping user data...");
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

  console.log("🗑  Wiping system config (will be re-seeded)...");
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

  console.log("\n✅ Development database reset.");
  console.log("   Restart the API server — it will re-seed system config and demo users on startup.");
}

run().catch((err) => {
  console.error("❌ Reset failed:", err.message);
  process.exit(1);
});
