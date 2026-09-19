import assert from "node:assert/strict";
import test from "node:test";
import {
  getDashboardCategoryCount,
  getDashboardCategoryMembers,
} from "./dashboardCategories";

const team = [
  { id: 1, probationStatus: "in_progress", isPendingReview: true, hasPublishedReview: false },
  { id: 2, probationStatus: "in_progress", isPendingReview: false, hasPublishedReview: true },
  { id: 3, probationStatus: "completed", isPendingReview: false, hasPublishedReview: false },
] as Parameters<typeof getDashboardCategoryMembers>[0];

const stats = {
  totalTeam: 3,
  inProbation: 2,
  pendingReviews: 1,
  publishedReviews: 1,
  needingAttention: 0,
  activeDevelopmentPlans: 0,
  passiveDevelopmentPlans: 0,
  missingDevelopmentPlans: 0,
};

test("filters each dashboard category to the members represented by its total", () => {
  assert.deepEqual(
    getDashboardCategoryMembers(team, "inProbation").map((member) => member.id),
    [1, 2],
  );
  assert.deepEqual(
    getDashboardCategoryMembers(team, "pendingReviews").map((member) => member.id),
    [1],
  );
  assert.deepEqual(
    getDashboardCategoryMembers(team, "publishedReviews").map((member) => member.id),
    [2],
  );

  for (const category of ["inProbation", "pendingReviews", "publishedReviews"] as const) {
    assert.equal(
      getDashboardCategoryMembers(team, category).length,
      getDashboardCategoryCount(stats, category),
    );
  }
});

test("returns an empty list for an empty category", () => {
  const noReviews = team.map((member) => ({
    ...member,
    isPendingReview: false,
    hasPublishedReview: false,
  }));

  assert.deepEqual(getDashboardCategoryMembers(noReviews, "pendingReviews"), []);
  assert.deepEqual(getDashboardCategoryMembers(noReviews, "publishedReviews"), []);
});