import { Router } from "express";
import { db, RESOLVED_APP_ENV, usersTable, userTeamsTable, teamsTable, additionalUserPermissionsTable, additionalTeamPermissionsTable, auditLogTable } from "@workspace/db";
import { eq, and, sql, inArray, ne } from "drizzle-orm";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { clerkClient } from "@clerk/express";
import { isAdmin, wouldCreateCycle, buildAccessSummary } from "../lib/permissions";
import { canAccessProductionUser, hasAnyRole } from "../middlewares/productionAuth";

const router = Router();
const isProduction = () => RESOLVED_APP_ENV === "production";

function generateTemporaryPassword(): string {
  const pick = (characters: string) => characters[randomBytes(1)[0] % characters.length];
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%&*";
  const all = `${upper}${lower}${digits}${symbols}`;
  return [
    pick(upper),
    pick(lower),
    pick(digits),
    pick(symbols),
    ...Array.from({ length: 14 }, () => pick(all)),
  ].sort(() => randomBytes(1)[0] - 128).join("");
}

function currentAdmin(req: Parameters<typeof router.get>[1] extends (req: infer T, ...args: never[]) => unknown ? T : never): boolean {
  return !isProduction() || Boolean(req.appUser && hasAnyRole(req.appUser, ["admin"]));
}

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  roles: z.array(z.string()).optional().default(["employee"]),
  managerId: z.number().int().optional(),
  department: z.string().optional(),
  jobTitle: z.string().optional(),
  startDate: z.string().optional(),
  probationStatus: z.string().optional(),
  targetRoleId: z.number().int().optional(),
  isActive: z.string().optional().default("active"),
  teamIds: z.array(z.number().int()).optional().default([]),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  roles: z.array(z.string()).optional(),
  managerId: z.number().int().nullable().optional(),
  department: z.string().optional(),
  jobTitle: z.string().optional(),
  startDate: z.string().optional(),
  probationStatus: z.string().nullable().optional(),
  targetRoleId: z.number().int().nullable().optional(),
  isActive: z.string().optional(),
  teamIds: z.array(z.number().int()).optional(),
});

const permissionsUpdateSchema = z.object({
  additionalViewUsers: z.array(z.number().int()).optional().default([]),
  additionalEditUsers: z.array(z.number().int()).optional().default([]),
  additionalViewTeams: z.array(z.number().int()).optional().default([]),
  additionalEditTeams: z.array(z.number().int()).optional().default([]),
});

/** Attach team info to a list of users */
async function enrichWithTeams(users: (typeof usersTable.$inferSelect)[]) {
  if (users.length === 0) return users.map((u) => ({ ...u, teamIds: [] as number[], teamNames: [] as string[] }));

  const ids = users.map((u) => u.id);
  const memberships = await db
    .select()
    .from(userTeamsTable)
    .where(inArray(userTeamsTable.userId, ids));

  const teamIds = [...new Set(memberships.map((m) => m.teamId))];
  const teams = teamIds.length > 0
    ? await db.select().from(teamsTable).where(inArray(teamsTable.id, teamIds))
    : [];
  const teamMap = new Map(teams.map((t) => [t.id, t.name]));

  const userTeamMap = new Map<number, { ids: number[]; names: string[] }>();
  for (const m of memberships) {
    if (!userTeamMap.has(m.userId)) userTeamMap.set(m.userId, { ids: [], names: [] });
    const entry = userTeamMap.get(m.userId)!;
    entry.ids.push(m.teamId);
    const name = teamMap.get(m.teamId);
    if (name) entry.names.push(name);
  }

  return users.map((u) => ({
    ...u,
    teamIds: userTeamMap.get(u.id)?.ids ?? [],
    teamNames: userTeamMap.get(u.id)?.names ?? [],
  }));
}

/** Update team memberships for a user */
async function syncTeams(userId: number, teamIds: number[]) {
  await db.delete(userTeamsTable).where(eq(userTeamsTable.userId, userId));
  if (teamIds.length > 0) {
    await db
      .insert(userTeamsTable)
      .values(teamIds.map((teamId) => ({ userId, teamId })))
      .onConflictDoNothing();
  }
}

