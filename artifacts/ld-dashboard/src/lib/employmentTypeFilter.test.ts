import assert from "node:assert/strict";
import test from "node:test";

import { matchesEmploymentType } from "./employmentTypeFilter.ts";

test("Perm includes permanent employees and excludes missing employment types", () => {
  assert.equal(matchesEmploymentType("perm", "perm"), true);
  assert.equal(matchesEmploymentType(null, "perm"), false);
});

test("Not set includes missing employment types and excludes permanent employees", () => {
  assert.equal(matchesEmploymentType(null, "unset"), true);
  assert.equal(matchesEmploymentType(undefined, "unset"), true);
  assert.equal(matchesEmploymentType("perm", "unset"), false);
});