import { db, probationItemsTable } from "@workspace/db";
import { count } from "drizzle-orm";

const SECTIONS = [
  {
    section: "Skills",
    sectionOrder: 1,
    ratingType: "yes_no_progress",
    items: [
      "Can use core systems and tools required for the role at a basic, functional level",
      "Is able to log accurate, appropriate information on Bullhorn and other company systems",
      "Demonstrates basic role competence required to operate safely and effectively",
      "Follows agreed ways of working and Highfield / DataX / Data Exec way of working",
    ],
  },
  {
    section: "Behaviours",
    sectionOrder: 2,
    ratingType: "yes_no_progress",
    items: [
      "Can demonstrate professional conduct at work",
      "Displays a constructive and respectful attitude",
      "Engages appropriately with feedback and guidance",
      "Shows willingness to learn and improve",
    ],
  },
  {
    section: "Knowledge",
    sectionOrder: 3,
    ratingType: "yes_no_progress",
    items: [
      "Has a basic understanding of the role and the recruitment lifecycle",
      "Demonstrates developing awareness of their sector and market",
      "Understands what is expected of them in the role",
    ],
  },
  {
    section: "Activity",
    sectionOrder: 4,
    ratingType: "yes_no_progress",
    items: [
      "Activity levels broadly align to expectations for the stage of their role",
      "Demonstrates consistent effort and application",
      "Is engaging with required activity rather than avoiding it",
    ],
  },
  {
    section: "Financial Awareness",
    sectionOrder: 5,
    ratingType: "yes_no_progress",
    items: [
      "Understands how individual activity contributes to revenue",
      "Is developing commercial awareness appropriate to probation stage",
    ],
  },
  {
    section: "Behaviour and Conduct",
    sectionOrder: 6,
    ratingType: "yes_no_progress",
    items: [
      "Behaviours are aligned to company standards",
      "No conduct or behavioural concerns identified",
    ],
  },
  {
    section: "Values",
    sectionOrder: 7,
    ratingType: "values_rating",
    items: [
      "Driven",
      "Disciplined",
      "Competitive",
      "Committed",
      "Positive",
      "Resilient",
    ],
  },
];

async function seed() {
  const [{ value: existing }] = await db.select({ value: count() }).from(probationItemsTable);
  if (existing > 0) {
    console.log(`Probation items already seeded (${existing} rows). Skipping.`);
    process.exit(0);
  }

  const rows = SECTIONS.flatMap(({ section, sectionOrder, ratingType, items }) =>
    items.map((itemText, idx) => ({
      section,
      sectionOrder,
      itemText,
      itemOrder: idx + 1,
      ratingType,
    }))
  );

  await db.insert(probationItemsTable).values(rows);
  console.log(`Seeded ${rows.length} probation items across ${SECTIONS.length} sections.`);
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
