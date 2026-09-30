import assert from "node:assert/strict";
import test from "node:test";
import { getMembersInProbation, isOnProbation } from "./index";

test("recognises current and legacy probation statuses but not unrelated statuses", () => {
  assert.equal(isOnProbation("in_probation"), true);
  assert.equal(isOnProbation("in_progress"), true);
  assert.equal(isOnProbation("passed"), false);
  assert.equal(isOnProbation(null), false);
});

test("the member set used for the API probation count includes both statuses", () => {
  const members = [
    { probationStatus: "in_probation" },
    { probationStatus: "in_progress" },
    { probationStatus: "passed" },
  ];
  assert.equal(getMembersInProbation(members).length, 2);
});