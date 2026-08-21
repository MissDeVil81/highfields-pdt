import assert from "node:assert/strict";
import test from "node:test";
import {
  managerAssessmentFields,
  matchesProvisionedClerkIdentity,
  needsInitialAdministratorProvisioning,
  permitsManagerAction,
  permitsManagerDashboard,
  permitsTeamReporting,
  permitsUserAccess,
  requiresTemporaryPasswordChange,
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

test("requires a password change only while a temporary password is active", () => {
  assert.equal(requiresTemporaryPasswordChange(true), true);
  assert.equal(requiresTemporaryPasswordChange(false), false);
});

test("accepts only the Clerk identity provisioned by an administrator", () => {
  assert.equal(matchesProvisionedClerkIdentity("user_issued_by_admin", "user_issued_by_admin"), true);
  assert.equal(matchesProvisionedClerkIdentity("user_issued_by_admin", "user_created_elsewhere"), false);
  assert.equal(matchesProvisionedClerkIdentity(null, "user_created_elsewhere"), false);
});

test("does not reissue the first administrator login after it has been provisioned", () => {
  assert.equal(needsInitialAdministratorProvisioning(null, "private-temporary-password"), true);
  assert.equal(needsInitialAdministratorProvisioning("user_claire", "private-temporary-password"), false);
  assert.equal(needsInitialAdministratorProvisioning(null, undefined), false);
});