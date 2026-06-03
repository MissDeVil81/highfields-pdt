import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const probationManagerReviewsTable = pgTable("probation_manager_reviews", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  reviewPeriod: text("review_period").notNull(),
  goingWell: text("going_well"),
  developmentAreas: text("development_areas"),
  reviewStatus: text("review_status"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ProbationManagerReview = typeof probationManagerReviewsTable.$inferSelect;
