import type { ProbationManagerReview } from "@workspace/db";

export interface ManagerReviewFlags {
  isPendingReview: boolean;
  hasPublishedReview: boolean;
}

/**
 * Keep the member-level review flags in sync with the dashboard totals.
 *
 * The dashboard only reports review categories for people who are currently
 * in probation. A review without a date is treated as published immediately,
 * while an invalid date is ignored for pending reviews and treated as already
 * due for published reviews, matching the existing dashboard behavior.
 */
export function getManagerReviewFlags(
  probationStatus: string | null,
  reviews: ProbationManagerReview[],
  now: Date,
): ManagerReviewFlags {
  if (probationStatus !== "in_progress") {
    return { isPendingReview: false, hasPublishedReview: false };
  }

  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const hasScheduledPending = reviews.some((review) => {
    if (review.publishedAt !== null || !review.reviewDate) return false;

    const reviewDate = new Date(review.reviewDate);
    return (
      !Number.isNaN(reviewDate.getTime()) &&
      reviewDate >= now &&
      reviewDate <= sevenDaysFromNow
    );
  });

  const hasPublishedReview = reviews.some((review) => {
    if (!review.publishedAt) return false;
    if (!review.reviewDate) return true;

    const reviewDate = new Date(review.reviewDate);
    return Number.isNaN(reviewDate.getTime()) || reviewDate <= now;
  });

  return {
    isPendingReview: hasScheduledPending || reviews.length === 0,
    hasPublishedReview,
  };
}