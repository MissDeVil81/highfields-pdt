import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

function isCalendarDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Accepted learning-date values match the dashboard filters:
 * ISO YYYY-MM-DD (including timestamps beginning with it) and UK
 * D/M/YYYY or D/M/YY, where two-digit years mean 2000-2099.
 */
export function isValidLearningDate(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
  if (isoMatch) {
    return isCalendarDate(
      Number(isoMatch[1]),
      Number(isoMatch[2]),
      Number(isoMatch[3]),
    );
  }

  const ukMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (!ukMatch) return false;

  const year =
    ukMatch[3].length === 2
      ? 2000 + Number(ukMatch[3])
      : Number(ukMatch[3]);
  return isCalendarDate(year, Number(ukMatch[2]), Number(ukMatch[1]));
}

export const invalidLearningDateMessage =
  "Use a valid ISO date or UK date (for example, 2026-09-21 or 21/09/2026).";

export const learningDateSchema = z
  .string()
  .trim()
  .min(1, "Learning date is required.")
  .refine(isValidLearningDate, invalidLearningDateMessage);

export const optionalLearningDateSchema = z
  .string()
  .trim()
  .refine(
    value => value === "" || isValidLearningDate(value),
    invalidLearningDateMessage,
  );

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
}).extend({
  dateOfLearning: learningDateSchema,
});

export type InsertLearningLogEntry = z.infer<typeof insertLearningLogEntrySchema>;
export type LearningLogEntry = typeof learningLogEntriesTable.$inferSelect;
