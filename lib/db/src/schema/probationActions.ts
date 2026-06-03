import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const probationActionsTable = pgTable("probation_actions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  reviewPeriod: text("review_period").notNull(),
  actionText: text("action_text").notNull(),
  status: text("status").notNull().default("not_started"),
  managerComment: text("manager_comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ProbationAction = typeof probationActionsTable.$inferSelect;
