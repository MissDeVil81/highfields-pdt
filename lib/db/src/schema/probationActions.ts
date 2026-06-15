import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const probationActionsTable = pgTable("probation_actions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  reviewPeriod: text("review_period").notNull(),
  actionText: text("action_text").notNull(),
  status: text("status").notNull().default("not_started"),
  managerComment: text("manager_comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ProbationAction = typeof probationActionsTable.$inferSelect;
