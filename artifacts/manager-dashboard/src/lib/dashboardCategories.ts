import type {
  ManagerDashboardStats,
  ManagerTeamMember,
} from "@workspace/api-client-react";

export type DashboardCategory =
  | "inProbation"
  | "pendingReviews"
  | "publishedReviews";

export function getDashboardCategoryMembers(
  team: ManagerTeamMember[],
  category: DashboardCategory,
): ManagerTeamMember[] {
  switch (category) {
    case "inProbation":
      return team.filter((member) => member.probationStatus === "in_progress");
    case "pendingReviews":
      return team.filter((member) => member.isPendingReview);
    case "publishedReviews":
      return team.filter((member) => member.hasPublishedReview);
  }
}

export function getDashboardCategoryCount(
  stats: ManagerDashboardStats | undefined,
  category: DashboardCategory,
): number | undefined {
  if (!stats) return undefined;

  switch (category) {
    case "inProbation":
      return stats.inProbation;
    case "pendingReviews":
      return stats.pendingReviews;
    case "publishedReviews":
      return stats.publishedReviews;
  }
}