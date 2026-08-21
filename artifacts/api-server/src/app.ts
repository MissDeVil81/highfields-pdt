import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import router from "./routes";
import { logger } from "./lib/logger";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
} from "./middlewares/clerkProxyMiddleware";
import { RESOLVED_APP_ENV } from "@workspace/db";

const app: Express = express();
const productionOrigins = new Set([
  "https://career-path-planner-josiemhughes.replit.app",
  ...(
    process.env.PRODUCTION_ALLOWED_ORIGINS?.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean) ?? []
  ),
]);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use(
  cors(
    RESOLVED_APP_ENV === "production"
      ? {
          credentials: true,
          origin(origin, callback) {
            // Requests without an Origin header are same-origin/server-to-server.
            callback(null, !origin || productionOrigins.has(origin));
          },
        }
      : { credentials: true, origin: true },
  ),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Keep the artifact-level liveness probe independent from Clerk and database
// startup. Replit may call /api before an authenticated request context exists.
app.get("/api", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(clerkMiddleware());

app.use("/api", router);

export default app;
