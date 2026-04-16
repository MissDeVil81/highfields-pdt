import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { careerPathsTable } from "./careerPaths";

export const rolesTable = pgTable("roles", {
  id: serial("id").primaryKey(),
  careerPathId: integer("career_path_id").notNull().references(() => careerPathsTable.id),
  title: text("title").notNull(),
  level: integer("level").notNull(),
  jobSpec: text("job_spec").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRoleSchema = createInsertSchema(rolesTable).omit({ id: true, createdAt: true });
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Role = typeof rolesTable.$inferSelect;
