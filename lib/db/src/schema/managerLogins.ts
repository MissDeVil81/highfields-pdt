import { pgTable, integer, timestamp } from "drizzle-orm/pg-core";

export const managerLoginsTable = pgTable("manager_logins", {
  userId: integer("user_id").primaryKey(),
  lastLoginAt: timestamp("last_login_at").defaultNow().notNull(),
  prevLoginAt: timestamp("prev_login_at"),
});

export const managerViewedEntriesTable = pgTable("manager_viewed_entries", {
  managerId: integer("manager_id").notNull(),
  entryId: integer("entry_id").notNull(),
  viewedAt: timestamp("viewed_at").defaultNow().notNull(),
});

export type ManagerLogin = typeof managerLoginsTable.$inferSelect;
export type ManagerViewedEntry = typeof managerViewedEntriesTable.$inferSelect;
