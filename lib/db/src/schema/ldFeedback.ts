import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const ldFeedbackTable = pgTable("ld_feedback", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  authorName: text("author_name").default("").notNull(),
  content: text("content").default("").notNull(),
  feedbackDate: text("feedback_date").default("").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  title: text("title").default("").notNull(),
  sendToManager: boolean("send_to_manager").default(false).notNull(),
  sendToIndividual: boolean("send_to_individual").default(false).notNull(),
});

export type LdFeedback = typeof ldFeedbackTable.$inferSelect;