/**
 * reset-demo.mjs
 *
 * Wipes user-generated data from the Demo database and reseeds it with
 * a clean demonstration data set.  Safe to run repeatedly.
 *
 * GUARD: This script REFUSES to run unless APP_ENV=demo.
 *
 * Usage (from the Demo repl only):
 *   APP_ENV=demo DEMO_DATABASE_URL=<url> node scripts/reset-demo.mjs
 */

import pg from "pg";
import readline from "node:readline";

// ── Hard guard ────────────────────────────────────────────────────────────────
const APP_ENV = process.env.APP_ENV;
if (APP_ENV !== "demo") {
  console.error(
    `ERROR: reset-demo.mjs must only run against APP_ENV=demo. Got: ${JSON.stringify(APP_ENV)}\n` +
      "This guard exists to prevent accidental data loss in other environments.",
  );
  process.exit(1);
}

// ── Strict URL — no DATABASE_URL fallback ─────────────────────────────────────
const connectionString = process.env.DEMO_DATABASE_URL;
if (!connectionString) {
  console.error(
    "ERROR: DEMO_DATABASE_URL is required when APP_ENV=demo. Set this secret before running.",
  );
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

async function run() {
  console.log("=== Demo Reset ===");
  console.log(
    "This will DELETE all user-generated data from the Demo database and reseed it.\n",
  );
  const confirm = await ask('Type "reset-demo" to confirm: ');
  rl.close();

  if (confirm.trim() !== "reset-demo") {
    console.log("Aborted.");
    process.exit(0);
  }

  const client = new pg.Client({ connectionString });
  await client.connect();
  console.log("\nConnected to demo database. Resetting...");

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

    const demoUsers = [
      { name: "Sarah Johnson", email: "sarah.johnson@demo.example.com", roles: ["admin"], jobTitle: "Head of Recruitment", department: "Management", isActive: "active" },
      { name: "James Mitchell", email: "james.mitchell@demo.example.com", roles: ["manager"], jobTitle: "Senior Manager", department: "Sales", isActive: "active" },
      { name: "Emma Clarke", email: "emma.clarke@demo.example.com", roles: ["employee"], jobTitle: "Recruitment Consultant", department: "Sales", isActive: "active" },
      { name: "Oliver Davies", email: "oliver.davies@demo.example.com", roles: ["employee"], jobTitle: "Junior Consultant", department: "Sales", isActive: "active", probationStatus: "in_progress" },
      { name: "Priya Patel", email: "priya.patel@demo.example.com", roles: ["employee"], jobTitle: "Trainee Consultant", department: "Sales", isActive: "active", probationStatus: "in_progress" },
    ];

    const insertedUsers = [];
    for (const u of demoUsers) {
      const r = await client.query(
        `INSERT INTO users (name, email, roles, job_title, department, is_active, probation_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [u.name, u.email, JSON.stringify(u.roles), u.jobTitle ?? null, u.department ?? null, u.isActive, u.probationStatus ?? null],
      );
      insertedUsers.push({ ...u, id: r.rows[0].id });
    }
    console.log(`  ✓ Created ${insertedUsers.length} demo users`);

    const james = insertedUsers.find((u) => u.name === "James Mitchell");
    for (const r of insertedUsers.filter((u) => ["Emma Clarke", "Oliver Davies", "Priya Patel"].includes(u.name))) {
      await client.query("UPDATE users SET manager_id = $1 WHERE id = $2", [james.id, r.id]);
    }
    console.log("  ✓ Manager relationships set");

    await client.query("COMMIT");
    console.log("\n✅ Demo reset complete. Demo database is ready for demonstrations.");
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
