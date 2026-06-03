import { Router } from "express";
import { db, assessmentsTable, evidenceTable, rolesTable, competenciesTable, financialTargetsTable, financialProgressTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

async function getFinancialStatus(sessionId: string, roleId: number): Promise<"achieved" | "in_progress" | "not_yet" | null> {
  const targets = await db.select().from(financialTargetsTable).where(eq(financialTargetsTable.roleId, roleId));
  if (targets.length === 0) return null;

  const progressRows = await db.select().from(financialProgressTable).where(
    and(eq(financialProgressTable.sessionId, sessionId), eq(financialProgressTable.roleId, roleId))
  );
  if (progressRows.length === 0) return "not_yet";

  const progressMap = new Map(progressRows.map(p => [p.targetId, p.currentAmount]));

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

async function getRoleSummary(sessionId: string, roleId: number, isTargetRole: boolean) {
  const [role] = await db.select().from(rolesTable).where(eq(rolesTable.id, roleId));
  if (!role) return null;

  const competencies = await db.select().from(competenciesTable).where(eq(competenciesTable.roleId, roleId));
  const assessments = await db.select().from(assessmentsTable).where(
    and(eq(assessmentsTable.sessionId, sessionId), eq(assessmentsTable.roleId, roleId))
  );

  const ratingMap = new Map(assessments.map(a => [a.competencyId, a.rating]));
  let green = 0, amber = 0, red = 0, unrated = 0;

  for (const comp of competencies) {
    const rating = ratingMap.get(comp.id);
    if (rating === "green") green++;
    else if (rating === "amber") amber++;
    else if (rating === "red") red++;
    else unrated++;
  }

  const total = competencies.length;
  const readinessPercent = total > 0 ? Math.round((green / total) * 100) : 0;

  const base = { roleId, title: role.title, totalCompetencies: total, green, amber, red, unrated, readinessPercent };

  if (isTargetRole) {
    const evidenceEntries = await db.select().from(evidenceTable).where(
      and(eq(evidenceTable.sessionId, sessionId), eq(evidenceTable.roleId, roleId))
    );
    const financialStatus = await getFinancialStatus(sessionId, roleId);
    return { ...base, evidenceCount: evidenceEntries.length, financialStatus };
  }

  return base;
}

router.get("/readiness", async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const currentRoleId = req.query.currentRoleId ? parseInt(req.query.currentRoleId as string) : undefined;
  const targetRoleId = req.query.targetRoleId ? parseInt(req.query.targetRoleId as string) : undefined;

  if (!sessionId) return res.status(400).json({ error: "sessionId is required" });

  const currentRole = currentRoleId ? await getRoleSummary(sessionId, currentRoleId, false) : null;
  const targetRole = targetRoleId ? await getRoleSummary(sessionId, targetRoleId, true) : null;

  res.json({ currentRole, targetRole });
});

export default router;
