import { Router } from "express";
import { clerkClient } from "@clerk/express";
import { db, RESOLVED_APP_ENV, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { resolveProductionUser } from "../middlewares/productionAuth";

const router = Router();
const changeTemporaryPasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

router.get("/me", async (req, res) => {
  if (RESOLVED_APP_ENV !== "production") {
    res.status(404).json({ error: "This endpoint is only used for production authentication." });
    return;
  }

  const resolved = await resolveProductionUser(req);
  if (!("user" in resolved)) {
    res.status(resolved.status).json({ error: resolved.error });
    return;
  }

  res.json(resolved.user);
});

router.post("/change-temporary-password", async (req, res) => {
  if (RESOLVED_APP_ENV !== "production") {
    return res.status(404).json({ error: "This endpoint is only used for production authentication." });
  }

  const result = changeTemporaryPasswordSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: "Enter your current temporary password and a new password of at least 8 characters." });
  }

  const resolved = await resolveProductionUser(req);
  if (!("user" in resolved)) {
    return res.status(resolved.status).json({ error: resolved.error });
  }
  const user = resolved.user;
  if (!user || !user.mustChangePassword || !user.clerkUserId) {
    return res.status(400).json({ error: "A temporary password change is not required for this account." });
  }

  try {
    await clerkClient.users.verifyPassword({
      userId: user.clerkUserId,
      password: result.data.currentPassword,
    });
    await clerkClient.users.updateUser(user.clerkUserId, {
      password: result.data.newPassword,
      signOutOfOtherSessions: false,
    });
    await db
      .update(usersTable)
      .set({ mustChangePassword: false, updatedAt: new Date() })
      .where(eq(usersTable.id, user.id));
    return res.status(204).send();
  } catch (error) {
    req.log?.warn({ err: error, userId: user.id }, "Temporary password change was rejected");
    return res.status(400).json({ error: "Your temporary password or new password could not be accepted." });
  }
});

export default router;
