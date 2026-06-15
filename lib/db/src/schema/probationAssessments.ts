import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { probationItemsTable } from "./probationItems";
import { usersTable } from "./users";

export const probationAssessmentsTable = pgTable("probation_assessments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  itemId: integer("item_id").notNull().references(() => probationItemsTable.id),
  reviewPeriod: text("review_period").notNull().default("month1"),
  rating: text("rating"),
  note: text("note"),
  managerRating: text("manager_rating"),
  managerComment: text("manager_comment"),
  managerReviewedAt: timestamp("manager_reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ProbationAssessment = typeof probationAssessmentsTable.$inferSelect;
