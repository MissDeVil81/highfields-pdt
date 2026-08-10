import { Router } from "express";
import { pool } from "@workspace/db";
import { z } from "zod";

const router = Router();

// GET /api/ld-feedback?userId=X
router.get("/", async (req, res) => {
  const userId = parseInt(req.query.userId as string);
  if (isNaN(userId)) return res.status(400).json({ error: "userId is required" });

  try {
    const result = await pool.query(
      `SELECT id, user_id AS "userId", author_name AS "authorName",
              content, feedback_date AS "feedbackDate", created_at AS "createdAt"
       FROM ld_feedback
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch L&D feedback" });
  }
});

// POST /api/ld-feedback
const insertSchema = z.object({
  userId: z.number().int(),
  authorName: z.string().min(1),
  content: z.string().min(1),
  feedbackDate: z.string().optional().default(""),
});

router.post("/", async (req, res) => {
  const result = insertSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.message });

  const { userId, authorName, content, feedbackDate } = result.data;
  try {
    const row = await pool.query(
      `INSERT INTO ld_feedback (user_id, author_name, content, feedback_date)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id AS "userId", author_name AS "authorName",
                 content, feedback_date AS "feedbackDate", created_at AS "createdAt"`,
      [userId, authorName, content, feedbackDate]
    );
    return res.status(201).json(row.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create feedback" });
  }
});

export default router;
