import { Router } from "express";
import {
  db,
  usersTable,
  probationManagerReviewsTable,
  assessmentsTable,
  competenciesTable,
  rolesTable,
  financialTargetsTable,
  financialProgressTable,
} from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";

const router = Router();

async function getFinancialStatus(
  userId: number,
  roleId: number
): Promise<"achieved" | "in_progress" | "not_yet" | null> {
  const targets = await db
    .select()
    .from(financialTargetsTable)
    .where(eq(financialTargetsTable.roleId, roleId));
  if (targets.length === 0) return null;

  const progressRows = await db
    .select()
    .from(financialProgressTable)
    .where(
      and(
        eq(financialProgressTable.userId, userId),
        eq(financialProgressTable.roleId, roleId)
      )
    );
  if (progressRows.length === 0) return "not_yet";

  const progressMap = new Map(progressRows.map((p) => [p.targetId, p.currentAmount]));

  const optionGroups = new Map<number | null, typeof targets>();
  for (const t of targets) {
    const key = t.optionGroup ?? null;
    if (!optionGroups.has(key)) optionGroups.set(key, []);
    optionGroups.get(key)!.push(t);
  }

  let bestPct = 0;
  for (const [, groupTargets] of optionGroups) {
    for (const t of groupTargets) {
      const current = progressMap.get(t.id) ?? 0;
      const pct = t.targetAmount > 0 ? (current / t.targetAmount) * 100 : 0;
      if (pct > bestPct) bestPct = pct;
    }
  }

  if (bestPct >= 100) return "achieved";
  if (bestPct >= 75) return "in_progress";
  return "not_yet";
}

type DevMap = Map<
  number,
  {
    currentRoleId: number | null;
    lastAssessedAt: Date | null;
    assessmentsByRole: Map<number, Array<{ rating: string | null; updatedAt: Date }>>;
  }
>;

async function buildDevMap(memberIds: number[], targetRoleByUser: Map<number, number | null>): Promise<DevMap> {
  if (memberIds.length === 0) return new Map();

  const allAssessments = await db
    .select({
      userId: assessmentsTable.userId,
      roleId: assessmentsTable.roleId,
      rating: assessmentsTable.rating,
      updatedAt: assessmentsTable.updatedAt,
    })
    .from(assessmentsTable)
    .where(inArray(assessmentsTable.userId, memberIds));

  const result: DevMap = new Map();

  for (const member of memberIds) {
    result.set(member, {
      currentRoleId: null,
      lastAssessedAt: null,
      assessmentsByRole: new Map(),
    });
  }

  for (const a of allAssessments) {
    if (a.userId == null) continue;
    const entry = result.get(a.userId);
    if (!entry) continue;

    if (!entry.assessmentsByRole.has(a.roleId)) {
      entry.assessmentsByRole.set(a.roleId, []);
    }
    entry.assessmentsByRole.get(a.roleId)!.push({ rating: a.rating, updatedAt: a.updatedAt });

    const targetRoleId = targetRoleByUser.get(a.userId) ?? null;
    if (a.roleId === targetRoleId) continue;

    const d = new Date(a.updatedAt);
    if (!entry.lastAssessedAt || d > entry.lastAssessedAt) {
      entry.lastAssessedAt = d;
      entry.currentRoleId = a.roleId;
    }
  }

  return result;
}

