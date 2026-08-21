import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").unique(),
  clerkUserId: text("clerk_user_id").unique(),
  roles: text("roles").array().notNull().default(["employee"]),
  managerId: integer("manager_id"),
  department: text("department"),
  jobTitle: text("job_title"),
  startDate: text("start_date"),
  probationStatus: text("probation_status"),
  targetRoleId: integer("target_role_id"),
  isActive: text("is_active").notNull().default("active"),
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type User = typeof usersTable.$inferSelect;
