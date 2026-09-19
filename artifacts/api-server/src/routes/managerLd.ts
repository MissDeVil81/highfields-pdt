import { Router } from "express";
import { db, pool, managerLoginsTable, managerViewedEntriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// POST /api/manager-ld/login — upsert last login, return previous login time
router.post("/login", async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId required" });
  const uid = parseInt(userId);

  // Get current record first
  const existing = await db.select().from(managerLoginsTable).where(eq(managerLoginsTable.userId, uid));
  const prevLogin = existing[0]?.lastLoginAt ?? null;

  if (existing.length === 0) {
    await db.insert(managerLoginsTable).values({ userId: uid, lastLoginAt: new Date(), prevLoginAt: null });
  } else {
    await db.update(managerLoginsTable)
      .set({ prevLoginAt: existing[0].lastLoginAt, lastLoginAt: new Date() })
      .where(eq(managerLoginsTable.userId, uid));
  }

  return res.json({ prevLoginAt: prevLogin });
});

// GET /api/manager-ld/hierarchy?managerId=X&role=manager|director — full flat list of reportees
router.get("/hierarchy", async (req, res) => {
  const managerId = parseInt(req.query.managerId as string);
  const role = req.query.role as string;
  if (isNaN(managerId)) return res.status(400).json({ error: "managerId required" });

  let rows;
  if (role === "director") {
    // Recursive CTE — everyone who reports up to this director
    rows = await pool.query<{ id: number; name: string; job_title: string | null; department: string | null }>(`
      WITH RECURSIVE hierarchy AS (
        SELECT id, name, job_title, department, manager_id
        FROM users
        WHERE manager_id = $1 AND is_active = 'active'
        UNION ALL
        SELECT u.id, u.name, u.job_title, u.department, u.manager_id
        FROM users u
        JOIN hierarchy h ON u.manager_id = h.id
        WHERE u.is_active = 'active'
      )
      SELECT id, name, job_title, department FROM hierarchy ORDER BY name
    `, [managerId]);
  } else {
    rows = await pool.query<{ id: number; name: string; job_title: string | null; department: string | null }>(`
      SELECT id, name, job_title, department
      FROM users
      WHERE manager_id = $1 AND is_active = 'active'
      ORDER BY name
    `, [managerId]);
  }

  return res.json(rows.rows.map(r => ({
    id: r.id,
    name: r.name,
    jobTitle: r.job_title,
    department: r.department,
  })));
});

// GET /api/manager-ld/team-members?managerId=X — direct reports + their learning stats
router.get("/team-members", async (req, res) => {
  const managerId = parseInt(req.query.managerId as string);
  if (isNaN(managerId)) return res.status(400).json({ error: "managerId required" });

  const rows = await pool.query<{
    id: number; name: string; job_title: string | null;
    entry_count: string; last_entry: Date | null;
  }>(`
    SELECT u.id, u.name, u.job_title,
      COUNT(lle.id)::text AS entry_count,
      MAX(lle.created_at) AS last_entry
    FROM users u
    LEFT JOIN learning_log_entries lle ON lle.user_id = u.id
    WHERE u.manager_id = $1 AND u.is_active = 'active'
    GROUP BY u.id, u.name, u.job_title
    ORDER BY u.name
  `, [managerId]);

  return res.json(rows.rows.map(r => ({
    id: r.id,
    name: r.name,
    jobTitle: r.job_title,
    entryCount: parseInt(r.entry_count),
    lastEntry: r.last_entry,
  })));
});

