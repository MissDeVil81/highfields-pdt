import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const learningLogEntriesTable = pgTable("learning_log_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  dateOfLearning: text("date_of_learning").notNull(),
  training: text("training").notNull(),
  deliveredBy: text("delivered_by").notNull(),
  whatDidILearn: text("what_did_i_learn").notNull(),
  furtherTrainingNeeded: text("further_training_needed").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertLearningLogEntrySchema = createInsertSchema(learningLogEntriesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLearningLogEntry = z.infer<typeof insertLearningLogEntrySchema>;
export type LearningLogEntry = typeof learningLogEntriesTable.$inferSelect;
