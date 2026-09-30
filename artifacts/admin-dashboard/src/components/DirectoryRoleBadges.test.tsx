import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DirectoryRoleBadges } from "./DirectoryRoleBadges";

test("directory shows every assigned role and falls back to raw unknown labels", () => {
  const html = renderToStaticMarkup(<DirectoryRoleBadges roles={["employee", "manager", "director", "admin", "ld", "custom"]} />);
  for (const label of ["Employee", "Manager", "Director", "Admin", "L&amp;D", "custom"]) {
    assert.ok(html.includes(`>${label}</div>`), `missing role label ${label}`);
  }
  assert.ok(html.indexOf(">Manager</div>") < html.indexOf(">Admin</div>"));
  assert.equal(renderToStaticMarkup(<DirectoryRoleBadges roles={[]} />).includes("Employee"), false);
});