// GET /api/manager-ld/team-by-team?teamId=X&directorId=Y — team members for director
router.get("/team-by-team", async (req, res) => {
  const teamId = parseInt(req.query.teamId as string);
  const directorId = parseInt(req.query.directorId as string);
  if (isNaN(teamId) || isNaN(directorId)) return res.status(400).json({ error: "teamId and directorId required" });

  const rows = await pool.query<{
    id: number; name: string; job_title: string | null;
    entry_count: string; last_entry: Date | null;
  }>(`
    SELECT u.id, u.name, u.job_title,
      COUNT(lle.id)::text AS entry_count,
      MAX(lle.created_at) AS last_entry
    FROM user_teams ut
    JOIN users u ON u.id = ut.user_id
    LEFT JOIN learning_log_entries lle ON lle.user_id = u.id
    WHERE ut.team_id = $1 AND u.id != $2 AND u.is_active = 'active'
    GROUP BY u.id, u.name, u.job_title
    ORDER BY u.name
  `, [teamId, directorId]);

  return res.json(rows.rows.map(r => ({
    id: r.id,
    name: r.name,
    jobTitle: r.job_title,
    entryCount: parseInt(r.entry_count),
    lastEntry: r.last_entry,
  })));
});

// GET /api/manager-ld/user-teams?userId=X — teams a director belongs to
router.get("/user-teams", async (req, res) => {
  const userId = parseInt(req.query.userId as string);
  if (isNaN(userId)) return res.status(400).json({ error: "userId required" });

  const rows = await pool.query<{ id: number; name: string }>(`
    SELECT t.id, t.name
    FROM user_teams ut
    JOIN teams t ON t.id = ut.team_id
    WHERE ut.user_id = $1 AND t.status = 'active'
    ORDER BY t.name
  `, [userId]);

  return res.json(rows.rows);
});

// GET /api/manager-ld/whats-new?managerId=X — new entries since last login, not yet viewed
router.get("/whats-new", async (req, res) => {
  const managerId = parseInt(req.query.managerId as string);
  if (isNaN(managerId)) return res.status(400).json({ error: "managerId required" });

  const rows = await pool.query<{
    id: number; user_id: number; date_of_learning: string;
    training: string; delivered_by: string; what_did_i_learn: string;
    further_training_needed: string; created_at: Date;
    employee_name: string; employee_job_title: string | null;
  }>(`
    SELECT lle.id, lle.user_id, lle.date_of_learning, lle.training,
      lle.delivered_by, lle.what_did_i_learn, lle.further_training_needed, lle.created_at,
      u.name AS employee_name, u.job_title AS employee_job_title
    FROM learning_log_entries lle
    JOIN users u ON u.id = lle.user_id
    LEFT JOIN manager_logins ml ON ml.user_id = $1
    WHERE u.manager_id = $1
      AND (ml.prev_login_at IS NULL OR lle.created_at > ml.prev_login_at)
      AND NOT EXISTS (
        SELECT 1 FROM manager_viewed_entries mve
        WHERE mve.manager_id = $1 AND mve.entry_id = lle.id
      )
    ORDER BY lle.created_at DESC
  `, [managerId]);

  return res.json(rows.rows.map(r => ({
    id: r.id,
    userId: r.user_id,
    dateOfLearning: r.date_of_learning,
    training: r.training,
    deliveredBy: r.delivered_by,
    whatDidILearn: r.what_did_i_learn,
    furtherTrainingNeeded: r.further_training_needed,
    createdAt: r.created_at,
    employeeName: r.employee_name,
    employeeJobTitle: r.employee_job_title,
  })));
});

// POST /api/manager-ld/viewed — mark an entry as viewed
router.post("/viewed", async (req, res) => {
  const { managerId, entryId } = req.body;
  if (!managerId || !entryId) return res.status(400).json({ error: "managerId and entryId required" });

  await pool.query(`
    INSERT INTO manager_viewed_entries (manager_id, entry_id)
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING
  `, [managerId, entryId]);

  return res.status(204).send();
});

