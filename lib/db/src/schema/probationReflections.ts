import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const probationReflectionsTable = pgTable("probation_reflections", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  reviewPeriod: text("review_period").notNull(),
  wentWell: text("went_well"),
  learned: text("learned"),
  moreSupport: text("more_support"),
  focusNext: text("focus_next"),
  confidence: text("confidence"),
  biggestAchievements: text("biggest_achievements"),
  mostProudOf: text("most_proud_of"),
  stillDevelop: text("still_develop"),
  readyToPass: text("ready_to_pass"),
  managerComment: text("manager_comment"),
  managerStatus: text("manager_status"),
  managerReviewedAt: timestamp("manager_reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ProbationReflection = typeof probationReflectionsTable.$inferSelect;
