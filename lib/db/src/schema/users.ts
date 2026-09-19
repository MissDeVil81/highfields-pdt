import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").unique(),
  roles: text("roles").array().notNull().default(["employee"]),
  managerId: integer("manager_id"),
  department: text("department"),
  jobTitle: text("job_title"),
  recruitmentType: text("recruitment_type"),
  startDate: text("start_date"),
  probationStatus: text("probation_status"),
  targetRoleId: integer("target_role_id"),
  isActive: text("is_active").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type User = typeof usersTable.$inferSelect;
