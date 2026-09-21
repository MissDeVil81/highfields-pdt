import { strict as assert } from "node:assert";
import test from "node:test";

import {
  extractResourceUrls,
  validatePreviewHtml,
} from "./checkDashboardAssetRoutes";

test("accepts resources scoped to the artifact base path", () => {
  const html = `
    <script type="module" src="/admin/@vite/client"></script>
    <script type="module" src="/admin/src/main.tsx"></script>
    <link rel="icon" href="/admin/favicon.svg">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter">
  `;

  assert.deepEqual(extractResourceUrls(html), [
    "/admin/@vite/client",
    "/admin/src/main.tsx",
    "/admin/favicon.svg",
    "https://fonts.googleapis.com/css2?family=Inter",
  ]);
  assert.deepEqual(validatePreviewHtml(html, "/admin/", "http://127.0.0.1/admin/"), []);
});

test("rejects root-scoped development resources", () => {
  const html = `
    <script type="module" src="/@vite/client"></script>
    <script type="module" src="/ld-dashboard/src/main.tsx"></script>
  `;

  assert.deepEqual(validatePreviewHtml(html, "/ld-dashboard/"), [
    {
      resource: "/@vite/client",
      message: "Local resource must stay under /ld-dashboard/.",
    },
  ]);
});

test("rejects invalid local resource URLs", () => {
  const html = '<script src="http://[invalid-url"></script>';

  assert.deepEqual(validatePreviewHtml(html, "/admin/"), [
    {
      resource: "http://[invalid-url",
      message: "Resource URL is not valid.",
    },
  ]);
});