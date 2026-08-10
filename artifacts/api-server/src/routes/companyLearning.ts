import { Router } from "express";
import { pool } from "@workspace/db";

const router = Router();

// GET /api/company-learning
router.get("/", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, date_of_learning AS "dateOfLearning", trainer, description,
              created_at AS "createdAt"
       FROM company_learning_entries
       ORDER BY created_at DESC`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch company learning" });
  }
});

export default router;
