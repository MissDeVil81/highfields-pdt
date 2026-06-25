import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { probationActionsTable } from "./probationActions";

export const probationActionEvidenceTable = pgTable("probation_action_evidence", {
  id: serial("id").primaryKey(),
  actionId: integer("action_id").notNull().references(() => probationActionsTable.id, { onDelete: "cascade" }),
  evidenceText: text("evidence_text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ProbationActionEvidence = typeof probationActionEvidenceTable.$inferSelect;
