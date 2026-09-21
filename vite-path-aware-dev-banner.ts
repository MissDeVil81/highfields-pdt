import type { Plugin } from "vite";

function normaliseBasePath(basePath: string): string {
  const withLeadingSlash = basePath.startsWith("/") ? basePath : `/${basePath}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

function bannerScriptPath(basePath: string): string {
  return `${normaliseBasePath(basePath)}@replit/dev-banner/banner-script.js`;
}

function bannerStylesPath(basePath: string): string {
  return `${normaliseBasePath(basePath)}@replit/dev-banner/banner-styles.css`;
}

const bannerScript = `
(() => {
  const dismissedKey = "replit-development-banner-dismissed";
  const bannerId = "replit-development-banner";

  function shouldShow() {
    if (!window.location.hostname.endsWith(".replit.dev")) return false;
    if (window.self !== window.top) return false;
    return window.localStorage.getItem(dismissedKey) !== "true";
  }

  function mount() {
    if (!shouldShow() || document.getElementById(bannerId)) return;

    const banner = document.createElement("aside");
    banner.id = bannerId;
    banner.setAttribute("role", "status");
    banner.innerHTML = \`
      <span>⚠ DEVELOPMENT ENVIRONMENT — Data is for testing only</span>
      <button type="button" aria-label="Dismiss development environment warning">×</button>
    \`;

    banner.querySelector("button")?.addEventListener("click", () => {
      window.localStorage.setItem(dismissedKey, "true");
      banner.remove();
    });

    document.body.prepend(banner);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }
})();
`;

const bannerStyles = `
#replit-development-banner {
  align-items: center;
  background: #dc2626;
  box-sizing: border-box;
  color: #ffffff;
  display: flex;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 0.875rem;
  font-weight: 600;
  gap: 0.75rem;
  justify-content: center;
  letter-spacing: 0.025em;
  min-height: 2rem;
  padding: 0.375rem 3rem 0.375rem 1rem;
  position: relative;
  text-align: center;
  width: 100%;
  z-index: 2147483647;
}

#replit-development-banner button {
  background: transparent;
  border: 0;
  color: inherit;
  cursor: pointer;
  font-size: 1.25rem;
  line-height: 1;
  padding: 0.125rem 0.375rem;
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
}

#replit-development-banner button:focus-visible {
  outline: 2px solid #ffffff;
  outline-offset: 2px;
}
`;

export function pathAwareDevBanner(basePath: string): Plugin {
  const scriptPath = bannerScriptPath(basePath);
  const stylesPath = bannerStylesPath(basePath);

  return {
    name: "path-aware-replit-dev-banner",
    apply: "serve",
    enforce: "pre",

    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const requestPath = request.url?.split("?", 1)[0];

        if (requestPath === scriptPath) {
          response.statusCode = 200;
          response.setHeader("Content-Type", "application/javascript");
          response.end(bannerScript);
          return;
        }

        if (requestPath === stylesPath) {
          response.statusCode = 200;
          response.setHeader("Content-Type", "text/css");
          response.end(bannerStyles);
          return;
        }

        next();
      });
    },

    transformIndexHtml(html, context) {
      if (!context.server) return html;

      return [
        {
          tag: "link",
          attrs: {
            rel: "stylesheet",
            href: stylesPath,
            id: "replit-development-banner-styles",
          },
          injectTo: "head",
        },
        {
          tag: "script",
          attrs: {
            type: "text/javascript",
            src: scriptPath,
            id: "replit-development-banner-script",
          },
          injectTo: "head",
        },
      ];
    },
  };
}