import assert from "node:assert/strict";
import test from "node:test";
import { getManagerReviewFlags } from "./managerProbation";

const now = new Date("2026-09-19T12:00:00.000Z");

function review(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    userId: 10,
    reviewPeriod: "3 Months",
    goingWell: null,
    developmentAreas: null,
    reviewStatus: null,
    reviewDate: null,
    publishedAt: null,
    managerEditable: false,
    publicationHistory: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as Parameters<typeof getManagerReviewFlags>[1][number];
}

test("flags an in-probation member with no review as pending", () => {
  assert.deepEqual(getManagerReviewFlags("in_progress", [], now), {
    isPendingReview: true,
    hasPublishedReview: false,
  });
});

test("uses the same date rules for pending and published flags", () => {
  const pending = review({ reviewDate: "2026-09-25" });
  const published = review({
    id: 2,
    reviewDate: "2026-09-18",
    publishedAt: now,
  });

  assert.deepEqual(getManagerReviewFlags("in_progress", [pending, published], now), {
    isPendingReview: true,
    hasPublishedReview: true,
  });
});

test("does not include completed probation members in either category", () => {
  const published = review({ reviewDate: "2026-09-18", publishedAt: now });

  assert.deepEqual(getManagerReviewFlags("completed", [published], now), {
    isPendingReview: false,
    hasPublishedReview: false,
  });
});

test("does not count a future published review until its review date", () => {
  const published = review({ reviewDate: "2026-09-25", publishedAt: now });

  assert.deepEqual(getManagerReviewFlags("in_progress", [published], now), {
    isPendingReview: false,
    hasPublishedReview: false,
  });
});