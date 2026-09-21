import { Router, type Request, type Response } from "express";
import { pool, db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { isAdmin } from "../lib/permissions";
import { isValidLearningDate } from "@workspace/db/schema";

const router = Router();

type LearningDateAuditRecord = {
  source: "individualLearning" | "companyLearning" | "ldFeedback";
  id: number;
  dateValue: string | null;
  userId?: number;
  employeeName?: string | null;
  employeeJobTitle?: string | null;
  [key: string]: unknown;
};

function hasInvalidRequiredDate(value: string | null | undefined): boolean {
  return typeof value !== "string" || !isValidLearningDate(value);
}

function hasInvalidOptionalDate(value: string | null | undefined): boolean {
  return typeof value !== "string"
    ? value != null
    : value.trim() !== "" && !isValidLearningDate(value);
}

async function requireAdmin(req: Request, res: Response) {
  const rawId = req.headers["x-requesting-user-id"] ?? req.query.requestingUserId;
  if (!rawId) {
    res.status(401).json({ error: "x-requesting-user-id header is required" });
    return false;
  }

  const requestingId = Number(rawId);
  if (Number.isNaN(requestingId)) {
    res.status(400).json({ error: "Invalid requesting user id" });
    return false;
  }

  const [requestingUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, requestingId));
  if (!requestingUser) {
    res.status(401).json({ error: "Requesting user not found" });
    return false;
  }
  if (!isAdmin(requestingUser)) {
    res.status(403).json({ error: "Admin access required" });
    return false;
  }

  return true;
}

// GET /api/learning-date-audit
//
// This endpoint intentionally only selects and filters rows in memory. It does
// not update, normalize, or otherwise modify any legacy records.
router.get("/", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;

  try {
    const [individualResult, companyResult, feedbackResult] = await Promise.all([
      pool.query(
        `SELECT lle.id, lle.user_id AS "userId", u.name AS "employeeName",
                u.job_title AS "employeeJobTitle", u.email AS "employeeEmail",
                lle.date_of_learning AS "dateOfLearning", lle.training,
                lle.delivered_by AS "deliveredBy",
                lle.what_did_i_learn AS "whatDidILearn",
                lle.further_training_needed AS "furtherTrainingNeeded",
                lle.created_at AS "createdAt", lle.updated_at AS "updatedAt"
         FROM learning_log_entries lle
         LEFT JOIN users u ON u.id = lle.user_id
         ORDER BY lle.id`,
      ),
      pool.query(
        `SELECT cle.id, cle.title, cle.date_of_learning AS "dateOfLearning",
                cle.trainer, cle.description, cle.created_at AS "createdAt",
                COALESCE(
                  JSON_AGG(
                    JSON_BUILD_OBJECT(
                      'userId', clr.user_id,
                      'name', u.name,
                      'email', u.email
                    ) ORDER BY u.name
                  ) FILTER (WHERE clr.user_id IS NOT NULL),
                  '[]'::json
                ) AS recipients
         FROM company_learning_entries cle
         LEFT JOIN company_learning_recipients clr
           ON clr.company_learning_id = cle.id
         LEFT JOIN users u ON u.id = clr.user_id
         GROUP BY cle.id
         ORDER BY cle.id`,
      ),
      pool.query(
        `SELECT lf.id, lf.user_id AS "userId", u.name AS "employeeName",
                u.job_title AS "employeeJobTitle", u.email AS "employeeEmail",
                lf.author_name AS "authorName", lf.title, lf.content,
                lf.feedback_date AS "feedbackDate",
                lf.send_to_manager AS "sendToManager",
                lf.send_to_individual AS "sendToIndividual",
                lf.created_at AS "createdAt"
         FROM ld_feedback lf
         LEFT JOIN users u ON u.id = lf.user_id
         ORDER BY lf.id`,
      ),
    ]);

    const individualLearning: LearningDateAuditRecord[] = individualResult.rows
      .filter(row => hasInvalidRequiredDate(row.dateOfLearning))
      .map(row => ({
        source: "individualLearning",
        id: row.id,
        dateValue: row.dateOfLearning ?? null,
        userId: row.userId,
        employeeName: row.employeeName ?? null,
        employeeJobTitle: row.employeeJobTitle ?? null,
        employeeEmail: row.employeeEmail ?? null,
        dateOfLearning: row.dateOfLearning ?? null,
        training: row.training,
        deliveredBy: row.deliveredBy,
        whatDidILearn: row.whatDidILearn,
        furtherTrainingNeeded: row.furtherTrainingNeeded,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }));

    const companyLearning: LearningDateAuditRecord[] = companyResult.rows
      .filter(row => hasInvalidRequiredDate(row.dateOfLearning))
      .map(row => ({
        source: "companyLearning",
        id: row.id,
        dateValue: row.dateOfLearning ?? null,
        dateOfLearning: row.dateOfLearning ?? null,
        title: row.title,
        trainer: row.trainer,
        description: row.description,
        recipients: row.recipients,
        createdAt: row.createdAt,
      }));

    const ldFeedback: LearningDateAuditRecord[] = feedbackResult.rows
      .filter(row => hasInvalidOptionalDate(row.feedbackDate))
      .map(row => ({
        source: "ldFeedback",
        id: row.id,
        dateValue: row.feedbackDate ?? null,
        userId: row.userId,
        employeeName: row.employeeName ?? null,
        employeeJobTitle: row.employeeJobTitle ?? null,
        employeeEmail: row.employeeEmail ?? null,
        feedbackDate: row.feedbackDate ?? null,
        authorName: row.authorName,
        title: row.title,
        content: row.content,
        sendToManager: row.sendToManager,
        sendToIndividual: row.sendToIndividual,
        createdAt: row.createdAt,
      }));

    const records = [...individualLearning, ...companyLearning, ...ldFeedback];

    return res.json({
      generatedAt: new Date().toISOString(),
      total: records.length,
      counts: {
        individualLearning: individualLearning.length,
        companyLearning: companyLearning.length,
        ldFeedback: ldFeedback.length,
      },
      records,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to audit learning dates");
    return res.status(500).json({ error: "Failed to audit learning dates" });
  }
});

export default router;