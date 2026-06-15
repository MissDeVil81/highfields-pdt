import { Router } from "express";
import { db, probationReflectionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const upsertSchema = z.object({
  userId: z.number().int(),
  reviewPeriod: z.string(),
  wentWell: z.string().nullable().optional(),
  learned: z.string().nullable().optional(),
  moreSupport: z.string().nullable().optional(),
  focusNext: z.string().nullable().optional(),
  confidence: z.string().nullable().optional(),
  biggestAchievements: z.string().nullable().optional(),
  mostProudOf: z.string().nullable().optional(),
  stillDevelop: z.string().nullable().optional(),
  readyToPass: z.string().nullable().optional(),
});

router.get("/", async (req, res) => {
  const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
  const reviewPeriod = req.query.reviewPeriod as string | undefined;
  if (!userId) return res.status(400).json({ error: "userId is required" });

  const conditions = [eq(probationReflectionsTable.userId, userId)];
  if (reviewPeriod) {
    conditions.push(eq(probationReflectionsTable.reviewPeriod, reviewPeriod));
  }

  const rows = await db.select().from(probationReflectionsTable).where(and(...conditions));
  return res.json(rows);
});

router.post("/", async (req, res) => {
  const result = upsertSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.message });

  const { userId, reviewPeriod, ...fields } = result.data;

  const existing = await db
    .select()
    .from(probationReflectionsTable)
    .where(
      and(
        eq(probationReflectionsTable.userId, userId),
        eq(probationReflectionsTable.reviewPeriod, reviewPeriod)
      )
    );

  const setFields = {
    wentWell: fields.wentWell ?? null,
    learned: fields.learned ?? null,
    moreSupport: fields.moreSupport ?? null,
    focusNext: fields.focusNext ?? null,
    confidence: fields.confidence ?? null,
    biggestAchievements: fields.biggestAchievements ?? null,
    mostProudOf: fields.mostProudOf ?? null,
    stillDevelop: fields.stillDevelop ?? null,
    readyToPass: fields.readyToPass ?? null,
  };

  if (existing.length > 0) {
    const [updated] = await db
      .update(probationReflectionsTable)
      .set({ ...setFields, updatedAt: new Date() })
      .where(eq(probationReflectionsTable.id, existing[0].id))
      .returning();
    return res.json(updated);
  }

  const [created] = await db
    .insert(probationReflectionsTable)
    .values({ userId, reviewPeriod, ...setFields })
    .returning();
  return res.json(created);
});

export default router;
