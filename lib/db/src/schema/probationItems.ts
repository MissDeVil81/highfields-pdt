import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";

export const probationItemsTable = pgTable("probation_items", {
  id: serial("id").primaryKey(),
  section: text("section").notNull(),
  sectionOrder: integer("section_order").notNull(),
  itemText: text("item_text").notNull(),
  itemOrder: integer("item_order").notNull(),
  ratingType: text("rating_type").notNull(), // "yes_no_progress" | "values_rating"
});

export type ProbationItem = typeof probationItemsTable.$inferSelect;
