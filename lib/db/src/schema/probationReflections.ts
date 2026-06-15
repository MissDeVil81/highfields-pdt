import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const probationReflectionsTable = pgTable("probation_reflections", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
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
