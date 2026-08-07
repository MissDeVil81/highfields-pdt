import { pgTable, serial, integer, text } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const additionalUserPermissionsTable = pgTable("additional_user_permissions", {
  id: serial("id").primaryKey(),
  ownerUserId: integer("owner_user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  targetUserId: integer("target_user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  permissionType: text("permission_type").notNull(), // "view" | "edit"
});

export type AdditionalUserPermission = typeof additionalUserPermissionsTable.$inferSelect;
