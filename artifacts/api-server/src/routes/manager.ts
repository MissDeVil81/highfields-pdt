import { Router } from "express";
import { db, usersTable, probationManagerReviewsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/team", async (req, res) => {
  const managerId = Number(req.query.managerId);
  if (isNaN(managerId)) return res.status(400).json({ error: "managerId is required" });

  const members = await db.select().from(usersTable).where(eq(usersTable.managerId, managerId));

  const result = await Promise.all(
    members.map(async (member) => {
      const reviews = await db
        .select()
        .from(probationManagerReviewsTable)
        .where(eq(probationManagerReviewsTable.userId, member.id));

      const latest = reviews.sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )[0];

      return {
        id: member.id,
        name: member.name,
        email: member.email,
        jobTitle: member.jobTitle,
        department: member.department,
        startDate: member.startDate,
        probationStatus: member.probationStatus,
        isActive: member.isActive,
        latestReviewPeriod: latest?.reviewPeriod ?? null,
        latestReviewPublishedAt: latest?.publishedAt?.toISOString() ?? null,
        reviewCount: reviews.length,
      };
    })
  );

  return res.json(result);
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

    const reviews = await db
      .select()
      .from(probationManagerReviewsTable)
      .where(eq(probationManagerReviewsTable.userId, member.id));

    const hasPublished = reviews.some((r) => r.publishedAt !== null);
    const hasDraft = reviews.some((r) => r.publishedAt === null);

    if (hasPublished) publishedReviews++;
    if (hasDraft && !hasPublished) pendingReviews++;
    if (!reviews.length && member.probationStatus === "in_probation") needingAttention++;
  }

  return res.json({
    totalTeam: members.length,
    inProbation,
    pendingReviews,
    publishedReviews,
    needingAttention,
  });
});

export default router;
