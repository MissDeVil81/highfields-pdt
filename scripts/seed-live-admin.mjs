#!/usr/bin/env node
/**
 * seed-live-admin.mjs
 *
 * Creates the initial admin user in the LIVE / PRODUCTION database.
 * Run this once after provisioning the live database and applying schema.
 *
 * Usage:
 *   DATABASE_URL=<production-connection-string> node scripts/seed-live-admin.mjs
 *
 * You will be prompted for the admin's name and email.
 * No personal data is hard-coded here — the admin is created fresh.
 */

import pg from "pg";
import readline from "readline";

const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL must be set (use the PRODUCTION_DATABASE_URL value).");
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

async function run() {
  console.log("\n🔐 Live Admin User Setup\n");
  console.log("This script creates the initial admin account in the live database.");
  console.log("No demo data will be inserted.\n");

  const name = (await ask("Admin full name: ")).trim();
  const email = (await ask("Admin email address: ")).trim().toLowerCase();
  const jobTitle = (await ask("Job title (optional, press Enter to skip): ")).trim() || null;

  rl.close();

  if (!name || !email) {
    console.error("❌ Name and email are required.");
    process.exit(1);
  }

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  // Check it doesn't already exist
  const existing = await client.query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rows.length > 0) {
    console.log(`⚠  A user with email ${email} already exists (id=${existing.rows[0].id}). No changes made.`);
    await client.end();
    return;
  }

  const result = await client.query(
    `INSERT INTO users (name, email, job_title, roles, is_active)
     VALUES ($1, $2, $3, ARRAY['admin'], 'active')
     RETURNING id`,
    [name, email, jobTitle],
  );

  console.log(`\n✅ Admin user created: ${name} <${email}> (id=${result.rows[0].id})`);
  console.log("   They can now log in to the admin dashboard.");

  await client.end();
}

run().catch((err) => {
  console.error("❌ Failed:", err.message);
  process.exit(1);
});
