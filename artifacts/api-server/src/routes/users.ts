import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  roles: z.array(z.string()).optional().default(["employee"]),
  managerId: z.number().int().optional(),
  sessionId: z.string().optional(),
  department: z.string().optional(),
  jobTitle: z.string().optional(),
  startDate: z.string().optional(),
  probationStatus: z.string().optional(),
  isActive: z.string().optional().default("active"),
});

const updateSchema = createSchema.partial().omit({ name: true }).extend({
  name: z.string().min(1).optional(),
  managerId: z.number().int().nullable().optional(),
});

router.get("/", async (req, res) => {
  const managerId = req.query.managerId ? Number(req.query.managerId) : undefined;
  const sessionId = req.query.sessionId as string | undefined;

  const conditions = [];
  if (managerId !== undefined) conditions.push(eq(usersTable.managerId, managerId));
  if (sessionId) conditions.push(eq(usersTable.sessionId, sessionId));

  const rows = conditions.length > 0
    ? await db.select().from(usersTable).where(and(...conditions))
    : await db.select().from(usersTable);

  res.json(rows);
});

router.post("/", async (req, res) => {
  const result = createSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.message });

  const [created] = await db.insert(usersTable).values(result.data).returning();
  res.status(201).json(created);
});

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json(user);
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const result = updateSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.message });

  const [updated] = await db
    .update(usersTable)
    .set({ ...result.data, updatedAt: new Date() })
    .where(eq(usersTable.id, id))
    .returning();

  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json(updated);
});

export default router;
