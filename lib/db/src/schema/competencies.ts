import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { rolesTable } from "./roles";

export const competenciesTable = pgTable("competencies", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id").notNull().references(() => rolesTable.id),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCompetencySchema = createInsertSchema(competenciesTable).omit({ id: true, createdAt: true });
export type InsertCompetency = z.infer<typeof insertCompetencySchema>;
export type Competency = typeof competenciesTable.$inferSelect;
