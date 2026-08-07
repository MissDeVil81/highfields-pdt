/**
 * seed-live-admin.mjs
 *
 * Creates the initial admin user record for the Live environment.
 * Run this once after schema migration on a fresh Live database.
 *
 * Usage:
 *   APP_ENV=production PRODUCTION_DATABASE_URL=<url> node scripts/seed-live-admin.mjs
 */

import pg from "pg";
import readline from "node:readline";

// ── Guard: only runs against production ──────────────────────────────────────
const APP_ENV = process.env.APP_ENV;
if (APP_ENV !== "production") {
  console.error(
    `ERROR: seed-live-admin must only run against APP_ENV=production. Got: ${JSON.stringify(APP_ENV)}`,
  );
  process.exit(1);
}

// ── Strict URL — no DATABASE_URL fallback ─────────────────────────────────────
const connectionString = process.env.PRODUCTION_DATABASE_URL;
if (!connectionString) {
  console.error(
    "ERROR: PRODUCTION_DATABASE_URL is required when APP_ENV=production. Set this secret before running.",
  );
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

async function run() {
  console.log("=== Live Admin User Seed ===");
  console.log("This will create the initial admin user in the Live database.\n");

  const name = (await ask("Admin full name: ")).trim();
  const email = (await ask("Admin email address: ")).trim().toLowerCase();

  if (!name || !email || !email.includes("@")) {
    console.error("ERROR: Valid name and email are required.");
    rl.close();
    process.exit(1);
  }

  rl.close();

  const client = new pg.Client({ connectionString });
  await client.connect();
  console.log("\nConnected to production database.");

  try {
    const existing = await client.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      console.log(`\nUser with email ${email} already exists (id=${existing.rows[0].id}). No changes made.`);
      return;
    }

    const result = await client.query(
      `INSERT INTO users (name, email, roles, is_active) VALUES ($1, $2, $3, $4) RETURNING id`,
      [name, email, JSON.stringify(["admin"]), "active"],
    );

    console.log(`\n✅ Admin user created: id=${result.rows[0].id}, name="${name}", email="${email}"`);
    console.log("The admin can now sign in via the Admin Dashboard by selecting their name.");
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