async function issueTemporaryPassword(user: typeof usersTable.$inferSelect): Promise<string> {
  if (!user.email) {
    throw new Error("A work email address is required before issuing a login.");
  }

  const temporaryPassword = generateTemporaryPassword();
  let clerkUserId = user.clerkUserId;

  if (clerkUserId) {
    await clerkClient.users.updateUser(clerkUserId, {
      password: temporaryPassword,
      signOutOfOtherSessions: true,
    });
  } else {
    const [firstName, ...lastName] = user.name.trim().split(/\s+/);
    const clerkUser = await clerkClient.users.createUser({
      emailAddress: [user.email],
      password: temporaryPassword,
      firstName,
      lastName: lastName.join(" ") || undefined,
      skipLegalChecks: true,
    });
    clerkUserId = clerkUser.id;
  }

  await db
    .update(usersTable)
    .set({ clerkUserId, mustChangePassword: true, updatedAt: new Date() })
    .where(eq(usersTable.id, user.id));

  return temporaryPassword;
}

// GET /users
router.get("/", async (req, res) => {
  const managerId = req.query.managerId ? Number(req.query.managerId) : undefined;
  const role = req.query.role as string | undefined;
  const teamId = req.query.teamId ? Number(req.query.teamId) : undefined;
  const status = req.query.status as string | undefined;

  const conditions = [];
  if (managerId !== undefined) conditions.push(eq(usersTable.managerId, managerId));
  if (role) conditions.push(sql`${usersTable.roles} @> ARRAY[${role}]::text[]`);
  if (status) conditions.push(eq(usersTable.isActive, status));

  let users = conditions.length > 0
    ? await db.select().from(usersTable).where(and(...conditions))
    : await db.select().from(usersTable);

  // Filter by team if requested
  if (teamId !== undefined) {
    const memberships = await db.select().from(userTeamsTable).where(eq(userTeamsTable.teamId, teamId));
    const memberIds = new Set(memberships.map((m) => m.userId));
    users = users.filter((u) => memberIds.has(u.id));
  }

  if (isProduction() && !currentAdmin(req)) {
    const actor = req.appUser!;
    users = users.filter((user) =>
      user.id === actor.id ||
      (hasAnyRole(actor, ["manager", "director", "ld"]) && user.managerId === actor.id),
    );
  }

  const enriched = await enrichWithTeams(users);
  res.json(enriched);
});

// POST /users
router.post("/", async (req, res) => {
  if (!currentAdmin(req)) {
    res.status(403).json({ error: "Administrator access is required to create users." });
    return;
  }
  const result = createSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.message });

  const { teamIds, ...userData } = result.data;
  const email = userData.email?.trim().toLowerCase();
  if (isProduction() && !email) {
    return res.status(400).json({ error: "A work email address is required to issue a live login." });
  }

  const [created] = await db.insert(usersTable).values({ ...userData, email }).returning();

  if (teamIds && teamIds.length > 0) {
    await syncTeams(created.id, teamIds);
  }

  const adminId = req.appUser?.id ?? Number(req.headers["x-requesting-user-id"]);
  if (Number.isInteger(adminId)) {
    await db.insert(auditLogTable).values({
      adminUserId: adminId,
      affectedUserId: created.id,
      action: "user_created",
      newValue: created.name,
    });
  }

  try {
    const temporaryPassword = isProduction() ? await issueTemporaryPassword(created) : undefined;
    const [provisioned] = await db.select().from(usersTable).where(eq(usersTable.id, created.id));
    const enriched = await enrichWithTeams([provisioned ?? created]);
    return res.status(201).json({ ...enriched[0], temporaryPassword });
  } catch (error) {
    await db.delete(usersTable).where(eq(usersTable.id, created.id));
    req.log?.error({ err: error, userId: created.id }, "Unable to issue a temporary password for new user");
    return res.status(502).json({ error: "The user could not be provisioned with a login. No user was created." });
  }
});

