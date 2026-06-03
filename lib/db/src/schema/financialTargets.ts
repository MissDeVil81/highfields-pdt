import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";
import { rolesTable } from "./roles";

export const financialTargetsTable = pgTable("financial_targets", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id").notNull().references(() => rolesTable.id),
  label: text("label").notNull(),
  targetAmount: integer("target_amount").notNull(),
  periodLabel: text("period_label").notNull(),
  optionGroup: integer("option_group"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export type FinancialTarget = typeof financialTargetsTable.$inferSelect;
