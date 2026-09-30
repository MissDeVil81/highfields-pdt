/** Both persisted values represent an employee currently on probation. */
export function isOnProbation(status: string | null | undefined): boolean {
  return status === "in_probation" || status === "in_progress";
}

export function getMembersInProbation<T extends { probationStatus?: string | null }>(
  members: readonly T[],
): T[] {
  return members.filter((member) => isOnProbation(member.probationStatus));
}