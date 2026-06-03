import { Router } from "express";
import { db, financialProgressTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const upsertSchema = z.object({
  sessionId: z.string(),
  targetId: z.number().int(),
  roleId: z.number().int(),
  currentAmount: z.number().int().min(0),
});

router.get("/", async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const roleId = req.query.roleId ? parseInt(req.query.roleId as string) : undefined;
  if (!sessionId) return res.status(400).json({ error: "sessionId is required" });
  if (!roleId) return res.status(400).json({ error: "roleId is required" });

  const rows = await db
    .select()
    .from(financialProgressTable)
    .where(and(eq(financialProgressTable.sessionId, sessionId), eq(financialProgressTable.roleId, roleId)));

  res.json(rows);
});

router.post("/", async (req, res) => {
  const result = upsertSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.message });

  const { sessionId, targetId, roleId, currentAmount } = result.data;

  const existing = await db
    .select()
    .from(financialProgressTable)
    .where(and(eq(financialProgressTable.sessionId, sessionId), eq(financialProgressTable.targetId, targetId)));

  if (existing.length > 0) {
    const [updated] = await db
      .update(financialProgressTable)
      .set({ currentAmount, updatedAt: new Date() })
      .where(eq(financialProgressTable.id, existing[0].id))
      .returning();
    return res.json(updated);
  }

  const [created] = await db
    .insert(financialProgressTable)
    .values({ sessionId, targetId, roleId, currentAmount })
    .returning();
  res.json(created);
});

export default router;
