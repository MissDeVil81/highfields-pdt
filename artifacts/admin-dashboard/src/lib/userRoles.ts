export const SELECTABLE_ROLES = [
  { value: "employee", label: "Employee" },
  { value: "manager", label: "Manager" },
  { value: "director", label: "Director" },
  { value: "admin", label: "Admin" },
  { value: "ld", label: "L&D" },
] as const;

export const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  SELECTABLE_ROLES.map(({ value, label }) => [value, label]),
);

export function getActiveAdminUsers<T extends { roles: readonly string[]; isActive: string }>(
  users: readonly T[],
): T[] {
  return users.filter((user) => user.isActive === "active" && user.roles.includes("admin"));
}

export function getEditableRoles(roles: readonly string[]): string[] {
  return [...roles];
}

export function isRoleSelected(roles: readonly string[], role: string): boolean {
  return roles.includes(role);
}

export function setRoleSelected(
  roles: readonly string[],
  role: string,
  selected: boolean,
): string[] {
  if (selected) return roles.includes(role) ? [...roles] : [...roles, role];
  return roles.filter((currentRole) => currentRole !== role);
}

export function buildRolesPayload(roles: readonly string[]): { roles: string[] } {
  return { roles: [...roles] };
}

export function matchesRoleFilter(roles: readonly string[], roleFilter: string): boolean {
  return roleFilter === "all" || roles.includes(roleFilter);
}

export function getRoleLabels(
  roles: readonly string[],
  labels: Record<string, string>,
): Array<{ role: string; label: string }> {
  return roles.map((role) => ({ role, label: labels[role] ?? role }));
}