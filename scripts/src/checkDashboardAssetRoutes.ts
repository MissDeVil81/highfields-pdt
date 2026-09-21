import { pathToFileURL } from "node:url";

type DashboardTarget = {
  name: string;
  basePath: string;
  port: number;
};

export type AssetRouteIssue = {
  resource: string;
  message: string;
};

const dashboardTargets: DashboardTarget[] = [
  {
    name: "Admin Dashboard",
    basePath: "/admin/",
    port: Number(process.env.ADMIN_DASHBOARD_PORT ?? 22133),
  },
  {
    name: "L&D Dashboard",
    basePath: "/ld-dashboard/",
    port: Number(process.env.LD_DASHBOARD_PORT ?? 20248),
  },
];

const resourceAttributePattern =
  /<(?:script|link|img|source|video|audio)\b[^>]*?\b(?:src|href)\s*=\s*["']([^"']+)["']/gi;

function normaliseBasePath(basePath: string): string {
  const withLeadingSlash = basePath.startsWith("/") ? basePath : `/${basePath}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

export function extractResourceUrls(html: string): string[] {
  return [...html.matchAll(resourceAttributePattern)].map(match => match[1]);
}

export function validatePreviewHtml(
  html: string,
  basePath: string,
  pageUrl = "http://127.0.0.1/",
): AssetRouteIssue[] {
  const expectedBasePath = normaliseBasePath(basePath);
  const expectedWithoutTrailingSlash = expectedBasePath.slice(0, -1);
  const resources = extractResourceUrls(html);
  const issues: AssetRouteIssue[] = [];

  if (resources.length === 0) {
    return [
      {
        resource: "<document>",
        message: "Preview HTML did not contain any local resource URLs.",
      },
    ];
  }

  for (const resource of resources) {
    if (
      resource.startsWith("data:") ||
      resource.startsWith("blob:") ||
      resource.startsWith("#")
    ) {
      continue;
    }

    let resolved: URL;
    try {
      resolved = new URL(resource, pageUrl);
    } catch {
      issues.push({
        resource,
        message: "Resource URL is not valid.",
      });
      continue;
    }

    if (resolved.origin !== new URL(pageUrl).origin) {
      continue;
    }

    const isWithinArtifact =
      resolved.pathname === expectedWithoutTrailingSlash ||
      resolved.pathname.startsWith(expectedBasePath);

    if (!isWithinArtifact) {
      issues.push({
        resource,
        message: `Local resource must stay under ${expectedBasePath}.`,
      });
    }
  }

  return issues;
}

async function checkDashboard(target: DashboardTarget): Promise<string[]> {
  const basePath = normaliseBasePath(target.basePath);
  const pageUrl = `http://127.0.0.1:${target.port}${basePath}`;

  try {
    const response = await fetch(pageUrl, {
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      return [`${pageUrl} returned HTTP ${response.status}.`];
    }

    const html = await response.text();
    return validatePreviewHtml(html, basePath, pageUrl).map(
      issue => `${issue.resource}: ${issue.message}`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return [`Could not fetch ${pageUrl}: ${message}`];
  }
}

export async function runDashboardAssetRouteCheck(
  targets: DashboardTarget[] = dashboardTargets,
): Promise<number> {
  const results = await Promise.all(
    targets.map(async target => ({
      target,
      issues: await checkDashboard(target),
    })),
  );

  let hasFailures = false;
  for (const { target, issues } of results) {
    if (issues.length > 0) {
      hasFailures = true;
      console.error(`✗ ${target.name} asset route check failed`);
      for (const issue of issues) {
        console.error(`  - ${issue}`);
      }
      continue;
    }

    console.log(`✓ ${target.name} asset routes stay under ${target.basePath}`);
  }

  return hasFailures ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const exitCode = await runDashboardAssetRouteCheck();
  process.exitCode = exitCode;
}