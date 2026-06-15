import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const probationManagerReviewsTable = pgTable("probation_manager_reviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  reviewPeriod: text("review_period").notNull(),
  goingWell: text("going_well"),
  developmentAreas: text("development_areas"),
  reviewStatus: text("review_status"),
  reviewDate: text("review_date"),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ProbationManagerReview = typeof probationManagerReviewsTable.$inferSelect;
