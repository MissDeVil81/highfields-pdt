import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RoleBadges } from "./RoleBadges";

function badges(html: string) {
  return [...html.matchAll(/<div class="([^"]+)">([^<]*)<\/div>/g)]
    .map(([, className, role]) => ({ className, role }));
}

test("team badges render all roles in order with secondary styling", () => {
  const rendered = badges(renderToStaticMarkup(<RoleBadges roles={["manager", "admin"]} context="team" />));
  assert.deepEqual(rendered.map(({ role }) => role), ["manager", "admin"]);
  assert.ok(rendered.every(({ className }) => className.includes("bg-secondary")));
});

test("hierarchy badges give each role its own variant", () => {
  const rendered = badges(renderToStaticMarkup(
    <RoleBadges roles={["admin", "manager", "director", "ld"]} context="hierarchy" />,
  ));
  assert.deepEqual(rendered.map(({ role }) => role), ["admin", "manager", "director", "ld"]);
  assert.match(rendered[0].className, /bg-destructive/);
  assert.match(rendered[1].className, /bg-primary/);
  assert.match(rendered[2].className, /badge-outline/);
  assert.match(rendered[3].className, /bg-secondary/);
});

test("single roles stay single and missing roles default to employee in both contexts", () => {
  assert.deepEqual(
    badges(renderToStaticMarkup(<RoleBadges roles={["admin"]} context="hierarchy" />)).map(({ role }) => role),
    ["admin"],
  );
  for (const context of ["team", "hierarchy"] as const) {
    assert.deepEqual(badges(renderToStaticMarkup(<RoleBadges roles={[]} context={context} />)).map(({ role }) => role), ["employee"]);
    assert.deepEqual(badges(renderToStaticMarkup(<RoleBadges roles={null} context={context} />)).map(({ role }) => role), ["employee"]);
  }
});