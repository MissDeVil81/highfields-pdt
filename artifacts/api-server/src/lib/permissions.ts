import type { User } from "@workspace/db";

export interface AdditionalUserPerm {
  ownerUserId: number;
  targetUserId: number;
  permissionType: string;
}

export interface AdditionalTeamPerm {
  ownerUserId: number;
  teamId: number;
  permissionType: string;
}

export interface UserTeamRow {
  userId: number;
  teamId: number;
}

/** All user IDs that report directly or indirectly to a given manager */
export function getReportingSubtree(managerId: number, allUsers: User[]): Set<number> {
  const result = new Set<number>();
  const queue = [managerId];
  const visited = new Set<number>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    for (const user of allUsers) {
      if (user.managerId === current && !result.has(user.id)) {
        result.add(user.id);
        queue.push(user.id);
      }
    }
  }
  return result;
}

/** Would setting targetId.managerId = newManagerId create a cycle? */
export function wouldCreateCycle(
  targetId: number,
  newManagerId: number,
  allUsers: User[]
): boolean {
  const visited = new Set<number>();
  let current: number | null = newManagerId;

  while (current !== null) {
    if (current === targetId) return true;
    if (visited.has(current)) break;
    visited.add(current);
    const user = allUsers.find((u) => u.id === current);
    current = user?.managerId ?? null;
  }
  return false;
}

export function isAdmin(user: User): boolean {
  return user.roles.includes("admin");
}

/** Returns true if requesting user can VIEW targetId */
export function canViewUser(
  requesting: User,
  targetId: number,
  allUsers: User[],
  additionalUserPerms: AdditionalUserPerm[],
  additionalTeamPerms: AdditionalTeamPerm[],
  userTeams: UserTeamRow[]
): boolean {
  if (isAdmin(requesting)) return true;
  if (requesting.id === targetId) return true;

  const subtree = getReportingSubtree(requesting.id, allUsers);
  if (subtree.has(targetId)) return true;

  const userPerm = additionalUserPerms.find(
    (p) => p.ownerUserId === requesting.id && p.targetUserId === targetId
  );
  if (userPerm) return true;

  const targetTeams = userTeams
    .filter((ut) => ut.userId === targetId)
    .map((ut) => ut.teamId);
  const teamPerm = additionalTeamPerms.find(
    (p) => p.ownerUserId === requesting.id && targetTeams.includes(p.teamId)
  );
  if (teamPerm) return true;

  return false;
}

/** Returns true if requesting user can EDIT targetId */
export function canEditUser(
  requesting: User,
  targetId: number,
  allUsers: User[],
  additionalUserPerms: AdditionalUserPerm[],
  additionalTeamPerms: AdditionalTeamPerm[],
  userTeams: UserTeamRow[]
): boolean {
  if (isAdmin(requesting)) return true;
  if (requesting.id === targetId) return true;

  const subtree = getReportingSubtree(requesting.id, allUsers);
  if (subtree.has(targetId)) return true;

  const userPerm = additionalUserPerms.find(
    (p) =>
      p.ownerUserId === requesting.id &&
      p.targetUserId === targetId &&
      p.permissionType === "edit"
  );
  if (userPerm) return true;

  const targetTeams = userTeams
    .filter((ut) => ut.userId === targetId)
    .map((ut) => ut.teamId);
  const teamPerm = additionalTeamPerms.find(
    (p) =>
      p.ownerUserId === requesting.id &&
      targetTeams.includes(p.teamId) &&
      p.permissionType === "edit"
  );
  if (teamPerm) return true;

  return false;
}

export interface AccessBreakdownItem {
  userId: number;
  name: string;
  relationship: string; // "Direct report" | "Indirect report" | "Additional view" | "Additional edit"
  accessType: "view" | "edit";
}

export interface AccessSummaryResult {
  directReports: number;
  indirectReports: number;
  additionalUsers: number;
  additionalTeams: string[];
  totalCanView: number;
  totalCanEdit: number;
  breakdown: AccessBreakdownItem[];
}

