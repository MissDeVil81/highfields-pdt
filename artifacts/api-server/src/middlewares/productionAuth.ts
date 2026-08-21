import type { NextFunction, Request, Response } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { db, RESOLVED_APP_ENV, usersTable, type User } from "@workspace/db";
import { and, eq, or } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      appUser?: User;
    }
  }
}

const isProduction = () => RESOLVED_APP_ENV === "production";

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
        or(eq(usersTable.clerkUserId, clerkUserId), eq(usersTable.email, email)),
      ),
    );

  if (!appUser) {
    return {
      status: 403,
      error: "Your account has not been approved. Please contact an administrator.",
    };
  }

  if (appUser.clerkUserId && appUser.clerkUserId !== clerkUserId) {
    return { status: 403, error: "This account is linked to a different sign-in." };
  }

  if (!appUser.clerkUserId) {
    const [linkedUser] = await db
      .update(usersTable)
      .set({ clerkUserId, updatedAt: new Date() })
      .where(eq(usersTable.id, appUser.id))
      .returning();
    return { user: linkedUser };
  }

  return { user: appUser };
}

export async function requireApprovedProductionUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!isProduction()) {
    next();
    return;
  }

  const resolved = await resolveProductionUser(req);
  if (!("user" in resolved)) {
    res.status(resolved.status).json({ error: resolved.error });
    return;
  }

  req.appUser = resolved.user;
  next();
}

export function hasAnyRole(user: User, roles: readonly string[]): boolean {
  return user.roles.some((role) => roles.includes(role));
}

export function requireProductionRoles(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!isProduction() || (req.appUser && hasAnyRole(req.appUser, roles))) {
      next();
      return;
    }
    res.status(403).json({ error: "You do not have permission to access this area." });
  };
}

export function requireProductionWriteRoles(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (
      !isProduction() ||
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
  if (!isProduction()) return true;
  const actor = req.appUser;
  if (!actor) return false;
  if (actor.id === targetUserId || hasAnyRole(actor, ["admin", "ld"])) return true;
  if (!hasAnyRole(actor, ["manager", "director"])) return false;

  const users = await db.select().from(usersTable);
  const byId = new Map(users.map((user) => [user.id, user]));
  let current = byId.get(targetUserId);
  const visited = new Set<number>();
  while (current?.managerId && !visited.has(current.id)) {
    if (current.managerId === actor.id) return true;
    visited.add(current.id);
    current = byId.get(current.managerId);
  }
  return false;
}