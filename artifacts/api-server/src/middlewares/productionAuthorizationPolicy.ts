export type AuthorizationActor = {
  id: number;
  roles: readonly string[];
};

export type UserRelationship = {
  id: number;
  managerId: number | null;
};

const hasRole = (actor: AuthorizationActor, roles: readonly string[]) =>
  actor.roles.some((role) => roles.includes(role));

export function permitsUserAccess(
  actor: AuthorizationActor,
  targetUserId: number,
  usersById: ReadonlyMap<number, UserRelationship>,
): boolean {
  if (actor.id === targetUserId || hasRole(actor, ["admin", "ld"])) return true;
  if (!hasRole(actor, ["manager", "director"])) return false;

  let current = usersById.get(targetUserId);
  const visited = new Set<number>();
  while (current?.managerId && !visited.has(current.id)) {
    if (current.managerId === actor.id) return true;
    visited.add(current.id);
    current = usersById.get(current.managerId);
  }
  return false;
}

export function permitsManagerAction(
  actor: AuthorizationActor,
  targetUserId: number,
  usersById: ReadonlyMap<number, UserRelationship>,
): boolean {
  if (hasRole(actor, ["admin", "ld"])) return true;
  if (actor.id === targetUserId || !hasRole(actor, ["manager", "director"])) return false;
  return permitsUserAccess(actor, targetUserId, usersById);
}

export function permitsManagerDashboard(
  actor: AuthorizationActor,
  requestedManagerId: number,
): boolean {
  return actor.id === requestedManagerId || hasRole(actor, ["admin", "ld"]);
}

export function permitsTeamReporting(actor: AuthorizationActor): boolean {
  return hasRole(actor, ["admin", "ld"]);
}

export function managerAssessmentFields(
  existing: { managerRating: string | null; managerComment: string | null } | undefined,
  submitted: { managerRating?: string | null; managerComment?: string | null },
  mayUpdateManagerFields: boolean,
) {
  if (!mayUpdateManagerFields && existing) {
    return {
      managerRating: existing.managerRating,
      managerComment: existing.managerComment,
    };
  }

  return {
    managerRating: submitted.managerRating ?? null,
    managerComment: submitted.managerComment ?? null,
  };
}