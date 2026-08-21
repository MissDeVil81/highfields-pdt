import { Router } from "express";
import { db, teamsTable, userTeamsTable, usersTable, auditLogTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { isAdmin } from "../lib/permissions";

const router = Router();

const createSchema = z.object({
  name: z.string().min(1),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(["active", "archived"]).optional(),
});

// Helper: get requesting admin user
async function getRequestingAdmin(req: any, res: any): Promise<typeof usersTable.$inferSelect | null> {
  if (req.appUser) {
    if (!isAdmin(req.appUser)) {
      res.status(403).json({ error: "Admin access required" });
      return null;
    }
    return req.appUser;
  }
  const rawId = req.headers["x-requesting-user-id"] ?? req.query.requestingUserId;
  if (!rawId) {
    res.status(401).json({ error: "x-requesting-user-id header is required" });
    return null;
  }
  const id = Number(rawId);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid requesting user id" });
    return null;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) {
    res.status(401).json({ error: "Requesting user not found" });
    return null;
  }
  if (!isAdmin(user)) {
    res.status(403).json({ error: "Admin access required" });
    return null;
  }
  return user;
}

// GET /teams
router.get("/", async (req, res) => {
  const includeArchived = req.query.includeArchived === "true";
  const teams = includeArchived
    ? await db.select().from(teamsTable)
    : await db.select().from(teamsTable).where(eq(teamsTable.status, "active"));
  return res.json(teams);
});

// POST /teams
router.post("/", async (req, res) => {
  const admin = await getRequestingAdmin(req, res);
  if (!admin) return;

  const result = createSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.message });

  const [created] = await db.insert(teamsTable).values(result.data).returning();

  await db.insert(auditLogTable).values({
    adminUserId: admin.id,
    action: "team_created",
    newValue: created.name,
  });

  return res.status(201).json(created);
});

// GET /teams/:id
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, id));
  if (!team) return res.status(404).json({ error: "Not found" });
  return res.json(team);
});

// PUT /teams/:id
router.put("/:id", async (req, res) => {
  const admin = await getRequestingAdmin(req, res);
  if (!admin) return;

  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const result = updateSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.message });

  const [before] = await db.select().from(teamsTable).where(eq(teamsTable.id, id));
  if (!before) return res.status(404).json({ error: "Not found" });

  const [updated] = await db
    .update(teamsTable)
    .set({ ...result.data, updatedAt: new Date() })
    .where(eq(teamsTable.id, id))
    .returning();

  if (before.status !== updated.status) {
    await db.insert(auditLogTable).values({
      adminUserId: admin.id,
      action: "team_status_changed",
      previousValue: before.status,
      newValue: updated.status,
    });
  }

  return res.json(updated);
});

// DELETE /teams/:id (soft archive)
router.delete("/:id", async (req, res) => {
  const admin = await getRequestingAdmin(req, res);
  if (!admin) return;

  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [team] = await db
    .update(teamsTable)
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(teamsTable.id, id))
    .returning();

  if (!team) return res.status(404).json({ error: "Not found" });

  await db.insert(auditLogTable).values({
    adminUserId: admin.id,
    action: "team_archived",
    previousValue: team.name,
  });

  return res.status(204).send();
});

// GET /teams/:id/members
router.get("/:id/members", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const memberships = await db.select().from(userTeamsTable).where(eq(userTeamsTable.teamId, id));
  if (memberships.length === 0) return res.json([]);

  const memberIds = memberships.map((m) => m.userId);
  const members = await db.select().from(usersTable).where(inArray(usersTable.id, memberIds));
  return res.json(members);
});

// POST /teams/:id/members
router.post("/:id/members", async (req, res) => {
  const admin = await getRequestingAdmin(req, res);
  if (!admin) return;

  const teamId = Number(req.params.id);
  if (isNaN(teamId)) return res.status(400).json({ error: "Invalid team id" });

  const { userId } = z.object({ userId: z.number().int() }).parse(req.body);

  // Check team exists
  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, teamId));
  if (!team) return res.status(404).json({ error: "Team not found" });

  // Check user exists
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) return res.status(404).json({ error: "User not found" });

  // Upsert (ignore if already a member)
  await db
    .insert(userTeamsTable)
    .values({ userId, teamId })
    .onConflictDoNothing();

  await db.insert(auditLogTable).values({
    adminUserId: admin.id,
    affectedUserId: userId,
    action: "team_membership_added",
    newValue: team.name,
  });

  return res.status(201).json({ ok: true });
});

// DELETE /teams/:id/members/:userId
router.delete("/:id/members/:userId", async (req, res) => {
  const admin = await getRequestingAdmin(req, res);
  if (!admin) return;

  const teamId = Number(req.params.id);
  const userId = Number(req.params.userId);
  if (isNaN(teamId) || isNaN(userId)) return res.status(400).json({ error: "Invalid ids" });

  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, teamId));

  await db
    .delete(userTeamsTable)
    .where(and(eq(userTeamsTable.teamId, teamId), eq(userTeamsTable.userId, userId)));

  await db.insert(auditLogTable).values({
    adminUserId: admin.id,
    affectedUserId: userId,
    action: "team_membership_removed",
    previousValue: team?.name,
  });

  return res.status(204).send();
});

export default router;
