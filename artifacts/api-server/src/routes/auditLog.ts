import { Router } from "express";
import { db, auditLogTable, usersTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { isAdmin } from "../lib/permissions";

const router = Router();

// GET /audit-log
router.get("/", async (req, res) => {
  // Require admin
  const rawId = req.headers["x-requesting-user-id"] ?? req.query.requestingUserId;
  const requestingId = req.appUser?.id ?? Number(rawId);
  if (!Number.isInteger(requestingId)) {
    res.status(401).json({ error: "Administrator identity is required" });
    return;
  }

  const requestingUser = req.appUser ?? (await db.select().from(usersTable).where(eq(usersTable.id, requestingId)))[0];
  if (!requestingUser) return res.status(401).json({ error: "Requesting user not found" });
  if (!isAdmin(requestingUser)) return res.status(403).json({ error: "Admin access required" });

  const limit = Math.min(Number(req.query.limit ?? 100), 500);
  const offset = Number(req.query.offset ?? 0);

  const logs = await db
    .select()
    .from(auditLogTable)
    .orderBy(desc(auditLogTable.createdAt))
    .limit(limit)
    .offset(offset);

  // Enrich with user names
  const userIds = [
    ...new Set([
      ...logs.map((l) => l.adminUserId),
      ...logs.filter((l) => l.affectedUserId != null).map((l) => l.affectedUserId as number),
    ]),
  ];

  const users =
    userIds.length > 0
      ? await db
          .select({ id: usersTable.id, name: usersTable.name })
          .from(usersTable)
          .where(sql`${usersTable.id} = ANY(${userIds})`)
      : [];

  const userMap = new Map(users.map((u) => [u.id, u.name]));

  const enriched = logs.map((l) => ({
    ...l,
    adminName: userMap.get(l.adminUserId) ?? null,
    affectedUserName: l.affectedUserId ? (userMap.get(l.affectedUserId) ?? null) : null,
  }));

  return res.json(enriched);
});

export default router;
