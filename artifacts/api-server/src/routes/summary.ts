import { Router } from "express";
import { db, assessmentsTable, evidenceTable, rolesTable, competenciesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

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
    return { ...base, evidenceCount: evidenceEntries.length };
  }

  return base;
}

router.get("/readiness", requireAuth, async (req, res) => {
  const sessionId = (req as any).userId as string;
  const currentRoleId = req.query.currentRoleId ? parseInt(req.query.currentRoleId as string) : undefined;
  const targetRoleId = req.query.targetRoleId ? parseInt(req.query.targetRoleId as string) : undefined;

  const currentRole = currentRoleId ? await getRoleSummary(sessionId, currentRoleId, false) : null;
  const targetRole = targetRoleId ? await getRoleSummary(sessionId, targetRoleId, true) : null;

  res.json({ currentRole, targetRole });
});

export default router;
