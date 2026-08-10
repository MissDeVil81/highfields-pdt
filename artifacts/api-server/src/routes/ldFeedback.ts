import { Router } from "express";
import { pool } from "@workspace/db";
import { z } from "zod";

const router = Router();

// GET /api/ld-feedback?userId=X  (or no userId for all)
router.get("/", async (req, res) => {
  try {
    if (req.query.userId) {
      const userId = parseInt(req.query.userId as string);
      if (isNaN(userId)) return res.status(400).json({ error: "Invalid userId" });

      const result = await pool.query(
        `SELECT lf.id, lf.user_id AS "userId", u.name AS "employeeName", u.job_title AS "employeeJobTitle",
                lf.title, lf.author_name AS "authorName",
                lf.content, lf.feedback_date AS "feedbackDate",
                lf.send_to_manager AS "sendToManager",
                lf.send_to_individual AS "sendToIndividual",
                lf.created_at AS "createdAt"
         FROM ld_feedback lf
         JOIN users u ON u.id = lf.user_id
         WHERE lf.user_id = $1
         ORDER BY lf.created_at DESC`,
        [userId]
      );
      return res.json(result.rows);
    } else {
      // All feedback across all employees (L&D view)
      const result = await pool.query(
        `SELECT lf.id, lf.user_id AS "userId", u.name AS "employeeName", u.job_title AS "employeeJobTitle",
                lf.title, lf.author_name AS "authorName",
                lf.content, lf.feedback_date AS "feedbackDate",
                lf.send_to_manager AS "sendToManager",
                lf.send_to_individual AS "sendToIndividual",
                lf.created_at AS "createdAt"
         FROM ld_feedback lf
         JOIN users u ON u.id = lf.user_id
         ORDER BY lf.created_at DESC`
      );
      return res.json(result.rows);
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch L&D feedback" });
  }
});

// POST /api/ld-feedback
const insertSchema = z.object({
  userId: z.number().int(),
  authorName: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
  feedbackDate: z.string().optional().default(""),
  sendToManager: z.boolean().optional().default(false),
  sendToIndividual: z.boolean().optional().default(false),
});

router.post("/", async (req, res) => {
  const parsed = insertSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const { userId, authorName, title, content, feedbackDate, sendToManager, sendToIndividual } = parsed.data;

  try {
    // Always save to ld_feedback
    const row = await pool.query(
      `INSERT INTO ld_feedback (user_id, author_name, title, content, feedback_date, send_to_manager, send_to_individual)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, user_id AS "userId", author_name AS "authorName", title,
                 content, feedback_date AS "feedbackDate",
                 send_to_manager AS "sendToManager", send_to_individual AS "sendToIndividual",
                 created_at AS "createdAt"`,
      [userId, authorName, title, content, feedbackDate, sendToManager, sendToIndividual]
    );

    // If sending to manager or individual, create a learning_log_entry so it surfaces
    // in the manager's What's New and the individual's learning record
    if (sendToManager || sendToIndividual) {
      const dateStr = feedbackDate || new Date().toLocaleDateString("en-GB", {
        day: "2-digit", month: "2-digit", year: "2-digit"
      }).replace(/\//g, "/");

      await pool.query(
        `INSERT INTO learning_log_entries
           (user_id, date_of_learning, training, delivered_by, what_did_i_learn, further_training_needed)
         VALUES ($1, $2, $3, $4, $5, '')`,
        [
          userId,
          dateStr,
          `L&D Feedback: ${title}`,
          `${authorName} (L&D)`,
          content,
        ]
      );
    }

    return res.status(201).json(row.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create feedback" });
  }
});

export default router;