// GET /users/:id
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) return res.status(404).json({ error: "Not found" });
  if (!(await canAccessProductionUser(req, id))) {
    res.status(403).json({ error: "You do not have permission to view this user." });
    return;
  }

  const enriched = await enrichWithTeams([user]);
  return res.json(enriched[0]);
});

// PUT /users/:id
router.put("/:id", async (req, res) => {
  if (!currentAdmin(req)) {
    res.status(403).json({ error: "Administrator access is required to update users." });
    return;
  }
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const result = updateSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.message });

  const { teamIds, ...updateData } = result.data;

  // Circular hierarchy check
  if (updateData.managerId != null) {
    if (updateData.managerId === id) {
      return res.status(400).json({ error: "A user cannot report to themselves" });
    }
    const allUsers = await db.select().from(usersTable);
    if (wouldCreateCycle(id, updateData.managerId, allUsers)) {
      return res.status(400).json({
        error: "This would create a circular reporting structure. Check the existing hierarchy.",
      });
    }
  }

  // Fetch existing for audit
  const [before] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!before) return res.status(404).json({ error: "Not found" });

  const [updated] = await db
    .update(usersTable)
    .set({ ...updateData, updatedAt: new Date() })
    .where(eq(usersTable.id, id))
    .returning();

  if (!updated) return res.status(404).json({ error: "Not found" });

  // Sync teams if provided
  if (teamIds !== undefined) {
    await syncTeams(id, teamIds);
  }

  // Audit log
  const adminId = req.appUser?.id ?? Number(req.headers["x-requesting-user-id"]);
  if (Number.isInteger(adminId)) {

      if (before.roles.join(",") !== (updateData.roles ?? before.roles).join(",")) {
        await db.insert(auditLogTable).values({
          adminUserId: adminId,
          affectedUserId: id,
          action: "user_role_changed",
          previousValue: before.roles.join(", "),
          newValue: (updateData.roles ?? before.roles).join(", "),
        });
      }

      if (updateData.managerId !== undefined && before.managerId !== updateData.managerId) {
        await db.insert(auditLogTable).values({
          adminUserId: adminId,
          affectedUserId: id,
          action: "reporting_manager_changed",
          previousValue: before.managerId?.toString() ?? "none",
          newValue: updateData.managerId?.toString() ?? "none",
        });
      }

      if (updateData.isActive !== undefined && before.isActive !== updateData.isActive) {
        await db.insert(auditLogTable).values({
          adminUserId: adminId,
          affectedUserId: id,
          action: updateData.isActive === "active" ? "user_activated" : "user_deactivated",
          previousValue: before.isActive,
          newValue: updateData.isActive,
        });
      }
  }

  const enriched = await enrichWithTeams([updated]);
  return res.json(enriched[0]);
});

// DELETE /users/:id
router.delete("/:id", async (req, res) => {
  if (!currentAdmin(req)) {
    res.status(403).json({ error: "Administrator access is required to delete users." });
    return;
  }
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  await db.delete(usersTable).where(eq(usersTable.id, id));
  return res.status(204).send();
});

// POST /users/:id/reset-password
router.post("/:id/reset-password", async (req, res) => {
  if (!currentAdmin(req)) {
    return res.status(403).json({ error: "Administrator access is required to reset passwords." });
  }
  if (!isProduction()) {
    return res.status(404).json({ error: "Password resets are only available for live accounts." });
  }

  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) return res.status(404).json({ error: "Not found" });
  if (!user.clerkUserId) {
    return res.status(400).json({ error: "This user does not have an issued login yet." });
  }

  try {
    const temporaryPassword = await issueTemporaryPassword(user);
    const adminId = req.appUser?.id ?? Number(req.headers["x-requesting-user-id"]);
    if (Number.isInteger(adminId)) {
      await db.insert(auditLogTable).values({
        adminUserId: adminId,
        affectedUserId: id,
        action: "temporary_password_issued",
        newValue: "Password reset issued",
      });
    }
    return res.json({ userId: id, temporaryPassword });
  } catch (error) {
    req.log?.error({ err: error, userId: id }, "Unable to reset user password");
    return res.status(502).json({ error: "The password could not be reset. Please try again." });
  }
});

