import { Router } from "express";
import { db, probationManagerReviewsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import {
  requireProductionManagementAccess,
  requireProductionUserAccess,
} from "../middlewares/productionAuth";

const router = Router();

const upsertSchema = z.object({
  userId: z.number().int(),
  reviewPeriod: z.string(),
  goingWell: z.string().nullable().optional(),
  developmentAreas: z.string().nullable().optional(),
  reviewStatus: z.string().nullable().optional(),
  reviewDate: z.string().nullable().optional(),
});

router.get("/", async (req, res) => {
  const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
  const reviewPeriod = req.query.reviewPeriod as string | undefined;
  if (!userId) return res.status(400).json({ error: "userId is required" });
  if (!(await requireProductionUserAccess(req, res, userId, "view this manager review"))) return;

  const conditions = [eq(probationManagerReviewsTable.userId, userId)];
  if (reviewPeriod) {
    conditions.push(eq(probationManagerReviewsTable.reviewPeriod, reviewPeriod));
  }

  const rows = await db.select().from(probationManagerReviewsTable).where(and(...conditions));
  return res.json(rows);
});

router.post("/", async (req, res) => {
  const result = upsertSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.message });

  const { userId, reviewPeriod, goingWell, developmentAreas, reviewStatus, reviewDate } = result.data;
  if (!(await requireProductionManagementAccess(req, res, userId, "update this manager review"))) return;

  const existing = await db
    .select()
    .from(probationManagerReviewsTable)
    .where(
      and(
        eq(probationManagerReviewsTable.userId, userId),
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
        reviewDate: reviewDate ?? null,
        updatedAt: new Date(),
      })
      .where(eq(probationManagerReviewsTable.id, existing[0].id))
      .returning();
    return res.json(updated);
  }

  const [created] = await db
    .insert(probationManagerReviewsTable)
    .values({
      userId,
      reviewPeriod,
      goingWell: goingWell ?? null,
      developmentAreas: developmentAreas ?? null,
      reviewStatus: reviewStatus ?? null,
      reviewDate: reviewDate ?? null,
    })
    .returning();
  return res.json(created);
});

router.post("/publish", async (req, res) => {
  const { userId, reviewPeriod } = req.body as { userId?: number; reviewPeriod?: string };
  if (!userId || !reviewPeriod) {
    return res.status(400).json({ error: "userId and reviewPeriod are required" });
  }
  if (!(await requireProductionManagementAccess(req, res, userId, "publish this manager review"))) return;

  const [existing] = await db
    .select()
    .from(probationManagerReviewsTable)
    .where(
      and(
        eq(probationManagerReviewsTable.userId, userId),
        eq(probationManagerReviewsTable.reviewPeriod, reviewPeriod)
      )
    );

  if (!existing) return res.status(404).json({ error: "Review not found" });

  const [published] = await db
    .update(probationManagerReviewsTable)
    .set({ publishedAt: new Date(), updatedAt: new Date() })
    .where(eq(probationManagerReviewsTable.id, existing.id))
    .returning();

  return res.json(published);
});

export default router;