// GET /api/manager-ld/employee/:id/entries — all learning log entries for an employee
router.get("/employee/:id/entries", async (req, res) => {
  const employeeId = parseInt(req.params.id);
  if (isNaN(employeeId)) return res.status(400).json({ error: "Invalid employee id" });

  const rows = await pool.query<{
    id: number; user_id: number; date_of_learning: string;
    training: string; delivered_by: string; what_did_i_learn: string;
    further_training_needed: string; created_at: Date;
    employee_name: string; employee_job_title: string | null;
  }>(`
    SELECT lle.id, lle.user_id, lle.date_of_learning, lle.training,
      lle.delivered_by, lle.what_did_i_learn, lle.further_training_needed, lle.created_at,
      u.name AS employee_name, u.job_title AS employee_job_title
    FROM learning_log_entries lle
    JOIN users u ON u.id = lle.user_id
    WHERE lle.user_id = $1
    ORDER BY lle.created_at DESC
  `, [employeeId]);

  return res.json(rows.rows.map(r => ({
    id: r.id,
    userId: r.user_id,
    dateOfLearning: r.date_of_learning,
    training: r.training,
    deliveredBy: r.delivered_by,
    whatDidILearn: r.what_did_i_learn,
    furtherTrainingNeeded: r.further_training_needed,
    createdAt: r.created_at,
    employeeName: r.employee_name,
    employeeJobTitle: r.employee_job_title,
  })));
});

// GET /api/manager-ld/all-employees — all employees across all teams (for L&D role)
router.get("/all-employees", async (req, res) => {
  const rows = await pool.query<{
    id: number; name: string; job_title: string | null;
    department: string | null; recruitment_type: string | null;
    entry_count: string; last_entry: Date | null;
  }>(`
    SELECT u.id, u.name, u.job_title, u.department, u.recruitment_type,
      COUNT(lle.id)::text AS entry_count,
      MAX(lle.created_at) AS last_entry
    FROM users u
    LEFT JOIN learning_log_entries lle ON lle.user_id = u.id
    WHERE u.is_active = 'active' AND NOT (u.roles @> ARRAY['admin'])
    GROUP BY u.id, u.name, u.job_title, u.department, u.recruitment_type
    ORDER BY u.name
  `);

  return res.json(rows.rows.map(r => ({
    id: r.id,
    name: r.name,
    jobTitle: r.job_title,
    department: r.department,
    recruitmentType: r.recruitment_type,
    entryCount: parseInt(r.entry_count),
    lastEntry: r.last_entry,
  })));
});

// GET /api/manager-ld/whats-new-all?ldUserId=X — new entries (all employees) for L&D user
router.get("/whats-new-all", async (req, res) => {
  const ldUserId = parseInt(req.query.ldUserId as string);
  if (isNaN(ldUserId)) return res.status(400).json({ error: "ldUserId required" });

  const rows = await pool.query<{
    id: number; user_id: number; date_of_learning: string;
    training: string; delivered_by: string; what_did_i_learn: string;
    further_training_needed: string; created_at: Date;
    employee_name: string; employee_job_title: string | null;
  }>(`
    SELECT lle.id, lle.user_id, lle.date_of_learning, lle.training,
      lle.delivered_by, lle.what_did_i_learn, lle.further_training_needed, lle.created_at,
      u.name AS employee_name, u.job_title AS employee_job_title
    FROM learning_log_entries lle
    JOIN users u ON u.id = lle.user_id
    LEFT JOIN manager_logins ml ON ml.user_id = $1
    WHERE (ml.prev_login_at IS NULL OR lle.created_at > ml.prev_login_at)
      AND NOT EXISTS (
        SELECT 1 FROM manager_viewed_entries mve
        WHERE mve.manager_id = $1 AND mve.entry_id = lle.id
      )
    ORDER BY lle.created_at DESC
  `, [ldUserId]);

  return res.json(rows.rows.map(r => ({
    id: r.id,
    userId: r.user_id,
    dateOfLearning: r.date_of_learning,
    training: r.training,
    deliveredBy: r.delivered_by,
    whatDidILearn: r.what_did_i_learn,
    furtherTrainingNeeded: r.further_training_needed,
    createdAt: r.created_at,
    employeeName: r.employee_name,
    employeeJobTitle: r.employee_job_title,
  })));
});

export default router;
