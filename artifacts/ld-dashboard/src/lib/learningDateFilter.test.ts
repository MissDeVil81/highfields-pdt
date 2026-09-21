import assert from "node:assert/strict";
import test from "node:test";

import {
  matchesLearningFilters,
  normaliseLearningDate,
  type LearningFilters,
} from "./learningDateFilter.ts";

const boundedFilters: LearningFilters = {
  search: "",
  fromDate: "2026-09-01",
  toDate: "2026-09-30",
};

test("normalises supported ISO and UK dates without timezone conversion", () => {
  assert.equal(normaliseLearningDate("2026-09-01"), "2026-09-01");
  assert.equal(normaliseLearningDate("2026-09-30T23:30:00-05:00"), "2026-09-30");
  assert.equal(normaliseLearningDate("1/9/2026"), "2026-09-01");
  assert.equal(normaliseLearningDate("30/09/26"), "2026-09-30");
});

test("rejects blank, unsupported, and invalid calendar dates", () => {
  for (const value of ["", "  ", "September 1, 2026", "not-a-date", "2026-02-30", "31/09/2026"]) {
    assert.equal(normaliseLearningDate(value), null, value);
  }
});

test("includes ISO and UK boundary dates for every employee learning record type", () => {
  const recordDates = {
    companyLearning: ["2026-09-01", "2026-09-30T23:30:00-05:00"],
    individualLearning: ["01/09/2026", "30/09/2026"],
    ldFeedback: ["1/9/26", "30/9/26"],
  };

  for (const [recordType, dates] of Object.entries(recordDates)) {
    for (const date of dates) {
      assert.equal(matchesLearningFilters(boundedFilters, recordType, date), true, `${recordType}: ${date}`);
    }
  }
});

test("excludes dates outside the inclusive range", () => {
  assert.equal(matchesLearningFilters(boundedFilters, "", "2026-08-31"), false);
  assert.equal(matchesLearningFilters(boundedFilters, "", "01/10/2026"), false);
});

test("excludes blank and invalid dates from a bounded result", () => {
  for (const value of ["", " ", "invalid", "2026-09-31", "31/09/2026"]) {
    assert.equal(matchesLearningFilters(boundedFilters, "", value), false, value);
  }
});

test("keeps undated records when no date bound is active", () => {
  assert.equal(
    matchesLearningFilters({ search: "course", fromDate: "", toDate: "" }, "Course notes", ""),
    true,
  );
});