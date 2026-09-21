import {
  index,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const companyLearningEntriesTable = pgTable(
  "company_learning_entries",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    dateOfLearning: text("date_of_learning").default("").notNull(),
    trainer: text("trainer").default("").notNull(),
    description: text("description").default("").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
);

export const companyLearningRecipientsTable = pgTable(
  "company_learning_recipients",
  {
    companyLearningId: integer("company_learning_id")
      .notNull()
      .references(() => companyLearningEntriesTable.id, {
        onDelete: "cascade",
      }),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  table => [
    primaryKey({
      name: "company_learning_recipients_pkey",
      columns: [table.companyLearningId, table.userId],
    }),
    index("company_learning_recipients_user_id_idx").on(table.userId),
  ],
);

export type CompanyLearningEntry =
  typeof companyLearningEntriesTable.$inferSelect;
export type CompanyLearningRecipient =
  typeof companyLearningRecipientsTable.$inferSelect;