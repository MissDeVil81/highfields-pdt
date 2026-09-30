import assert from "node:assert/strict";
import test from "node:test";
import {
  ROLE_LABELS,
  buildRolesPayload,
  getActiveAdminUsers,
  getEditableRoles,
  getRoleLabels,
  isRoleSelected,
  matchesRoleFilter,
  setRoleSelected,
} from "./userRoles";

test("admin picker includes active multi-role admins only", () => {
  const users = [
    { id: 1, roles: ["manager", "admin"], isActive: "active" },
    { id: 2, roles: ["admin"], isActive: "inactive" },
    { id: 3, roles: ["manager"], isActive: "active" },
  ];
  assert.deepEqual(getActiveAdminUsers(users).map((user) => user.id), [1]);
});

test("role editing retains existing and unknown roles without mutating the source", () => {
  const original = ["manager", "admin", "custom"];
  const editable = getEditableRoles(original);
  assert.deepEqual(editable, original);
  assert.notStrictEqual(editable, original);
  assert.equal(isRoleSelected(editable, "admin"), true);
  assert.equal(isRoleSelected(editable, "employee"), false);

  const withDirector = setRoleSelected(editable, "director", true);
  assert.deepEqual(withDirector, ["manager", "admin", "custom", "director"]);
  assert.deepEqual(setRoleSelected(withDirector, "admin", true), withDirector);
  assert.deepEqual(setRoleSelected(withDirector, "admin", false), ["manager", "custom", "director"]);
  assert.deepEqual(original, ["manager", "admin", "custom"]);

  const payload = buildRolesPayload(withDirector);
  assert.deepEqual(payload, { roles: withDirector });
  assert.notStrictEqual(payload.roles, withDirector);
});

test("every assigned role matches its filter and unknown labels stay readable", () => {
  const roles = ["manager", "admin", "custom"];
  for (const role of roles) assert.equal(matchesRoleFilter(roles, role), true);
  assert.equal(matchesRoleFilter(roles, "all"), true);
  assert.equal(matchesRoleFilter(roles, "employee"), false);
  assert.deepEqual(getRoleLabels(roles, ROLE_LABELS), [
    { role: "manager", label: "Manager" },
    { role: "admin", label: "Admin" },
    { role: "custom", label: "custom" },
  ]);
});