import { Router } from "express";
import { pool } from "@workspace/db";
import { z } from "zod";

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

// POST /api/company-learning
const insertSchema = z.object({
  title: z.string().min(1),
  dateOfLearning: z.string().min(1),
  trainer: z.string().min(1),
  description: z.string().optional().default(""),
});

router.post("/", async (req, res) => {
  const result = insertSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.message });

  const { title, dateOfLearning, trainer, description } = result.data;
  try {
    const row = await pool.query(
      `INSERT INTO company_learning_entries (title, date_of_learning, trainer, description)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, date_of_learning AS "dateOfLearning", trainer, description,
                 created_at AS "createdAt"`,
      [title, dateOfLearning, trainer, description]
    );
    return res.status(201).json(row.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create company training entry" });
  }
});

export default router;
