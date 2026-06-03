import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { probationItemsTable } from "./probationItems";

export const probationAssessmentsTable = pgTable("probation_assessments", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  itemId: integer("item_id").notNull().references(() => probationItemsTable.id),
  rating: text("rating"),
  note: text("note"),
  managerRating: text("manager_rating"),
  managerComment: text("manager_comment"),
  managerReviewedAt: timestamp("manager_reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ProbationAssessment = typeof probationAssessmentsTable.$inferSelect;
