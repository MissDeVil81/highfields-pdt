/**
 * seed-config.mjs
 *
 * Idempotent seed for system-configuration data (career paths, probation
 * items, shared teams).  Safe to run against development or production.
 * Do NOT run against demo — demo has its own curated data set.
 *
 * Usage:
 *   APP_ENV=development DEVELOPMENT_DATABASE_URL=<url> node scripts/seed-config.mjs
 *   APP_ENV=production  PRODUCTION_DATABASE_URL=<url>  node scripts/seed-config.mjs
 */

import pg from "pg";

// ── Guard: refuse to run against demo ────────────────────────────────────────
const APP_ENV = process.env.APP_ENV;
if (!APP_ENV || !["development", "production"].includes(APP_ENV)) {
  if (APP_ENV === "demo") {
    console.error(
      "ERROR: Do not run seed-config against the demo environment. " +
        "Demo has its own curated data set. Use reset-demo.mjs instead.",
    );
  } else {
    console.error(
      `ERROR: APP_ENV must be "development" or "production". Got: ${JSON.stringify(APP_ENV)}`,
    );
  }
  process.exit(1);
}

// ── Strict URL — no DATABASE_URL fallback ─────────────────────────────────────
const SPECIFIC_KEY = APP_ENV === "production" ? "PRODUCTION_DATABASE_URL" : "DEVELOPMENT_DATABASE_URL";
const connectionString = process.env[SPECIFIC_KEY];

if (!connectionString) {
  console.error(
    `ERROR: ${SPECIFIC_KEY} is required when APP_ENV=${APP_ENV}. Set this secret before running.`,
  );
  process.exit(1);
}

const client = new pg.Client({ connectionString });

async function run() {
  await client.connect();
  console.log(`Connected to ${APP_ENV} database.`);

  try {
    await client.query("BEGIN");

    // ── Career Paths (id-based PK conflict is safe) ───────────────────────────
    await client.query(`
      INSERT INTO career_paths (id, name, description)
      VALUES
        (1, '360 Recruitment', 'Full 360 recruitment consultant career path covering candidate and client management'),
        (2, '180 Recruitment', 'Candidate-focused 180 recruitment career path')
      ON CONFLICT (id) DO NOTHING
    `);
    console.log("✓ career_paths seeded");

    // ── Roles note ────────────────────────────────────────────────────────────
    console.log("ℹ  Roles are managed by scripts/populate-job-specs.mjs — run that next.");

    // ── Probation Items (no unique constraint — use WHERE NOT EXISTS) ──────────
    const probationItems = [
      { section: "Objectives & Performance", sectionOrder: 1, itemText: "Meets agreed call/activity targets", itemOrder: 1, ratingType: "yes_no_progress" },
      { section: "Objectives & Performance", sectionOrder: 1, itemText: "Builds and maintains a strong candidate pipeline", itemOrder: 2, ratingType: "yes_no_progress" },
      { section: "Objectives & Performance", sectionOrder: 1, itemText: "Achieves first placement within probation period", itemOrder: 3, ratingType: "yes_no_progress" },
      { section: "Knowledge & Skills", sectionOrder: 2, itemText: "Demonstrates understanding of the recruitment process", itemOrder: 1, ratingType: "yes_no_progress" },
      { section: "Knowledge & Skills", sectionOrder: 2, itemText: "Completes all mandatory compliance and onboarding training", itemOrder: 2, ratingType: "yes_no_progress" },
      { section: "Knowledge & Skills", sectionOrder: 2, itemText: "Uses the CRM/ATS system effectively", itemOrder: 3, ratingType: "yes_no_progress" },
      { section: "Values & Behaviours", sectionOrder: 3, itemText: "Shows initiative and takes ownership of their desk", itemOrder: 1, ratingType: "values_rating" },
      { section: "Values & Behaviours", sectionOrder: 3, itemText: "Communicates proactively with manager and team", itemOrder: 2, ratingType: "values_rating" },
      { section: "Values & Behaviours", sectionOrder: 3, itemText: "Embodies company values in day-to-day work", itemOrder: 3, ratingType: "values_rating" },
    ];

    let probationInserted = 0;
    for (const item of probationItems) {
      const res = await client.query(
        `INSERT INTO probation_items (section, section_order, item_text, item_order, rating_type)
         SELECT $1, $2, $3, $4, $5
         WHERE NOT EXISTS (
           SELECT 1 FROM probation_items WHERE section = $1 AND item_text = $3
         )`,
        [item.section, item.sectionOrder, item.itemText, item.itemOrder, item.ratingType],
      );
      probationInserted += res.rowCount ?? 0;
    }
    console.log(`✓ probation_items seeded (${probationInserted} new rows inserted)`);

    // ── Shared Teams (no unique constraint — use WHERE NOT EXISTS) ────────────
    const standardTeams = ["Management", "Operations", "Sales"];
    let teamsInserted = 0;
    for (const name of standardTeams) {
      const res = await client.query(
        `INSERT INTO teams (name, status)
         SELECT $1, 'active'
         WHERE NOT EXISTS (SELECT 1 FROM teams WHERE name = $1)`,
        [name],
      );
      teamsInserted += res.rowCount ?? 0;
    }
    console.log(`✓ shared teams seeded (${teamsInserted} new rows inserted)`);

    await client.query("COMMIT");
    console.log("\n✅ seed-config complete.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("ERROR during seed, rolled back:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
