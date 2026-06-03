import { Router } from "express";
import { db, probationManagerReviewsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const upsertSchema = z.object({
  sessionId: z.string(),
  reviewPeriod: z.string(),
  goingWell: z.string().nullable().optional(),
  developmentAreas: z.string().nullable().optional(),
  reviewStatus: z.string().nullable().optional(),
});

router.get("/", async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const reviewPeriod = req.query.reviewPeriod as string | undefined;
  if (!sessionId) return res.status(400).json({ error: "sessionId is required" });

  const conditions = [eq(probationManagerReviewsTable.sessionId, sessionId)];
  if (reviewPeriod) {
    conditions.push(eq(probationManagerReviewsTable.reviewPeriod, reviewPeriod));
  }

  const rows = await db.select().from(probationManagerReviewsTable).where(and(...conditions));
  res.json(rows);
});

router.post("/", async (req, res) => {
  const result = upsertSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.message });

  const { sessionId, reviewPeriod, goingWell, developmentAreas, reviewStatus } = result.data;

  const existing = await db
    .select()
    .from(probationManagerReviewsTable)
    .where(
      and(
        eq(probationManagerReviewsTable.sessionId, sessionId),
        eq(probationManagerReviewsTable.reviewPeriod, reviewPeriod)
      )
    );

  if (existing.length > 0) {
    const [updated] = await db
      .update(probationManagerReviewsTable)
      .set({
        goingWell: goingWell ?? null,
        developmentAreas: developmentAreas ?? null,
        reviewStatus: reviewStatus ?? null,
        updatedAt: new Date(),
      })
      .where(eq(probationManagerReviewsTable.id, existing[0].id))
      .returning();
    return res.json(updated);
  }

  const [created] = await db
    .insert(probationManagerReviewsTable)
    .values({ sessionId, reviewPeriod, goingWell: goingWell ?? null, developmentAreas: developmentAreas ?? null, reviewStatus: reviewStatus ?? null })
    .returning();
  res.json(created);
});

export default router;