/** Build a full access summary for a given user */
export function buildAccessSummary(
  userId: number,
  allUsers: User[],
  additionalUserPerms: AdditionalUserPerm[],
  additionalTeamPerms: AdditionalTeamPerm[],
  userTeams: UserTeamRow[],
  teamsMap: Map<number, { name: string }>
): AccessSummaryResult {
  const owner = allUsers.find((u) => u.id === userId);
  if (!owner) {
    return {
      directReports: 0,
      indirectReports: 0,
      additionalUsers: 0,
      additionalTeams: [],
      totalCanView: 0,
      totalCanEdit: 0,
      breakdown: [],
    };
  }

  const directReportIds = new Set(
    allUsers.filter((u) => u.managerId === userId).map((u) => u.id)
  );

  const allSubtree = getReportingSubtree(userId, allUsers);
  const indirectReportIds = new Set(
    [...allSubtree].filter((id) => !directReportIds.has(id))
  );

  const breakdown: AccessBreakdownItem[] = [];
  const canViewSet = new Set<number>();
  const canEditSet = new Set<number>();

  // Direct reports — full edit
  for (const id of directReportIds) {
    const u = allUsers.find((x) => x.id === id);
    if (!u) continue;
    canViewSet.add(id);
    canEditSet.add(id);
    breakdown.push({ userId: id, name: u.name, relationship: "Direct report", accessType: "edit" });
  }

  // Indirect reports — full edit
  for (const id of indirectReportIds) {
    const u = allUsers.find((x) => x.id === id);
    if (!u) continue;
    canViewSet.add(id);
    canEditSet.add(id);
    breakdown.push({ userId: id, name: u.name, relationship: "Indirect report", accessType: "edit" });
  }

  // Additional user permissions
  const myUserPerms = additionalUserPerms.filter((p) => p.ownerUserId === userId);
  for (const perm of myUserPerms) {
    if (allSubtree.has(perm.targetUserId) || directReportIds.has(perm.targetUserId)) continue; // already covered
    const u = allUsers.find((x) => x.id === perm.targetUserId);
    if (!u) continue;
    canViewSet.add(perm.targetUserId);
    if (perm.permissionType === "edit") canEditSet.add(perm.targetUserId);
    const existing = breakdown.find((b) => b.userId === perm.targetUserId);
    if (!existing) {
      breakdown.push({
        userId: perm.targetUserId,
        name: u.name,
        relationship: perm.permissionType === "edit" ? "Additional full edit access" : "Additional view access",
        accessType: perm.permissionType === "edit" ? "edit" : "view",
      });
    }
  }

  // Additional team permissions
  const myTeamPerms = additionalTeamPerms.filter((p) => p.ownerUserId === userId);
  const additionalTeamNames: string[] = [];
  for (const perm of myTeamPerms) {
    const team = teamsMap.get(perm.teamId);
    if (team && !additionalTeamNames.includes(team.name)) {
      additionalTeamNames.push(team.name);
    }
    const teamMembers = userTeams.filter((ut) => ut.teamId === perm.teamId).map((ut) => ut.userId);
    for (const memberId of teamMembers) {
      if (canViewSet.has(memberId)) continue; // already has access
      const u = allUsers.find((x) => x.id === memberId);
      if (!u) continue;
      canViewSet.add(memberId);
      if (perm.permissionType === "edit") canEditSet.add(memberId);
      breakdown.push({
        userId: memberId,
        name: u.name,
        relationship: perm.permissionType === "edit"
          ? `Additional edit access via ${team?.name ?? "team"}`
          : `Additional view access via ${team?.name ?? "team"}`,
        accessType: perm.permissionType === "edit" ? "edit" : "view",
      });
    }
  }

  const additionalUsersCount = canViewSet.size - directReportIds.size - indirectReportIds.size;

  return {
    directReports: directReportIds.size,
    indirectReports: indirectReportIds.size,
    additionalUsers: Math.max(0, additionalUsersCount),
    additionalTeams: additionalTeamNames,
    totalCanView: canViewSet.size,
    totalCanEdit: canEditSet.size,
    breakdown,
  };
}
