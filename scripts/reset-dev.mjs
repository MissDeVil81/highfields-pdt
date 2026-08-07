/**
 * reset-dev.mjs
 *
 * Wipes and reseeds the Development database with test users and scenarios.
 *
 * GUARD: This script REFUSES to run unless APP_ENV=development.
 *
 * Usage (from the Dev repl only):
 *   APP_ENV=development DEVELOPMENT_DATABASE_URL=<url> node scripts/reset-dev.mjs
 */

import pg from "pg";
import readline from "node:readline";

// ── Hard guard ────────────────────────────────────────────────────────────────
const APP_ENV = process.env.APP_ENV;
if (APP_ENV !== "development") {
  console.error(
    `ERROR: reset-dev.mjs must only run against APP_ENV=development. Got: ${JSON.stringify(APP_ENV)}\n` +
      "This guard exists to prevent accidental data loss in other environments.",
  );
  process.exit(1);
}

// ── Strict URL — no DATABASE_URL fallback ─────────────────────────────────────
const connectionString = process.env.DEVELOPMENT_DATABASE_URL;
if (!connectionString) {
  console.error(
    "ERROR: DEVELOPMENT_DATABASE_URL is required when APP_ENV=development. Set this secret before running.",
  );
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

async function run() {
  console.log("=== Dev Reset ===");
  console.log("This will DELETE all data from the Development database and reseed it with test data.\n");

  const confirm = await ask('Type "reset-dev" to confirm: ');
  rl.close();

  if (confirm.trim() !== "reset-dev") {
    console.log("Aborted.");
    process.exit(0);
  }

  const client = new pg.Client({ connectionString });
  await client.connect();
  console.log("\nConnected to development database. Resetting...");

  try {
    await client.query("BEGIN");

    const userDataTables = [
      "audit_log",
      "additional_user_permissions",
      "additional_team_permissions",
      "probation_action_evidence",
      "probation_actions",
      "probation_manager_reviews",
      "probation_reflections",
      "probation_assessments",
      "financial_progress",
      "assessments",
      "evidence",
      "user_teams",
      "users",
    ];

    for (const table of userDataTables) {
      await client.query(`DELETE FROM ${table}`);
      console.log(`  ✓ Cleared ${table}`);
    }

    const testUsers = [
      { name: "Dev Admin", email: "admin@dev.test", roles: ["admin"], jobTitle: "System Administrator", department: "Management", isActive: "active" },
      { name: "Alice Manager", email: "alice@dev.test", roles: ["manager"], jobTitle: "Senior Manager", department: "Sales", isActive: "active" },
      { name: "Bob Manager", email: "bob@dev.test", roles: ["manager"], jobTitle: "Manager", department: "Operations", isActive: "active" },
      { name: "Charlie Employee", email: "charlie@dev.test", roles: ["employee"], jobTitle: "Recruitment Consultant", department: "Sales", isActive: "active" },
      { name: "Diana Employee", email: "diana@dev.test", roles: ["employee"], jobTitle: "Junior Consultant", department: "Sales", isActive: "active", probationStatus: "in_progress" },
      { name: "Eve Employee", email: "eve@dev.test", roles: ["employee"], jobTitle: "Trainee Consultant", department: "Sales", isActive: "active", probationStatus: "in_progress" },
      { name: "Frank Employee", email: "frank@dev.test", roles: ["employee"], jobTitle: "Recruitment Consultant", department: "Operations", isActive: "active", probationStatus: "passed" },
      { name: "Grace Inactive", email: "grace@dev.test", roles: ["employee"], jobTitle: "Former Consultant", department: "Sales", isActive: "inactive" },
    ];

    const insertedUsers = [];
    for (const u of testUsers) {
      const r = await client.query(
        `INSERT INTO users (name, email, roles, job_title, department, is_active, probation_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [u.name, u.email, JSON.stringify(u.roles), u.jobTitle ?? null, u.department ?? null, u.isActive, u.probationStatus ?? null],
      );
      insertedUsers.push({ ...u, id: r.rows[0].id });
    }
    console.log(`  ✓ Created ${insertedUsers.length} test users`);

    const alice = insertedUsers.find((u) => u.name === "Alice Manager");
    const bob = insertedUsers.find((u) => u.name === "Bob Manager");
    for (const r of insertedUsers.filter((u) => ["Charlie Employee", "Diana Employee", "Eve Employee"].includes(u.name))) {
      await client.query("UPDATE users SET manager_id = $1 WHERE id = $2", [alice.id, r.id]);
    }
    for (const r of insertedUsers.filter((u) => u.name === "Frank Employee")) {
      await client.query("UPDATE users SET manager_id = $1 WHERE id = $2", [bob.id, r.id]);
    }
    console.log("  ✓ Manager relationships set");

    await client.query("COMMIT");
    console.log("\n✅ Dev reset complete.");
    for (const u of insertedUsers) {
      console.log(`  [${u.id}] ${u.name} <${u.email}> roles=${u.roles.join(",")} active=${u.isActive}`);
    }
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("ERROR during reset, rolled back:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
