import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/identify", async (req, res) => {
  const email = (req.query.email as string | undefined)?.toLowerCase().trim();
  if (!email) return res.status(400).json({ error: "email is required" });

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email));

  if (!user) return res.status(404).json({ error: "No user found with that email address. Please contact your admin." });

  return res.json(user);
});

export default router;
