import { Router } from "express";
import { db, usersTable, userTeamsTable, teamsTable } from "@workspace/db";
import { inArray } from "drizzle-orm";

const router = Router();

interface OrgNode {
  id: number;
  name: string;
  roles: string[];
  department: string | null;
  jobTitle: string | null;
  isActive: string;
  teamNames: string[];
  children: OrgNode[];
}

function buildTree(
  users: (typeof usersTable.$inferSelect)[],
  userTeamMap: Map<number, string[]>
): OrgNode[] {
  const nodeMap = new Map<number, OrgNode>();

  for (const u of users) {
    nodeMap.set(u.id, {
      id: u.id,
      name: u.name,
      roles: u.roles,
      department: u.department,
      jobTitle: u.jobTitle,
      isActive: u.isActive,
      teamNames: userTeamMap.get(u.id) ?? [],
      children: [],
    });
  }

  const roots: OrgNode[] = [];
  for (const u of users) {
    const node = nodeMap.get(u.id)!;
    if (u.managerId == null || !nodeMap.has(u.managerId)) {
      roots.push(node);
    } else {
      nodeMap.get(u.managerId)!.children.push(node);
    }
  }

  return roots;
}

// GET /hierarchy
router.get("/", async (_req, res) => {
  const users = await db.select().from(usersTable);

  // Load teams for all users
  const allUserTeams = await db.select().from(userTeamsTable);
  const teamIds = [...new Set(allUserTeams.map((ut) => ut.teamId))];
  const teams = teamIds.length > 0
    ? await db.select().from(teamsTable).where(inArray(teamsTable.id, teamIds))
    : [];

  const teamNameMap = new Map(teams.map((t) => [t.id, t.name]));
  const userTeamMap = new Map<number, string[]>();
  for (const ut of allUserTeams) {
    if (!userTeamMap.has(ut.userId)) userTeamMap.set(ut.userId, []);
    const name = teamNameMap.get(ut.teamId);
    if (name) userTeamMap.get(ut.userId)!.push(name);
  }

  const tree = buildTree(users, userTeamMap);
  return res.json(tree);
});

export default router;
