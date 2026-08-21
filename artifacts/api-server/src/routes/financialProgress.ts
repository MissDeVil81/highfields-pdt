import { Router } from "express";
import { db, financialProgressTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireProductionUserAccess } from "../middlewares/productionAuth";

const router = Router();

const upsertSchema = z.object({
  userId: z.number().int(),
  targetId: z.number().int(),
  roleId: z.number().int(),
  currentAmount: z.number().int().min(0),
});

router.get("/", async (req, res) => {
  const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
  const roleId = req.query.roleId ? parseInt(req.query.roleId as string) : undefined;
  if (!userId) return res.status(400).json({ error: "userId is required" });
  if (!roleId) return res.status(400).json({ error: "roleId is required" });
  if (!(await requireProductionUserAccess(req, res, userId, "view this financial progress"))) return;

  const rows = await db
    .select()
    .from(financialProgressTable)
    .where(and(eq(financialProgressTable.userId, userId), eq(financialProgressTable.roleId, roleId)));

  return res.json(rows);
});

router.post("/", async (req, res) => {
  const result = upsertSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.message });

  const { userId, targetId, roleId, currentAmount } = result.data;
  if (!(await requireProductionUserAccess(req, res, userId, "update this financial progress"))) return;

  const existing = await db
    .select()
    .from(financialProgressTable)
    .where(and(eq(financialProgressTable.userId, userId), eq(financialProgressTable.targetId, targetId)));

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
    .values({ userId, targetId, roleId, currentAmount })
    .returning();
  return res.json(created);
});

export default router;
