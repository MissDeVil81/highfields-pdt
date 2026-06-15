import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { competenciesTable } from "./competencies";
import { rolesTable } from "./roles";
import { usersTable } from "./users";

export const evidenceTable = pgTable("evidence", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  competencyId: integer("competency_id").notNull().references(() => competenciesTable.id),
  roleId: integer("role_id").notNull().references(() => rolesTable.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  rating: text("rating", { enum: ["red", "amber", "green"] }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertEvidenceSchema = createInsertSchema(evidenceTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEvidence = z.infer<typeof insertEvidenceSchema>;
export type Evidence = typeof evidenceTable.$inferSelect;
