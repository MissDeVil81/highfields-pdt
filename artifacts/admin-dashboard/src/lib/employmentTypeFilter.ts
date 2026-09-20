export type EmploymentTypeFilter = "all" | "perm" | "contract" | "unset";

export function matchesEmploymentType(
  recruitmentType: string | null | undefined,
  filter: EmploymentTypeFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "unset") return !recruitmentType;
  return recruitmentType === filter;
}