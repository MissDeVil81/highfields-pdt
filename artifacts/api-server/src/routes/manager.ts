import { Router } from "express";
import { db, usersTable, probationManagerReviewsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

router.get("/team", async (req, res) => {
  const managerId = Number(req.query.managerId);
  if (isNaN(managerId)) return res.status(400).json({ error: "managerId is required" });

  const members = await db.select().from(usersTable).where(eq(usersTable.managerId, managerId));

  const result = await Promise.all(
    members.map(async (member) => {
      if (!member.sessionId) {
        return {
          ...member,
          latestReviewPeriod: null,
          latestReviewPublishedAt: null,
          reviewCount: 0,
        };
      }
      const reviews = await db
        .select()
        .from(probationManagerReviewsTable)
        .where(eq(probationManagerReviewsTable.sessionId, member.sessionId));

      const latest = reviews.sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )[0];

      return {
        ...member,
        latestReviewPeriod: latest?.reviewPeriod ?? null,
        latestReviewPublishedAt: latest?.publishedAt?.toISOString() ?? null,
        reviewCount: reviews.length,
      };
    })
  );

  res.json(result);
});

router.get("/dashboard-stats", async (req, res) => {
  const managerId = Number(req.query.managerId);
  if (isNaN(managerId)) return res.status(400).json({ error: "managerId is required" });

  const members = await db.select().from(usersTable).where(eq(usersTable.managerId, managerId));

  let inProbation = 0;
  let pendingReviews = 0;
  let publishedReviews = 0;
  let needingAttention = 0;

  for (const member of members) {
    if (member.probationStatus === "in_probation") inProbation++;

    if (member.sessionId) {
      const reviews = await db
        .select()
        .from(probationManagerReviewsTable)
        .where(eq(probationManagerReviewsTable.sessionId, member.sessionId));

      const hasPublished = reviews.some((r) => r.publishedAt !== null);
      const hasDraft = reviews.some((r) => r.publishedAt === null);

      if (hasPublished) publishedReviews++;
      if (hasDraft && !hasPublished) pendingReviews++;
      if (!reviews.length && member.probationStatus === "in_probation") needingAttention++;
    } else {
      if (member.probationStatus === "in_probation") needingAttention++;
    }
  }

  res.json({
    totalTeam: members.length,
    inProbation,
    pendingReviews,
    publishedReviews,
    needingAttention,
  });
});

export default router;
