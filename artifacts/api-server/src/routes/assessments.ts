import { Router } from "express";
import { db, assessmentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const upsertSchema = z.object({
  userId: z.number().int(),
  competencyId: z.number().int(),
  roleId: z.number().int(),
  rating: z.enum(["red", "amber", "green"]),
  notes: z.string().optional(),
});

router.get("/", async (req, res) => {
  const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
  const roleId = req.query.roleId ? parseInt(req.query.roleId as string) : undefined;
  if (!userId) return res.status(400).json({ error: "userId is required" });

  const conditions = [eq(assessmentsTable.userId, userId)];
  if (roleId) conditions.push(eq(assessmentsTable.roleId, roleId));

  const assessments = await db.select().from(assessmentsTable).where(and(...conditions));
  return res.json(assessments);
});

router.post("/", async (req, res) => {
  const result = upsertSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.message });

  const { userId, competencyId, roleId, rating, notes } = result.data;

  const existing = await db.select().from(assessmentsTable).where(
    and(
      eq(assessmentsTable.userId, userId),
      eq(assessmentsTable.competencyId, competencyId),
      eq(assessmentsTable.roleId, roleId)
    )
  );

  if (existing.length > 0) {
    const [updated] = await db
      .update(assessmentsTable)
      .set({ rating, notes: notes ?? null, updatedAt: new Date() })
      .where(eq(assessmentsTable.id, existing[0].id))
      .returning();
    return res.json(updated);
  }

  const [created] = await db.insert(assessmentsTable).values({ userId, competencyId, roleId, rating, notes: notes ?? null }).returning();
  return res.json(created);
});

export default router;
