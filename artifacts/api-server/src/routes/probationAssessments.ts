import { Router } from "express";
import { db, probationAssessmentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import {
  requireProductionManagementAccess,
  requireProductionUserAccess,
} from "../middlewares/productionAuth";
import { managerAssessmentFields } from "../middlewares/productionAuthorizationPolicy";

const router = Router();

const upsertSchema = z.object({
  userId: z.number().int(),
  itemId: z.number().int(),
  reviewPeriod: z.string().default("month1"),
  rating: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  managerRating: z.string().nullable().optional(),
  managerComment: z.string().nullable().optional(),
});

router.get("/", async (req, res) => {
  const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
  const reviewPeriod = req.query.reviewPeriod as string | undefined;
  if (!userId) return res.status(400).json({ error: "userId is required" });
  if (!(await requireProductionUserAccess(req, res, userId, "view this probation assessment"))) return;

  const conditions = [eq(probationAssessmentsTable.userId, userId)];
  if (reviewPeriod) {
    conditions.push(eq(probationAssessmentsTable.reviewPeriod, reviewPeriod));
  }

  const rows = await db.select().from(probationAssessmentsTable).where(and(...conditions));
  return res.json(rows);
});

router.post("/", async (req, res) => {
  const result = upsertSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.message });

  const { userId, itemId, reviewPeriod, rating, note, managerRating, managerComment } = result.data;
  const includesManagerFields = managerRating !== undefined || managerComment !== undefined;
  const canUpdate = includesManagerFields
    ? await requireProductionManagementAccess(req, res, userId, "update this manager assessment")
    : await requireProductionUserAccess(req, res, userId, "update this probation assessment");
  if (!canUpdate) return;

  const existing = await db
    .select()
    .from(probationAssessmentsTable)
    .where(
      and(
        eq(probationAssessmentsTable.userId, userId),
        eq(probationAssessmentsTable.itemId, itemId),
        eq(probationAssessmentsTable.reviewPeriod, reviewPeriod)
      )
    );

  if (existing.length > 0) {
    const managerFields = managerAssessmentFields(
      existing[0],
      { managerRating, managerComment },
      includesManagerFields,
    );
    const [updated] = await db
      .update(probationAssessmentsTable)
      .set({
        rating: rating ?? null,
        note: note ?? null,
        ...managerFields,
        updatedAt: new Date(),
      })
      .where(eq(probationAssessmentsTable.id, existing[0].id))
      .returning();
    return res.json(updated);
  }

  const [created] = await db
    .insert(probationAssessmentsTable)
    .values({
      userId,
      itemId,
      reviewPeriod,
      rating: rating ?? null,
      note: note ?? null,
      managerRating: managerRating ?? null,
      managerComment: managerComment ?? null,
    })
    .returning();
  return res.json(created);
});

export default router;
