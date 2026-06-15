import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { competenciesTable } from "./competencies";
import { rolesTable } from "./roles";
import { usersTable } from "./users";

export const assessmentsTable = pgTable("assessments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  competencyId: integer("competency_id").notNull().references(() => competenciesTable.id),
  roleId: integer("role_id").notNull().references(() => rolesTable.id),
  rating: text("rating", { enum: ["red", "amber", "green"] }).notNull(),
  notes: text("notes"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAssessmentSchema = createInsertSchema(assessmentsTable).omit({ id: true, updatedAt: true });
export type InsertAssessment = z.infer<typeof insertAssessmentSchema>;
export type Assessment = typeof assessmentsTable.$inferSelect;
