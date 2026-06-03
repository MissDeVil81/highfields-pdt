import { Router } from "express";
import { db, probationAssessmentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const upsertSchema = z.object({
  sessionId: z.string(),
  itemId: z.number().int(),
  reviewPeriod: z.string().default("month1"),
  rating: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

router.get("/", async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const reviewPeriod = req.query.reviewPeriod as string | undefined;
  if (!sessionId) return res.status(400).json({ error: "sessionId is required" });

  const conditions = [eq(probationAssessmentsTable.sessionId, sessionId)];
  if (reviewPeriod) {
    conditions.push(eq(probationAssessmentsTable.reviewPeriod, reviewPeriod));
  }

  const rows = await db.select().from(probationAssessmentsTable).where(and(...conditions));
  res.json(rows);
});

router.post("/", async (req, res) => {
  const result = upsertSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.message });

  const { sessionId, itemId, reviewPeriod, rating, note } = result.data;

  const existing = await db
    .select()
    .from(probationAssessmentsTable)
    .where(
      and(
        eq(probationAssessmentsTable.sessionId, sessionId),
        eq(probationAssessmentsTable.itemId, itemId),
        eq(probationAssessmentsTable.reviewPeriod, reviewPeriod)
      )
    );

  if (existing.length > 0) {
    const [updated] = await db
      .update(probationAssessmentsTable)
      .set({ rating: rating ?? null, note: note ?? null, updatedAt: new Date() })
      .where(eq(probationAssessmentsTable.id, existing[0].id))
      .returning();
    return res.json(updated);
  }

  const [created] = await db
    .insert(probationAssessmentsTable)
    .values({ sessionId, itemId, reviewPeriod, rating: rating ?? null, note: note ?? null })
    .returning();
  res.json(created);
});

export default router;
