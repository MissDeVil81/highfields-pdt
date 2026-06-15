import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { financialTargetsTable } from "./financialTargets";
import { rolesTable } from "./roles";
import { usersTable } from "./users";

export const financialProgressTable = pgTable("financial_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  targetId: integer("target_id").notNull().references(() => financialTargetsTable.id),
  roleId: integer("role_id").notNull().references(() => rolesTable.id),
  currentAmount: integer("current_amount").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type FinancialProgress = typeof financialProgressTable.$inferSelect;
