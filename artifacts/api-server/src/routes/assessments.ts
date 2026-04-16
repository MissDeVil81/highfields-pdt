import { Router } from "express";
import { db, assessmentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

const upsertSchema = z.object({
  competencyId: z.number().int(),
  roleId: z.number().int(),
  rating: z.enum(["red", "amber", "green"]),
  notes: z.string().optional(),
});

router.get("/", requireAuth, async (req, res) => {
  const sessionId = (req as any).userId as string;
  const roleId = req.query.roleId ? parseInt(req.query.roleId as string) : undefined;

  const conditions = [eq(assessmentsTable.sessionId, sessionId)];
  if (roleId) conditions.push(eq(assessmentsTable.roleId, roleId));

  const assessments = await db.select().from(assessmentsTable).where(and(...conditions));
  res.json(assessments);
});

router.post("/", requireAuth, async (req, res) => {
  const result = upsertSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.message });

  const sessionId = (req as any).userId as string;
  const { competencyId, roleId, rating, notes } = result.data;

  const existing = await db.select().from(assessmentsTable).where(
    and(
      eq(assessmentsTable.sessionId, sessionId),
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

  const [created] = await db.insert(assessmentsTable).values({ sessionId, competencyId, roleId, rating, notes: notes ?? null }).returning();
  res.json(created);
});

export default router;
