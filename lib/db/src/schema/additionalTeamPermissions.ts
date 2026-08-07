import { pgTable, serial, integer, text } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { teamsTable } from "./teams";

export const additionalTeamPermissionsTable = pgTable("additional_team_permissions", {
  id: serial("id").primaryKey(),
  ownerUserId: integer("owner_user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  teamId: integer("team_id")
    .notNull()
    .references(() => teamsTable.id, { onDelete: "cascade" }),
  permissionType: text("permission_type").notNull(), // "view" | "edit"
});

export type AdditionalTeamPermission = typeof additionalTeamPermissionsTable.$inferSelect;
