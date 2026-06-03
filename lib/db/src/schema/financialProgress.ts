import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { financialTargetsTable } from "./financialTargets";
import { rolesTable } from "./roles";

export const financialProgressTable = pgTable("financial_progress", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  targetId: integer("target_id").notNull().references(() => financialTargetsTable.id),
  roleId: integer("role_id").notNull().references(() => rolesTable.id),
  currentAmount: integer("current_amount").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type FinancialProgress = typeof financialProgressTable.$inferSelect;