// GET /users/:id/permissions
router.get("/:id/permissions", async (req, res) => {
  if (!currentAdmin(req)) {
    res.status(403).json({ error: "Administrator access is required." });
    return;
  }
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [userPerms, teamPerms] = await Promise.all([
    db.select().from(additionalUserPermissionsTable).where(eq(additionalUserPermissionsTable.ownerUserId, id)),
    db.select().from(additionalTeamPermissionsTable).where(eq(additionalTeamPermissionsTable.ownerUserId, id)),
  ]);

  return res.json({ userPermissions: userPerms, teamPermissions: teamPerms });
});

// PUT /users/:id/permissions
router.put("/:id/permissions", async (req, res) => {
  const adminId = req.appUser?.id ?? Number(req.headers["x-requesting-user-id"]);
  if (!Number.isInteger(adminId)) return res.status(401).json({ error: "Administrator identity is required" });

  const [adminUser] = await db.select().from(usersTable).where(eq(usersTable.id, adminId));
  if (!adminUser || !isAdmin(adminUser)) return res.status(403).json({ error: "Admin access required" });

  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const result = permissionsUpdateSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.message });

  const { additionalViewUsers, additionalEditUsers, additionalViewTeams, additionalEditTeams } = result.data;

  // Get existing for audit
  const [existingUserPerms, existingTeamPerms] = await Promise.all([
    db.select().from(additionalUserPermissionsTable).where(eq(additionalUserPermissionsTable.ownerUserId, id)),
    db.select().from(additionalTeamPermissionsTable).where(eq(additionalTeamPermissionsTable.ownerUserId, id)),
  ]);

  // Replace all user permissions
  await db.delete(additionalUserPermissionsTable).where(eq(additionalUserPermissionsTable.ownerUserId, id));

  const newUserPerms = [
    ...additionalViewUsers.map((targetUserId) => ({ ownerUserId: id, targetUserId, permissionType: "view" as const })),
    ...additionalEditUsers.map((targetUserId) => ({ ownerUserId: id, targetUserId, permissionType: "edit" as const })),
  ];
  if (newUserPerms.length > 0) {
    await db.insert(additionalUserPermissionsTable).values(newUserPerms);
  }

  // Replace all team permissions
  await db.delete(additionalTeamPermissionsTable).where(eq(additionalTeamPermissionsTable.ownerUserId, id));

  const newTeamPerms = [
    ...additionalViewTeams.map((teamId) => ({ ownerUserId: id, teamId, permissionType: "view" as const })),
    ...additionalEditTeams.map((teamId) => ({ ownerUserId: id, teamId, permissionType: "edit" as const })),
  ];
  if (newTeamPerms.length > 0) {
    await db.insert(additionalTeamPermissionsTable).values(newTeamPerms);
  }

  // Audit
  const prevStr = JSON.stringify({ users: existingUserPerms, teams: existingTeamPerms });
  const newStr = JSON.stringify({ users: newUserPerms, teams: newTeamPerms });
  if (prevStr !== newStr) {
    await db.insert(auditLogTable).values({
      adminUserId: adminId,
      affectedUserId: id,
      action: "additional_permissions_changed",
      previousValue: prevStr,
      newValue: newStr,
    });
  }

  return res.json({ ok: true });
});

// GET /users/:id/access-summary
router.get("/:id/access-summary", async (req, res) => {
  if (!currentAdmin(req)) {
    res.status(403).json({ error: "Administrator access is required." });
    return;
  }
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [allUsers, additionalUserPerms, additionalTeamPerms, allUserTeams, allTeams] = await Promise.all([
    db.select().from(usersTable),
    db.select().from(additionalUserPermissionsTable),
    db.select().from(additionalTeamPermissionsTable),
    db.select().from(userTeamsTable),
    db.select().from(teamsTable),
  ]);

  const teamsMap = new Map(allTeams.map((t) => [t.id, { name: t.name }]));

  const summary = buildAccessSummary(id, allUsers, additionalUserPerms, additionalTeamPerms, allUserTeams, teamsMap);
  return res.json(summary);
});

export default router;
