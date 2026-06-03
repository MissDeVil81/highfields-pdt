import { Router } from "express";
import { db, probationItemsTable } from "@workspace/db";
import { asc } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  const items = await db
    .select()
    .from(probationItemsTable)
    .orderBy(asc(probationItemsTable.sectionOrder), asc(probationItemsTable.itemOrder));
  res.json(items);
});

export default router;