router.get("/team", async (req, res) => {
  const managerId = Number(req.query.managerId);
  if (isNaN(managerId)) return res.status(400).json({ error: "managerId is required" });

  const members = await db.select().from(usersTable).where(eq(usersTable.managerId, managerId));

  const allRoles = await db.select().from(rolesTable);
  const roleMap = new Map(allRoles.map((r) => [r.id, r]));

  const allCompetencies = await db.select({ roleId: competenciesTable.roleId }).from(competenciesTable);
  const compCountByRole = new Map<number, number>();
  for (const c of allCompetencies) {
    compCountByRole.set(c.roleId, (compCountByRole.get(c.roleId) ?? 0) + 1);
  }

  const memberIds = members.map((m) => m.id);
  const targetRoleByUser = new Map(members.map((m) => [m.id, m.targetRoleId ?? null]));
  const devMap = await buildDevMap(memberIds, targetRoleByUser);

  const result = await Promise.all(
    members.map(async (member) => {
      const reviews = await db
        .select()
        .from(probationManagerReviewsTable)
        .where(eq(probationManagerReviewsTable.userId, member.id));

      const latest = reviews.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )[0];

      const dev = devMap.get(member.id);
      const currentRoleId = dev?.currentRoleId ?? null;
      const lastAssessedAt = dev?.lastAssessedAt ?? null;

      let currentRoleTitle: string | null = null;
      let currentRoleCompletionPct: number | null = null;
      let targetRoleTitle: string | null = null;
      let targetRoleReadinessPct: number | null = null;
      let financialTargetStatus: string | null = null;

      if (currentRoleId) {
        currentRoleTitle = roleMap.get(currentRoleId)?.title ?? null;
        const totalComps = compCountByRole.get(currentRoleId) ?? 0;
        const ratedComps = dev?.assessmentsByRole.get(currentRoleId)?.length ?? 0;
        currentRoleCompletionPct = totalComps > 0 ? Math.round((ratedComps / totalComps) * 100) : 0;
      }

      const targetRoleId = member.targetRoleId ?? null;
      if (targetRoleId != null) {
        targetRoleTitle = roleMap.get(targetRoleId)?.title ?? null;
        const totalComps = compCountByRole.get(targetRoleId) ?? 0;
        const targetAssessments = dev?.assessmentsByRole.get(targetRoleId) ?? [];
        const greenCount = targetAssessments.filter((a) => a.rating === "green").length;
        targetRoleReadinessPct = totalComps > 0 ? Math.round((greenCount / totalComps) * 100) : 0;
        financialTargetStatus = await getFinancialStatus(member.id, targetRoleId);
      }

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
        currentRoleId,
        currentRoleTitle,
        currentRoleCompletionPct,
        targetRoleId,
        targetRoleTitle,
        targetRoleReadinessPct,
        financialTargetStatus,
        lastAssessedAt: lastAssessedAt?.toISOString() ?? null,
      };
    })
  );

  return res.json(result);
});

router.get("/dashboard-stats", async (req, res) => {
  const managerId = Number(req.query.managerId);
  if (isNaN(managerId)) return res.status(400).json({ error: "managerId is required" });

  const members = await db.select().from(usersTable).where(eq(usersTable.managerId, managerId));

  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  let inProbation = 0;
  let pendingReviews = 0;
  let publishedReviews = 0;
  let needingAttention = 0;
  let activeDevelopmentPlans = 0;
  let passiveDevelopmentPlans = 0;
  let missingDevelopmentPlans = 0;

  const memberIds = members.map((m) => m.id);
  const targetRoleByUser = new Map(members.map((m) => [m.id, m.targetRoleId ?? null]));
  const devMap = await buildDevMap(memberIds, targetRoleByUser);

  for (const member of members) {
    if (member.probationStatus === "in_progress") inProbation++;

    const reviews = await db
      .select()
      .from(probationManagerReviewsTable)
      .where(eq(probationManagerReviewsTable.userId, member.id));

    // Pending: within next 7 days AND not yet published
    const hasPending = reviews.some((r) => {
      if (r.publishedAt !== null) return false;
      if (!r.reviewDate) return false;
      const d = new Date(r.reviewDate);
      return !isNaN(d.getTime()) && d >= now && d <= sevenDaysFromNow;
    });

    // Published: review date has passed AND at least one published review exists
    const hasPublished = reviews.some((r) => {
      if (!r.publishedAt) return false;
      if (!r.reviewDate) return true;
      const d = new Date(r.reviewDate);
      return isNaN(d.getTime()) || d <= now;
    });

    if (hasPending) pendingReviews++;
    if (hasPublished) publishedReviews++;
    if (!reviews.length && member.probationStatus === "in_progress") needingAttention++;

    // Personal development classification
    const dev = devMap.get(member.id);
    if (!dev || !dev.currentRoleId) {
      missingDevelopmentPlans++;
    } else if (dev.lastAssessedAt && dev.lastAssessedAt >= threeMonthsAgo) {
      activeDevelopmentPlans++;
    } else {
      passiveDevelopmentPlans++;
    }
  }

  return res.json({
    totalTeam: members.length,
    inProbation,
    pendingReviews,
    publishedReviews,
    needingAttention,
    activeDevelopmentPlans,
    passiveDevelopmentPlans,
    missingDevelopmentPlans,
  });
});

export default router;
