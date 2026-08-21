import type { NextFunction, Request, Response } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { db, RESOLVED_APP_ENV, usersTable, type User } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import {
  matchesProvisionedClerkIdentity,
  permitsManagerAction,
  permitsManagerDashboard,
  permitsUserAccess,
  requiresTemporaryPasswordChange,
} from "./productionAuthorizationPolicy";

declare global {
  namespace Express {
    interface Request {
      appUser?: User;
      /**
       * A trusted user directory supplied by an authentication adapter.
       * Production authentication leaves this unset and uses the database;
       * the route integration harness supplies an isolated fixture directory.
       */
      productionAuthorizationUsers?: readonly User[];
    }
  }
}

export const isProductionEnvironment = () => RESOLVED_APP_ENV === "production";

async function verifiedPrimaryEmail(clerkUserId: string): Promise<string | null> {
  const clerkUser = await clerkClient.users.getUser(clerkUserId);
  const primary = clerkUser.emailAddresses.find(
    (address) => address.id === clerkUser.primaryEmailAddressId,
  );
  if (!primary || primary.verification?.status !== "verified") return null;
  return primary.emailAddress.trim().toLowerCase();
}

export async function resolveProductionUser(
  req: Request,
): Promise<{ user?: User; status: 401 | 403; error: string } | { user: User }> {
  const { userId: clerkUserId } = getAuth(req);
  if (!clerkUserId) {
    return { status: 401, error: "Sign in is required." };
  }

  const email = await verifiedPrimaryEmail(clerkUserId);
  if (!email) {
    return { status: 403, error: "Please verify your email address before continuing." };
  }

  const [appUser] = await db
    .select()
    .from(usersTable)
    .where(
      and(
        eq(usersTable.isActive, "active"),
        eq(usersTable.clerkUserId, clerkUserId),
      ),
    );

  if (!appUser) {
    return {
      status: 403,
      error: "Your account has not been approved. Please contact an administrator.",
    };
  }

  if (!matchesProvisionedClerkIdentity(appUser.clerkUserId, clerkUserId)) {
    return { status: 403, error: "This account is linked to a different sign-in." };
  }

  if (!appUser.email || appUser.email.trim().toLowerCase() !== email) {
    return { status: 403, error: "Your signed-in email does not match the approved work email for this account." };
  }

  return { user: appUser };
}

export async function requireApprovedProductionUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!isProductionEnvironment()) {
    next();
    return;
  }

  const resolved = await resolveProductionUser(req);
  if (!("user" in resolved)) {
    res.status(resolved.status).json({ error: resolved.error });
    return;
  }
  const appUser = resolved.user;
  if (!appUser) {
    res.status(403).json({ error: "Your account could not be resolved." });
    return;
  }
  if (requiresTemporaryPasswordChange(appUser.mustChangePassword)) {
    res.status(403).json({
      error: "You must choose a new password before using the system.",
      code: "PASSWORD_CHANGE_REQUIRED",
    });
    return;
  }

  req.appUser = appUser;
  next();
}

export function hasAnyRole(user: User, roles: readonly string[]): boolean {
  return user.roles.some((role) => roles.includes(role));
}

export function requireProductionRoles(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!isProductionEnvironment() || (req.appUser && hasAnyRole(req.appUser, roles))) {
      next();
      return;
    }
    res.status(403).json({ error: "You do not have permission to access this area." });
  };
}

export function requireProductionWriteRoles(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (
      !isProductionEnvironment() ||
      req.method === "GET" ||
      req.method === "HEAD" ||
      (req.appUser && hasAnyRole(req.appUser, roles))
    ) {
      next();
      return;
    }
    res.status(403).json({ error: "You do not have permission to make this change." });
  };
}

export async function canAccessProductionUser(
  req: Request,
  targetUserId: number,
): Promise<boolean> {
  if (!isProductionEnvironment()) return true;
  const actor = req.appUser;
  if (!actor) return false;

  const users = req.productionAuthorizationUsers
    ? req.productionAuthorizationUsers
    : await db.select().from(usersTable);
  const byId = new Map(users.map((user) => [user.id, user]));
  return permitsUserAccess(actor, targetUserId, byId);
}

/**
 * Enforces user-scoped access at the route boundary. In production, a caller
 * can access their own record, users in their reporting hierarchy (manager or
 * director), or any user when they are L&D/admin.
 */
export async function requireProductionUserAccess(
  req: Request,
  res: Response,
  targetUserId: number,
  action = "access this person's information",
): Promise<boolean> {
  if (await canAccessProductionUser(req, targetUserId)) return true;
  res.status(403).json({ error: `You do not have permission to ${action}.` });
  return false;
}

/**
 * Manager-only changes such as probation reviews cannot be performed by the
 * employee who is the subject of the review.
 */
export async function canManageProductionUser(req: Request, targetUserId: number): Promise<boolean> {
  if (!isProductionEnvironment()) return true;
  const actor = req.appUser;
  if (!actor) return false;
  const users = req.productionAuthorizationUsers
    ? req.productionAuthorizationUsers
    : await db.select().from(usersTable);
  const byId = new Map(users.map((user) => [user.id, user]));
  return permitsManagerAction(actor, targetUserId, byId);
}

export async function requireProductionManagementAccess(
  req: Request,
  res: Response,
  targetUserId: number,
  action = "manage this person's review",
): Promise<boolean> {
  if (await canManageProductionUser(req, targetUserId)) return true;
  res.status(403).json({ error: `You do not have permission to ${action}.` });
  return false;
}

/**
 * A manager dashboard is always scoped to the authenticated manager. L&D and
 * admins have a deliberate broader reporting view.
 */
export function canAccessProductionManager(req: Request, managerId: number): boolean {
  if (!isProductionEnvironment()) return true;
  const actor = req.appUser;
  return Boolean(actor && permitsManagerDashboard(actor, managerId));
}