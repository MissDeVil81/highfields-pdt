import { Router } from "express";
import { pool } from "@workspace/db";
import { z } from "zod";
import { employeeExists, parsePositiveIntegerQuery } from "../lib/employeeScope";

const router = Router();

// GET /api/company-learning
router.get("/", async (req, res) => {
  const rawUserId = req.query.userId;
  const hasUserId = rawUserId !== undefined;
  const userId = hasUserId ? parsePositiveIntegerQuery(rawUserId) : undefined;
  if (hasUserId && userId === null) {
    return res.status(400).json({ error: "Invalid userId" });
  }

  try {
    if (typeof userId === "number" && !(await employeeExists(userId))) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const result = userId === undefined
      ? await pool.query(
          `SELECT cle.id, cle.title, cle.date_of_learning AS "dateOfLearning",
                  cle.trainer, cle.description, cle.created_at AS "createdAt",
                  COALESCE(
                    ARRAY_AGG(clr.user_id ORDER BY u.name) FILTER (WHERE clr.user_id IS NOT NULL),
                    ARRAY[]::INTEGER[]
                  ) AS "recipientUserIds",
                  COALESCE(
                    ARRAY_AGG(u.name ORDER BY u.name) FILTER (WHERE u.name IS NOT NULL),
                    ARRAY[]::TEXT[]
                  ) AS "recipientNames"
           FROM company_learning_entries cle
           LEFT JOIN company_learning_recipients clr ON clr.company_learning_id = cle.id
           LEFT JOIN users u ON u.id = clr.user_id
           GROUP BY cle.id
           ORDER BY cle.created_at DESC`
        )
      : await pool.query(
          `SELECT cle.id, cle.title, cle.date_of_learning AS "dateOfLearning",
                  cle.trainer, cle.description, cle.created_at AS "createdAt"
           FROM company_learning_entries cle
           WHERE NOT EXISTS (
                   SELECT 1
                   FROM company_learning_recipients any_recipient
                   WHERE any_recipient.company_learning_id = cle.id
                 )
              OR EXISTS (
                   SELECT 1
                   FROM company_learning_recipients selected_recipient
                   WHERE selected_recipient.company_learning_id = cle.id
                     AND selected_recipient.user_id = $1
                 )
           ORDER BY cle.created_at DESC`,
          [userId]
        );
    return res.json(result.rows);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch company learning");
    return res.status(500).json({ error: "Failed to fetch company learning" });
  }
});

// POST /api/company-learning
const insertSchema = z.object({
  title: z.string().min(1),
  dateOfLearning: z.string().min(1),
  trainer: z.string().min(1),
  description: z.string().optional().default(""),
  recipientUserIds: z.array(z.number().int().positive()).min(1),
});

router.post("/", async (req, res) => {
  const result = insertSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.message });

  const { title, dateOfLearning, trainer, description } = result.data;
  const recipientUserIds = [...new Set(result.data.recipientUserIds)];
  const client = await pool.connect();

  try {
    const recipients = await client.query(
      `SELECT id, name
       FROM users
       WHERE id = ANY($1::INTEGER[])
         AND is_active = 'active'
       ORDER BY name`,
      [recipientUserIds]
    );
    if (recipients.rows.length !== recipientUserIds.length) {
      return res.status(400).json({ error: "One or more selected people are invalid or inactive" });
    }

    await client.query("BEGIN");
    const row = await client.query(
      `INSERT INTO company_learning_entries (title, date_of_learning, trainer, description)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, date_of_learning AS "dateOfLearning", trainer, description,
                 created_at AS "createdAt"`,
      [title, dateOfLearning, trainer, description]
    );

    await client.query(
      `INSERT INTO company_learning_recipients (company_learning_id, user_id)
       SELECT $1, UNNEST($2::INTEGER[])`,
      [row.rows[0].id, recipientUserIds]
    );
    await client.query("COMMIT");

    return res.status(201).json({
      ...row.rows[0],
      recipientUserIds,
      recipientNames: recipients.rows.map(recipient => recipient.name),
    });
  } catch (err) {
    await client.query("ROLLBACK");
    req.log.error({ err }, "Failed to create company training entry");
    return res.status(500).json({ error: "Failed to create company training entry" });
  } finally {
    client.release();
  }
});

export default router;
