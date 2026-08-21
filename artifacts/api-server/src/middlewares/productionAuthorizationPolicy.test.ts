import assert from "node:assert/strict";
import test from "node:test";
import {
  managerAssessmentFields,
  permitsManagerAction,
  permitsManagerDashboard,
  permitsTeamReporting,
  permitsUserAccess,
} from "./productionAuthorizationPolicy";

const users = new Map([
  [1, { id: 1, managerId: null }],
  [2, { id: 2, managerId: 1 }],
  [3, { id: 3, managerId: 1 }],
  [4, { id: 4, managerId: 2 }],
]);

test("rejects an employee-supplied user or record owner ID for another employee", () => {
  const employee = { id: 2, roles: ["employee"] };
  assert.equal(permitsUserAccess(employee, 2, users), true);
  assert.equal(permitsUserAccess(employee, 3, users), false);
  assert.equal(permitsUserAccess(employee, 4, users), false);
});

test("allows a manager only within their reporting hierarchy", () => {
  const manager = { id: 2, roles: ["manager"] };
  assert.equal(permitsUserAccess(manager, 4, users), true);
  assert.equal(permitsUserAccess(manager, 3, users), false);
  assert.equal(permitsManagerAction(manager, 4, users), true);
  assert.equal(permitsManagerAction(manager, 2, users), false);
});

test("binds a manager dashboard request to the authenticated manager ID", () => {
  const manager = { id: 2, roles: ["manager"] };
  const ld = { id: 9, roles: ["ld"] };
  assert.equal(permitsManagerDashboard(manager, 2), true);
  assert.equal(permitsManagerDashboard(manager, 1), false);
  assert.equal(permitsManagerDashboard(ld, 1), true);
});

test("limits team-wide reporting to L&D and administrators", () => {
  assert.equal(permitsTeamReporting({ id: 2, roles: ["manager"] }), false);
  assert.equal(permitsTeamReporting({ id: 8, roles: ["ld"] }), true);
  assert.equal(permitsTeamReporting({ id: 9, roles: ["admin"] }), true);
});

test("preserves manager-only assessment fields during an employee update", () => {
  const existing = { managerRating: "green", managerComment: "Strong progress" };
  assert.deepEqual(
    managerAssessmentFields(existing, {}, false),
    existing,
  );
  assert.deepEqual(
    managerAssessmentFields(existing, { managerRating: "amber", managerComment: "Follow up" }, true),
    { managerRating: "amber", managerComment: "Follow up" },
  );
});