import { pool } from "@workspace/db";
import { logger } from "./lib/logger";

/**
 * Creates every table in the schema using CREATE TABLE IF NOT EXISTS.
 * Runs first on every startup — fully idempotent.
 * This ensures Demo / Live databases catch up after a git pull without
 * needing manual drizzle-kit push or migration commands.
 */
export async function ensureSchemaExists(): Promise<void> {
  const client = await pool.connect();
  try {
    logger.info("Ensuring database schema is up to date...");
    await client.query(`
      -- Independent base tables
      CREATE TABLE IF NOT EXISTS career_paths (
        id         SERIAL PRIMARY KEY,
        name       TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS users (
        id               SERIAL PRIMARY KEY,
        name             TEXT NOT NULL,
        email            TEXT UNIQUE,
        roles            TEXT[] NOT NULL DEFAULT '{employee}',
        manager_id       INTEGER,
        department       TEXT,
        job_title        TEXT,
        start_date       TEXT,
        probation_status TEXT,
        target_role_id   INTEGER,
        is_active        TEXT NOT NULL DEFAULT 'active',
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS teams (
        id         SERIAL PRIMARY KEY,
        name       TEXT NOT NULL,
        status     TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS audit_log (
        id               SERIAL PRIMARY KEY,
        admin_user_id    INTEGER NOT NULL,
        affected_user_id INTEGER,
        action           TEXT NOT NULL,
        previous_value   TEXT,
        new_value        TEXT,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS probation_items (
        id            SERIAL PRIMARY KEY,
        section       TEXT NOT NULL,
        section_order INTEGER NOT NULL,
        item_text     TEXT NOT NULL,
        item_order    INTEGER NOT NULL,
        rating_type   TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS learning_log_entries (
        id                      SERIAL PRIMARY KEY,
        user_id                 INTEGER NOT NULL,
        date_of_learning        TEXT NOT NULL,
        training                TEXT NOT NULL,
        delivered_by            TEXT NOT NULL,
        what_did_i_learn        TEXT NOT NULL,
        further_training_needed TEXT NOT NULL DEFAULT '',
        created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS manager_logins (
        user_id       INTEGER PRIMARY KEY,
        last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        prev_login_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS manager_viewed_entries (
        manager_id INTEGER NOT NULL,
        entry_id   INTEGER NOT NULL,
        viewed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS company_learning_entries (
        id               SERIAL PRIMARY KEY,
        title            TEXT NOT NULL,
        date_of_learning TEXT NOT NULL DEFAULT '',
        trainer          TEXT NOT NULL DEFAULT '',
        description      TEXT NOT NULL DEFAULT '',
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Tables depending on career_paths
      CREATE TABLE IF NOT EXISTS roles (
        id             SERIAL PRIMARY KEY,
        career_path_id INTEGER NOT NULL REFERENCES career_paths(id) ON DELETE CASCADE,
        title          TEXT NOT NULL,
        level          INTEGER NOT NULL,
        job_spec       TEXT NOT NULL DEFAULT '',
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Tables depending on roles
      CREATE TABLE IF NOT EXISTS competencies (
        id          SERIAL PRIMARY KEY,
        role_id     INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        name        TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        category    TEXT NOT NULL DEFAULT '',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS financial_targets (
        id            SERIAL PRIMARY KEY,
        role_id       INTEGER NOT NULL REFERENCES roles(id),
        label         TEXT NOT NULL,
        target_amount INTEGER NOT NULL,
        period_label  TEXT NOT NULL,
        option_group  TEXT,
        sort_order    INTEGER NOT NULL DEFAULT 0
      );

      -- Tables depending on users + roles/competencies
      CREATE TABLE IF NOT EXISTS assessments (
        id             SERIAL PRIMARY KEY,
        user_id        INTEGER REFERENCES users(id) ON DELETE CASCADE,
        competency_id  INTEGER NOT NULL REFERENCES competencies(id),
        role_id        INTEGER NOT NULL REFERENCES roles(id),
        rating         TEXT,
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS evidence (
        id            SERIAL PRIMARY KEY,
        user_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
        competency_id INTEGER NOT NULL REFERENCES competencies(id),
        role_id       INTEGER NOT NULL REFERENCES roles(id),
        title         TEXT NOT NULL,
        description   TEXT NOT NULL,
        rating        TEXT NOT NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS financial_progress (
        id             SERIAL PRIMARY KEY,
        user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_id      INTEGER NOT NULL REFERENCES financial_targets(id),
        role_id        INTEGER NOT NULL REFERENCES roles(id),
        current_amount INTEGER NOT NULL,
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Tables depending on users + teams
      CREATE TABLE IF NOT EXISTS user_teams (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, team_id)
      );

      CREATE TABLE IF NOT EXISTS additional_user_permissions (
        id              SERIAL PRIMARY KEY,
        owner_user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        permission_type TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS additional_team_permissions (
        id              SERIAL PRIMARY KEY,
        owner_user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        team_id         INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        permission_type TEXT NOT NULL
      );

      -- Probation tables (depend on users + probation_items)
      CREATE TABLE IF NOT EXISTS probation_assessments (
        id                  SERIAL PRIMARY KEY,
        user_id             INTEGER REFERENCES users(id) ON DELETE CASCADE,
        item_id             INTEGER NOT NULL REFERENCES probation_items(id),
        review_period       TEXT NOT NULL DEFAULT 'month1',
        rating              TEXT,
        note                TEXT,
        manager_rating      TEXT,
        manager_comment     TEXT,
        manager_reviewed_at TIMESTAMPTZ,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS probation_reflections (
        id                  SERIAL PRIMARY KEY,
        user_id             INTEGER REFERENCES users(id) ON DELETE CASCADE,
        review_period       TEXT NOT NULL,
        went_well           TEXT,
        learned             TEXT,
        more_support        TEXT,
        focus_next          TEXT,
        confidence          TEXT,
        biggest_achievements TEXT,
        most_proud_of       TEXT,
        still_develop       TEXT,
        ready_to_pass       TEXT,
        manager_comment     TEXT,
        manager_status      TEXT,
        manager_reviewed_at TIMESTAMPTZ,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS probation_actions (
        id              SERIAL PRIMARY KEY,
        user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
        review_period   TEXT NOT NULL,
        action_text     TEXT NOT NULL,
        status          TEXT NOT NULL DEFAULT 'not_started',
        manager_comment TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS probation_action_evidence (
        id            SERIAL PRIMARY KEY,
        action_id     INTEGER NOT NULL REFERENCES probation_actions(id) ON DELETE CASCADE,
        evidence_text TEXT NOT NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS probation_manager_reviews (
        id                SERIAL PRIMARY KEY,
        user_id           INTEGER REFERENCES users(id) ON DELETE CASCADE,
        review_period     TEXT NOT NULL,
        going_well        TEXT,
        development_areas TEXT,
        review_status     TEXT,
        review_date       TEXT,
        published_at      TIMESTAMPTZ,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- L&D feedback (may already exist from earlier push — use IF NOT EXISTS + ADD COLUMN IF NOT EXISTS)
      CREATE TABLE IF NOT EXISTS ld_feedback (
        id                SERIAL PRIMARY KEY,
        user_id           INTEGER NOT NULL,
        author_name       TEXT NOT NULL DEFAULT '',
        content           TEXT NOT NULL DEFAULT '',
        feedback_date     TEXT NOT NULL DEFAULT '',
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE ld_feedback ADD COLUMN IF NOT EXISTS title          TEXT NOT NULL DEFAULT '';
      ALTER TABLE ld_feedback ADD COLUMN IF NOT EXISTS send_to_manager    BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE ld_feedback ADD COLUMN IF NOT EXISTS send_to_individual BOOLEAN NOT NULL DEFAULT FALSE;
    `);
    logger.info("Database schema is up to date.");
  } catch (err) {
    logger.error({ err }, "Failed to ensure database schema");
    throw err;
  } finally {
    client.release();
  }
}

const SEED_SQL = `
INSERT INTO public.career_paths VALUES (1, '360 Career Path', 'The full 360° recruitment career track. Manage the full recruitment lifecycle from client development through to placement. Click to view the full career path diagram.', '2026-04-16 14:30:07.063937');
INSERT INTO public.career_paths VALUES (2, '180 Career Path', 'The 180° delivery recruitment track. Specialist recruiters focused on candidate sourcing, delivery and talent placement. Click to view the full career path diagram.', '2026-04-16 14:30:07.108624');
INSERT INTO public.roles VALUES (50, 2, 'Team Leader Contract', 10, 'Team Leader – Delivery – Contract
INSERT INTO public.roles VALUES (45, 2, 'Principal Consultant Perm', 5, 'Principal Delivery Consultant – Permanent
INSERT INTO public.roles VALUES (58, 1, 'Senior Recruitment Consultant Perm', 4, '
INSERT INTO public.roles VALUES (56, 1, 'Recruitment Consultant Perm', 2, '
INSERT INTO public.roles VALUES (60, 1, 'Principal Consultant Perm', 6, '
INSERT INTO public.roles VALUES (61, 1, 'Sector Lead Contract', 7, '
INSERT INTO public.roles VALUES (63, 1, 'Team Leader Contract', 9, '
INSERT INTO public.roles VALUES (72, 3, 'Senior Delivery Consultant', 4, '
INSERT INTO public.roles VALUES (78, 3, 'Account Director', 10, '
INSERT INTO public.roles VALUES (79, 3, 'Business Director', 11, '
INSERT INTO public.roles VALUES (43, 2, 'Senior Recruitment Consultant Perm', 3, 'Senior Delivery Consultant – Permanent
INSERT INTO public.roles VALUES (44, 2, 'Senior Recruitment Consultant Contract', 4, 'Senior Delivery Consultant – Contract
INSERT INTO public.roles VALUES (47, 2, 'Sector Lead Perm', 7, 'Sector Lead – Delivery – Permanent
INSERT INTO public.roles VALUES (68, 1, 'Associate Director Perm', 14, '
INSERT INTO public.roles VALUES (70, 3, 'Senior Account Coordinator', 2, '
INSERT INTO public.roles VALUES (71, 3, 'Delivery Consultant', 3, '
INSERT INTO public.roles VALUES (73, 3, 'Account Partner', 5, '
INSERT INTO public.roles VALUES (74, 3, 'Account Manager', 6, '
INSERT INTO public.roles VALUES (75, 3, 'Senior Account Manager', 7, '
INSERT INTO public.roles VALUES (76, 3, 'Account Partner Manager', 8, '
INSERT INTO public.roles VALUES (77, 3, 'Delivery Manager', 9, '
INSERT INTO public.roles VALUES (59, 1, 'Principal Consultant Contract', 5, '
INSERT INTO public.roles VALUES (46, 2, 'Principal Consultant Contract', 6, 'Principal Delivery Consultant – Contract
INSERT INTO public.roles VALUES (49, 2, 'Team Leader Perm', 9, 'Team Leader – Delivery – Permanent
INSERT INTO public.roles VALUES (53, 2, 'Associate Director Perm', 13, 'Associate Director Delivery – Permanent
INSERT INTO public.roles VALUES (62, 1, 'Sector Lead Perm', 8, '
INSERT INTO public.roles VALUES (64, 1, 'Team Leader Perm', 10, '
INSERT INTO public.roles VALUES (65, 1, 'Divisional Manager Contract', 11, '
INSERT INTO public.roles VALUES (67, 1, 'Associate Director Contract', 13, '
INSERT INTO public.roles VALUES (66, 1, 'Divisional Manager Perm', 12, '
INSERT INTO public.roles VALUES (69, 3, 'Account Coordinator', 1, '
INSERT INTO public.roles VALUES (48, 2, 'Sector Lead Contract', 8, 'Sector Lead – Delivery – Contract
INSERT INTO public.roles VALUES (52, 2, 'Divisional Manager Contract', 12, 'Divisional Manager Delivery – Contract
INSERT INTO public.roles VALUES (54, 2, 'Associate Director Contract', 14, 'Associate Director – Delivery Contract
INSERT INTO public.roles VALUES (42, 2, 'Recruitment Consultant Contract', 2, '
INSERT INTO public.roles VALUES (57, 1, 'Senior Recruitment Consultant Contract', 3, '
INSERT INTO public.roles VALUES (55, 1, 'Recruitment Consultant Contract', 1, '
INSERT INTO public.roles VALUES (41, 2, 'Recruitment Consultant Perm', 1, '
INSERT INTO public.roles VALUES (51, 2, 'Divisional Manager Perm', 11, 'Divisional Manager Delivery – Permanent
INSERT INTO public.competencies VALUES (1, 56, 'Recruitment Consultant 360', 'Most of the time', 'Core Competencies', '2026-04-17 10:29:49.486912');
INSERT INTO public.competencies VALUES (21, 56, 'Communication', 'I communicate well by listening effectively and building rapport', 'Candidate Management', '2026-04-17 10:29:49.552692');
INSERT INTO public.competencies VALUES (36, 55, 'Recruitment Consultant 360', 'Most of the time', 'Core Competencies', '2026-04-17 10:29:49.728662');
INSERT INTO public.competencies VALUES (9, 56, 'Activity', 'I consistently hit my minimum activity on Cube', 'Desk Management', '2026-04-17 10:29:49.513568');
INSERT INTO public.competencies VALUES (18, 56, 'Referrals', 'I ask for and receive quality referrals from my network', 'Candidate Attraction', '2026-04-17 10:29:49.543329');
INSERT INTO public.competencies VALUES (53, 55, 'Referrals', 'I ask for and receive quality referrals from my network', 'Candidate Attraction', '2026-04-17 10:29:49.780157');
INSERT INTO public.competencies VALUES (19, 56, 'Qualify', 'I qualify candidates successfully', 'Candidate Management', '2026-04-17 10:29:49.546193');
INSERT INTO public.competencies VALUES (54, 55, 'Qualify', 'I qualify candidates successfully', 'Candidate Management', '2026-04-17 10:29:49.783311');
INSERT INTO public.competencies VALUES (28, 56, 'Qualifying clients', 'I identify what a good client looks like and who I should be targeting', 'Candidate Management', '2026-04-17 10:29:49.581814');
INSERT INTO public.competencies VALUES (10, 56, 'Time management', 'I successfully manage my workload through the week', 'Desk Management', '2026-04-17 10:29:49.51735');
INSERT INTO public.competencies VALUES (22, 56, 'Marketing', 'I effectively market candidates to clients successfully', 'Candidate Management', '2026-04-17 10:29:49.560552');
INSERT INTO public.competencies VALUES (11, 56, 'Data Quality', 'I consistently log everything on Bullhorn accurately', 'Desk Management', '2026-04-17 10:29:49.520135');
INSERT INTO public.competencies VALUES (45, 55, 'Time management', 'I successfully manage my workload through the week', 'Desk Management', '2026-04-17 10:29:49.754798');
INSERT INTO public.competencies VALUES (12, 56, 'Data awareness', 'I understand the data behind my desk that leads me to success', 'Desk Management', '2026-04-17 10:29:49.522989');
INSERT INTO public.competencies VALUES (13, 56, 'Leads', 'I find leads independently and follow up on them', 'Desk Management', '2026-04-17 10:29:49.526116');
INSERT INTO public.competencies VALUES (14, 56, 'Active and Passive Candidates', 'I use passive candidate attraction methods as well as active methods', 'Candidate Attraction', '2026-04-17 10:29:49.528987');
INSERT INTO public.competencies VALUES (15, 56, 'Sourcing', 'I understand the process of sourcing a candidate and follow it', 'Candidate Attraction', '2026-04-17 10:29:49.531761');
INSERT INTO public.competencies VALUES (16, 56, 'Advert Writing', 'I write effective, compelling, well written job adverts and post all jobs on our website', 'Candidate Attraction', '2026-04-17 10:29:49.534058');
INSERT INTO public.competencies VALUES (17, 56, 'Engagement', 'I identify, engage, and get responses from candidates', 'Candidate Attraction', '2026-04-17 10:29:49.536838');
INSERT INTO public.competencies VALUES (20, 56, 'Network building', 'I build a hotlist of suitable candidates within my niches in Bullhorn', 'Candidate Management', '2026-04-17 10:29:49.54925');
INSERT INTO public.competencies VALUES (23, 56, 'Placement', 'I support the candidate through the offer stage effectively', 'Candidate Management', '2026-04-17 10:29:49.56418');
INSERT INTO public.competencies VALUES (24, 56, 'Relationship', 'I build trusted long-lasting relationships', 'Candidate Management', '2026-04-17 10:29:49.568131');
INSERT INTO public.competencies VALUES (25, 56, 'Quality check', 'I ensure the quality of candidates', 'Candidate Management', '2026-04-17 10:29:49.571258');
INSERT INTO public.competencies VALUES (26, 56, 'Building a client database', 'I research effectively to build client distribution lists', 'Candidate Management', '2026-04-17 10:29:49.575022');
INSERT INTO public.competencies VALUES (27, 56, 'Niche Specialist', 'I talk confidently about my market', 'Candidate Management', '2026-04-17 10:29:49.57814');
INSERT INTO public.competencies VALUES (29, 56, 'Sales calls', 'I successfully conduct a sales call and build relationships', 'Candidate Management', '2026-04-17 10:29:49.584917');
INSERT INTO public.competencies VALUES (30, 56, 'Client meetings', 'I confidently book and attend client meetings', 'Candidate Management', '2026-04-17 10:29:49.709818');
INSERT INTO public.competencies VALUES (31, 56, 'Negotiation', 'I negotiate contracts and appropriate commercial terms', 'Candidate Management', '2026-04-17 10:29:49.713869');
INSERT INTO public.competencies VALUES (32, 56, 'Client Strategy', 'I understand what solutions we can offer our clients and feel confident in discussing them', 'Client Strategy', '2026-04-17 10:29:49.71735');
INSERT INTO public.competencies VALUES (33, 56, 'Client Penetration', 'I have more than one contact in the companies I work with', 'Client Strategy', '2026-04-17 10:29:49.720103');
INSERT INTO public.competencies VALUES (34, 56, 'Vacancy Qualification', 'I qualify and rank every vacancy using the qualification form', 'Client Strategy', '2026-04-17 10:29:49.723138');
INSERT INTO public.competencies VALUES (35, 56, 'Managing your Client', 'I have a full understanding of client process and expectations', 'Client Strategy', '2026-04-17 10:29:49.725926');
INSERT INTO public.competencies VALUES (44, 55, 'Activity', 'I consistently hit my minimum activity on Cube', 'Desk Management', '2026-04-17 10:29:49.752318');
INSERT INTO public.competencies VALUES (46, 55, 'Data Quality', 'I consistently log everything on Bullhorn accurately', 'Desk Management', '2026-04-17 10:29:49.757915');
INSERT INTO public.competencies VALUES (47, 55, 'Data awareness', 'I understand the data behind my desk that leads me to success', 'Desk Management', '2026-04-17 10:29:49.762147');
INSERT INTO public.competencies VALUES (48, 55, 'Leads', 'I find leads independently and follow up on them', 'Desk Management', '2026-04-17 10:29:49.764972');
INSERT INTO public.competencies VALUES (49, 55, 'Active and Passive Candidates', 'I use passive candidate attraction methods as well as active methods', 'Candidate Attraction', '2026-04-17 10:29:49.767337');
INSERT INTO public.competencies VALUES (50, 55, 'Sourcing', 'I understand the process of sourcing a candidate and follow it', 'Candidate Attraction', '2026-04-17 10:29:49.770061');
INSERT INTO public.competencies VALUES (51, 55, 'Advert Writing', 'I write effective, compelling, well written job adverts and post all jobs on our website', 'Candidate Attraction', '2026-04-17 10:29:49.772834');
INSERT INTO public.competencies VALUES (52, 55, 'Engagement', 'I identify, engage, and get responses from candidates', 'Candidate Attraction', '2026-04-17 10:29:49.776239');
INSERT INTO public.competencies VALUES (175, 60, 'Qualify', 'I qualify candidates successfully', 'Candidate Management', '2026-04-17 10:29:50.142528');
INSERT INTO public.competencies VALUES (178, 60, 'Marketing', 'I effectively and successfully market candidates to clients', 'Candidate Management', '2026-04-17 10:29:50.150826');
INSERT INTO public.competencies VALUES (179, 60, 'Placement', 'I effectively support the candidate through the offer stage', 'Candidate Management', '2026-04-17 10:29:50.153747');
INSERT INTO public.competencies VALUES (180, 60, 'Relationship', 'I build trusted, long-lasting relationships', 'Candidate Management', '2026-04-17 10:29:50.156547');
INSERT INTO public.competencies VALUES (181, 60, 'Quality check', 'I ensure the quality of candidates', 'Candidate Management', '2026-04-17 10:29:50.159069');
INSERT INTO public.competencies VALUES (182, 60, 'Building a client database', 'I research effectively to build client distribution lists', 'Candidate Management', '2026-04-17 10:29:50.161968');
INSERT INTO public.competencies VALUES (184, 60, 'Qualifying clients', 'I identify what a good client looks like and who I should be targeting', 'Candidate Management', '2026-04-17 10:29:50.167639');
INSERT INTO public.competencies VALUES (185, 60, 'Sales calls', 'I successfully conduct sales calls and build relationships', 'Candidate Management', '2026-04-17 10:29:50.170588');
INSERT INTO public.competencies VALUES (186, 60, 'Client meetings', 'I confidently book and attend client meetings', 'Candidate Management', '2026-04-17 10:29:50.173276');
INSERT INTO public.competencies VALUES (187, 60, 'Negotiation', 'I negotiate contracts and appropriate commercial terms', 'Candidate Management', '2026-04-17 10:29:50.176083');
INSERT INTO public.competencies VALUES (188, 60, 'Client Strategy', 'I understand what solutions we can offer our clients and feel confident in discussing them', 'Client Strategy', '2026-04-17 10:29:50.179184');
INSERT INTO public.competencies VALUES (189, 60, 'Client Penetration', 'I have more than one contact in the companies I work with', 'Client Strategy', '2026-04-17 10:29:50.182804');
INSERT INTO public.competencies VALUES (450, 63, 'Values alignment', 'I am aligned with and demonstrate values.', 'Culture', '2026-04-17 10:29:50.892078');
INSERT INTO public.competencies VALUES (71, 58, 'Senior Consultant 360', 'Most of the time', 'Core Competencies', '2026-04-17 10:29:49.838309');
INSERT INTO public.competencies VALUES (100, 58, 'Qualifying clients', 'I identify what a good client looks like and who I should be targeting', 'Candidate Management', '2026-04-17 10:29:49.925124');
INSERT INTO public.competencies VALUES (56, 55, 'Communication', 'I communicate well by listening effectively and building rapport', 'Candidate Management', '2026-04-17 10:29:49.789621');
INSERT INTO public.competencies VALUES (93, 58, 'Communication', 'I communicate well by listening effectively and building rapport', 'Candidate Management', '2026-04-17 10:29:49.905773');
INSERT INTO public.competencies VALUES (90, 58, 'Referrals', 'I ask for and receive quality referrals from my network', 'Candidate Attraction', '2026-04-17 10:29:49.897012');
INSERT INTO public.competencies VALUES (91, 58, 'Qualify', 'I qualify candidates successfully', 'Candidate Management', '2026-04-17 10:29:49.900044');
INSERT INTO public.competencies VALUES (86, 58, 'Active and Passive Candidates', 'I use passive candidate attraction methods as well as active methods', 'Candidate Attraction', '2026-04-17 10:29:49.885615');
INSERT INTO public.competencies VALUES (63, 55, 'Qualifying clients', 'I identify what a good client looks like and who I should be targeting', 'Candidate Management', '2026-04-17 10:29:49.81225');
INSERT INTO public.competencies VALUES (81, 58, 'Time management', 'I successfully manage my workload through the week', 'Desk Management', '2026-04-17 10:29:49.869778');
INSERT INTO public.competencies VALUES (57, 55, 'Marketing', 'I effectively and successfully market candidates to clients', 'Candidate Management', '2026-04-17 10:29:49.792718');
INSERT INTO public.competencies VALUES (94, 58, 'Marketing', 'I effectively and successfully market candidates to clients', 'Candidate Management', '2026-04-17 10:29:49.908967');
INSERT INTO public.competencies VALUES (58, 55, 'Placement', 'I support the candidate through the offer stage effectively', 'Candidate Management', '2026-04-17 10:29:49.797292');
INSERT INTO public.competencies VALUES (59, 55, 'Relationship', 'I build trusted long-lasting relationships', 'Candidate Management', '2026-04-17 10:29:49.800644');
INSERT INTO public.competencies VALUES (60, 55, 'Quality check', 'I ensure the quality of candidates', 'Candidate Management', '2026-04-17 10:29:49.803247');
INSERT INTO public.competencies VALUES (61, 55, 'Building a client database', 'I research effectively to build client distribution lists', 'Candidate Management', '2026-04-17 10:29:49.806511');
INSERT INTO public.competencies VALUES (62, 55, 'Niche Specialist', 'I talk confidently about my market', 'Candidate Management', '2026-04-17 10:29:49.809886');
INSERT INTO public.competencies VALUES (64, 55, 'Sales calls', 'I successfully conduct a sales call and build relationships', 'Candidate Management', '2026-04-17 10:29:49.814897');
INSERT INTO public.competencies VALUES (65, 55, 'Client meetings', 'I confidently book and attend client meetings', 'Candidate Management', '2026-04-17 10:29:49.818252');
INSERT INTO public.competencies VALUES (66, 55, 'Negotiation', 'I negotiate contracts and appropriate commercial terms', 'Candidate Management', '2026-04-17 10:29:49.821485');
INSERT INTO public.competencies VALUES (67, 55, 'Client Strategy', 'I understand what solutions we can offer our clients and feel confident discussing them', 'Client Strategy', '2026-04-17 10:29:49.824299');
INSERT INTO public.competencies VALUES (68, 55, 'Client Penetration', 'I have more than one contact in the companies I work with', 'Client Strategy', '2026-04-17 10:29:49.827802');
INSERT INTO public.competencies VALUES (69, 55, 'Vacancy Qualification', 'I qualify and rank every vacancy using the qualification form', 'Client Strategy', '2026-04-17 10:29:49.830346');
INSERT INTO public.competencies VALUES (70, 55, 'Managing your Client', 'I have a full understanding of client process and expectations', 'Client Strategy', '2026-04-17 10:29:49.83374');
INSERT INTO public.competencies VALUES (80, 58, 'Activity', 'I consistently hit my minimum activity on Cube', 'Desk Management', '2026-04-17 10:29:49.866761');
INSERT INTO public.competencies VALUES (82, 58, 'Data Quality', 'I consistently log everything on Bullhorn accurately', 'Desk Management', '2026-04-17 10:29:49.872821');
INSERT INTO public.competencies VALUES (83, 58, 'Data awareness', 'I understand the data behind my desk that leads me to success', 'Desk Management', '2026-04-17 10:29:49.875913');
INSERT INTO public.competencies VALUES (84, 58, 'Leads', 'I find leads independently and follow up on them', 'Desk Management', '2026-04-17 10:29:49.87912');
INSERT INTO public.competencies VALUES (85, 58, 'Commercial Awareness', 'I am aware of my target and the activity required to achieve it', 'Desk Management', '2026-04-17 10:29:49.882181');
INSERT INTO public.competencies VALUES (87, 58, 'Sourcing', 'I understand the process of sourcing a candidate and follow it', 'Candidate Attraction', '2026-04-17 10:29:49.887901');
INSERT INTO public.competencies VALUES (88, 58, 'Advert Writing', 'I write an effective, compelling, well written job advert and post all jobs on our website', 'Candidate Attraction', '2026-04-17 10:29:49.890919');
INSERT INTO public.competencies VALUES (89, 58, 'Engagement', 'I identify, engage, and get responses from candidates', 'Candidate Attraction', '2026-04-17 10:29:49.893746');
INSERT INTO public.competencies VALUES (92, 58, 'Network building', 'I build a hotlist of suitable candidates within my niches in Bullhorn', 'Candidate Management', '2026-04-17 10:29:49.903064');
INSERT INTO public.competencies VALUES (95, 58, 'Placement', 'I support the candidate through the offer stage effectively', 'Candidate Management', '2026-04-17 10:29:49.911507');
INSERT INTO public.competencies VALUES (96, 58, 'Relationship', 'I build trusted long-lasting relationships', 'Candidate Management', '2026-04-17 10:29:49.913879');
INSERT INTO public.competencies VALUES (97, 58, 'Quality check', 'I ensure the quality of candidates', 'Candidate Management', '2026-04-17 10:29:49.916904');
INSERT INTO public.competencies VALUES (98, 58, 'Building a client database', 'I research effectively to build client distribution lists', 'Candidate Management', '2026-04-17 10:29:49.919666');
INSERT INTO public.competencies VALUES (99, 58, 'Niche Specialist', 'I can confidently hold conversations with Senior SH', 'Candidate Management', '2026-04-17 10:29:49.922403');
INSERT INTO public.competencies VALUES (101, 58, 'Sales calls', 'I successfully conduct a sales call and build relationships', 'Candidate Management', '2026-04-17 10:29:49.928149');
INSERT INTO public.competencies VALUES (102, 58, 'Client meetings', 'I confidently book and attend client meetings', 'Candidate Management', '2026-04-17 10:29:49.931326');
INSERT INTO public.competencies VALUES (103, 58, 'Negotiation', 'I negotiate contracts and appropriate commercial terms', 'Candidate Management', '2026-04-17 10:29:49.934917');
INSERT INTO public.competencies VALUES (104, 58, 'Client Strategy', 'I understand what solutions we can offer our clients and feel confident discussing them', 'Client Strategy', '2026-04-17 10:29:49.937697');
INSERT INTO public.competencies VALUES (105, 58, 'Client Penetration', 'I have more than one contact in the companies I work with', 'Client Strategy', '2026-04-17 10:29:49.940932');
INSERT INTO public.competencies VALUES (106, 58, 'Vacancy Qualification', 'I consistently qualify and rank every vacancy using the qualification form', 'Client Strategy', '2026-04-17 10:29:49.943705');
INSERT INTO public.competencies VALUES (107, 58, 'Managing your Client', 'I have a full understanding of client process and expectations', 'Client Strategy', '2026-04-17 10:29:49.946257');
INSERT INTO public.competencies VALUES (108, 58, 'Accountability', 'I consistently set high standards for performance', 'Role Modelling Skills', '2026-04-17 10:29:49.94905');
INSERT INTO public.competencies VALUES (109, 58, 'Ethical & Professional conduct', 'I act professionally at all times and adhere to ethical standards', 'Role Modelling Skills', '2026-04-17 10:29:49.951764');
INSERT INTO public.competencies VALUES (190, 60, 'Vacancy Qualification', 'I qualify and rank every vacancy using the qualification form', 'Client Strategy', '2026-04-17 10:29:50.185049');
INSERT INTO public.competencies VALUES (191, 60, 'Managing your Client', 'I have a full understanding of client processes and expectations', 'Client Strategy', '2026-04-17 10:29:50.187709');
INSERT INTO public.competencies VALUES (192, 60, 'Retaining talent', 'I play a role in ensuring we meet the HPS retention goal', 'Growth', '2026-04-17 10:29:50.190475');
INSERT INTO public.competencies VALUES (194, 60, 'Initiatives', 'I promote initiatives and incentives that drive growth', 'Growth', '2026-04-17 10:29:50.195708');
INSERT INTO public.competencies VALUES (195, 60, 'Mindset', 'I consistently act and behave with a growth mindset', 'Growth', '2026-04-17 10:29:50.198925');
INSERT INTO public.competencies VALUES (196, 60, 'Personal development', 'I own my own development', 'Development', '2026-04-17 10:29:50.202247');
INSERT INTO public.competencies VALUES (197, 60, 'Development of others', 'I participate in the development of new starters', 'Development', '2026-04-17 10:29:50.204871');
INSERT INTO public.competencies VALUES (198, 60, 'Values alignment', 'I am aligned with and demonstrate values', 'Culture', '2026-04-17 10:29:50.207663');
INSERT INTO public.competencies VALUES (110, 58, 'Teamwork', 'I proactively collaborate effectively with my Team and across the company', 'Role Modelling Skills', '2026-04-17 10:29:49.95443');
INSERT INTO public.competencies VALUES (111, 58, 'Continuous Learning', 'I am driven to continuously develop myself and my skills', 'Role Modelling Skills', '2026-04-17 10:29:49.957357');
INSERT INTO public.competencies VALUES (123, 57, 'Time management', 'I successfully manage my workload through the week', 'Desk Management', '2026-04-17 10:29:49.991261');
INSERT INTO public.competencies VALUES (153, 57, 'Continuous Learning', 'I am driven to continuously develop myself and my skills', 'Role Modelling Skills', '2026-04-17 10:29:50.073943');
INSERT INTO public.competencies VALUES (147, 57, 'Client Penetration', 'I have more than one contact in the companies I work with', 'Client Strategy', '2026-04-17 10:29:50.058507');
INSERT INTO public.competencies VALUES (135, 57, 'Communication', 'I can communicate well by listening effectively and building rapport', 'Candidate Management', '2026-04-17 10:29:50.024935');
INSERT INTO public.competencies VALUES (124, 57, 'Data Quality', 'I consistently log everything on Bullhorn accurately', 'Desk Management', '2026-04-17 10:29:49.993767');
INSERT INTO public.competencies VALUES (201, 60, 'Innovation', 'I play a part in identifying opportunities and threats to HPS business', 'Business', '2026-04-17 10:29:50.215795');
INSERT INTO public.competencies VALUES (202, 60, 'Wider business strategy', 'I actively contribute to the business strategy', 'Business', '2026-04-17 10:29:50.218645');
INSERT INTO public.competencies VALUES (112, 58, 'Leads by example', 'I can demonstrate the right behaviours so that others follow', 'Role Modelling Skills', '2026-04-17 10:29:49.960072');
INSERT INTO public.competencies VALUES (136, 57, 'Marketing', 'I can effectively market candidates to clients successfully', 'Candidate Management', '2026-04-17 10:29:50.028028');
INSERT INTO public.competencies VALUES (137, 57, 'Placement', 'I can support the candidate through the offer stage effectively', 'Candidate Management', '2026-04-17 10:29:50.030921');
INSERT INTO public.competencies VALUES (125, 57, 'Data awareness', 'I understand the data behind my desk that leads me to success', 'Desk Management', '2026-04-17 10:29:49.996725');
INSERT INTO public.competencies VALUES (451, 63, 'Continuous improvement', 'I play a leading role in improving the culture of HPS.', 'Culture', '2026-04-17 10:29:50.894637');
INSERT INTO public.competencies VALUES (129, 57, 'Sourcing', 'I understand the process of sourcing a candidate and follow this', 'Candidate Attraction', '2026-04-17 10:29:50.009224');
INSERT INTO public.competencies VALUES (113, 57, 'Senior Consultant 360', 'I Most of the time', 'Core Competencies', '2026-04-17 10:29:49.963213');
INSERT INTO public.competencies VALUES (122, 57, 'Activity', 'I consistently hit my minimum activity on Cube', 'Desk Management', '2026-04-17 10:29:49.988804');
INSERT INTO public.competencies VALUES (141, 57, 'Niche Specialist', 'I can confidently hold conversations with Senior SH', 'Candidate Management', '2026-04-17 10:29:50.041763');
INSERT INTO public.competencies VALUES (126, 57, 'Leads', 'I find leads independently and follow up on them', 'Desk Management', '2026-04-17 10:29:49.999961');
INSERT INTO public.competencies VALUES (127, 57, 'Commercial Awareness', 'I am aware of my target and the activity required to achieve it', 'Desk Management', '2026-04-17 10:29:50.002676');
INSERT INTO public.competencies VALUES (128, 57, 'Active and Passive Candidates', 'I use passive candidate attraction methods as well as active methods', 'Candidate Attraction', '2026-04-17 10:29:50.006294');
INSERT INTO public.competencies VALUES (130, 57, 'Advert Writing', 'I can write an effective, compelling, well written job advert and post all jobs on our website', 'Candidate Attraction', '2026-04-17 10:29:50.011436');
INSERT INTO public.competencies VALUES (131, 57, 'Engagement', 'I can identify, engage, and get responses from candidates', 'Candidate Attraction', '2026-04-17 10:29:50.014028');
INSERT INTO public.competencies VALUES (132, 57, 'Referrals', 'I ask and receive quality referrals from my network', 'Candidate Attraction', '2026-04-17 10:29:50.017098');
INSERT INTO public.competencies VALUES (133, 57, 'Qualify', 'I can qualify candidates successfully', 'Candidate Management', '2026-04-17 10:29:50.019478');
INSERT INTO public.competencies VALUES (134, 57, 'Network building', 'I can build a hotlist of suitable candidates within my niches in Bullhorn', 'Candidate Management', '2026-04-17 10:29:50.022076');
INSERT INTO public.competencies VALUES (138, 57, 'Relationship', 'I can build trusted long-lasting relationships', 'Candidate Management', '2026-04-17 10:29:50.033714');
INSERT INTO public.competencies VALUES (139, 57, 'Quality check', 'I consistently ensure the quality of candidates', 'Candidate Management', '2026-04-17 10:29:50.036521');
INSERT INTO public.competencies VALUES (140, 57, 'Building a client database', 'I can research effectively to build client distribution lists', 'Candidate Management', '2026-04-17 10:29:50.039186');
INSERT INTO public.competencies VALUES (142, 57, 'Qualifying clients', 'I can identify what a good client looks like and who I should be targeting', 'Candidate Management', '2026-04-17 10:29:50.044848');
INSERT INTO public.competencies VALUES (143, 57, 'Sales calls', 'I can successfully conduct a sales call and build relationships', 'Candidate Management', '2026-04-17 10:29:50.04831');
INSERT INTO public.competencies VALUES (144, 57, 'Client meetings', 'I can confidently book and attend client meetings', 'Candidate Management', '2026-04-17 10:29:50.051067');
INSERT INTO public.competencies VALUES (145, 57, 'Negotiation', 'I can negotiate contracts and appropriate commercial terms', 'Candidate Management', '2026-04-17 10:29:50.053657');
INSERT INTO public.competencies VALUES (146, 57, 'Client Strategy', 'I understand what solutions we can offer our clients and feel confident in discussing them', 'Client Strategy', '2026-04-17 10:29:50.055791');
INSERT INTO public.competencies VALUES (148, 57, 'Vacancy Qualification', 'I consistently qualify and rank every vacancy using the qualification form', 'Client Strategy', '2026-04-17 10:29:50.061183');
INSERT INTO public.competencies VALUES (149, 57, 'Managing your Client', 'I have a full understanding of client process and expectations', 'Client Strategy', '2026-04-17 10:29:50.063618');
INSERT INTO public.competencies VALUES (150, 57, 'Accountability', 'I consistently set high standards for performance', 'Role Modelling Skills', '2026-04-17 10:29:50.066229');
INSERT INTO public.competencies VALUES (151, 57, 'Ethical & Professional conduct', 'I act professionally at all times and adhere to ethical standards', 'Role Modelling Skills', '2026-04-17 10:29:50.06873');
INSERT INTO public.competencies VALUES (152, 57, 'Teamwork', 'I proactively collaborate effectively with my Team and across the company', 'Role Modelling Skills', '2026-04-17 10:29:50.071353');
INSERT INTO public.competencies VALUES (154, 57, 'Leads by example', 'I can demonstrate the right behaviours so that others follow', 'Role Modelling Skills', '2026-04-17 10:29:50.076737');
INSERT INTO public.competencies VALUES (155, 60, 'Principal Consultant 360', 'I Most of the time', 'Core Competencies', '2026-04-17 10:29:50.080167');
INSERT INTO public.competencies VALUES (164, 60, 'Activity', 'I consistently hit over my minimum activity on Cube', 'Desk Management', '2026-04-17 10:29:50.105925');
INSERT INTO public.competencies VALUES (193, 60, 'Data', 'I understand impactful data', 'Growth', '2026-04-17 10:29:50.193025');
INSERT INTO public.competencies VALUES (199, 60, 'Continuous improvement', 'I play a leading role in improving the culture of HPS', 'Culture', '2026-04-17 10:29:50.210189');
INSERT INTO public.competencies VALUES (200, 60, 'Performance', 'I am commercially aware of my own and the business''s trending performance', 'Business', '2026-04-17 10:29:50.213125');
INSERT INTO public.competencies VALUES (165, 60, 'Time management', 'I consistently manage my workload through the week', 'Desk Management', '2026-04-17 10:29:50.108707');
INSERT INTO public.competencies VALUES (166, 60, 'Data Quality', 'I consistently log everything on Bullhorn accurately', 'Desk Management', '2026-04-17 10:29:50.111675');
INSERT INTO public.competencies VALUES (167, 60, 'Data awareness', 'I understand the data behind my desk that leads me to success', 'Desk Management', '2026-04-17 10:29:50.119126');
INSERT INTO public.competencies VALUES (168, 60, 'Leads', 'I consistently find leads independently and follow up on them', 'Desk Management', '2026-04-17 10:29:50.121968');
INSERT INTO public.competencies VALUES (170, 60, 'Active and Passive Candidates', 'I use passive candidate attraction methods as well as active methods', 'Candidate Attraction', '2026-04-17 10:29:50.128552');
INSERT INTO public.competencies VALUES (171, 60, 'Sourcing', 'I understand the process of sourcing a candidate and follow it', 'Candidate Attraction', '2026-04-17 10:29:50.131169');
INSERT INTO public.competencies VALUES (172, 60, 'Advert Writing', 'I write an effective, compelling, well-written job advert and post all jobs on our website', 'Candidate Attraction', '2026-04-17 10:29:50.133907');
INSERT INTO public.competencies VALUES (203, 59, 'Principal Consultant 360', 'Most of the time', 'Core Competencies', '2026-04-17 10:29:50.221322');
INSERT INTO public.competencies VALUES (275, 62, 'Placement', 'I support the candidate effectively through the offer stage', 'Candidate Management', '2026-04-17 10:29:50.424007');
INSERT INTO public.competencies VALUES (251, 62, 'Sector Lead 360', 'Most of the time', 'Core Competencies', '2026-04-17 10:29:50.357759');
INSERT INTO public.competencies VALUES (176, 60, 'Network building', 'I build a hotlist of suitable candidates within my niches in Bullhorn', 'Candidate Management', '2026-04-17 10:29:50.145682');
INSERT INTO public.competencies VALUES (213, 59, 'Time management', 'I consistently manage my workload through the week', 'Desk Management', '2026-04-17 10:29:50.254476');
INSERT INTO public.competencies VALUES (214, 59, 'Data Quality', 'I consistently log everything on Bullhorn accurately', 'Desk Management', '2026-04-17 10:29:50.256669');
INSERT INTO public.competencies VALUES (215, 59, 'Data awareness', 'I understand the data behind my desk that leads me to success', 'Desk Management', '2026-04-17 10:29:50.259456');
INSERT INTO public.competencies VALUES (216, 59, 'Leads', 'I find leads independently and consistently follow up on them', 'Desk Management', '2026-04-17 10:29:50.262332');
INSERT INTO public.competencies VALUES (218, 59, 'Active and Passive Candidates', 'I use passive candidate attraction methods as well as active methods', 'Candidate Attraction', '2026-04-17 10:29:50.267433');
INSERT INTO public.competencies VALUES (219, 59, 'Sourcing', 'I understand the process of sourcing a candidate and follow it', 'Candidate Attraction', '2026-04-17 10:29:50.270133');
INSERT INTO public.competencies VALUES (260, 62, 'Activity', 'I consistently hit my minimum activity on Cube', 'Desk Management', '2026-04-17 10:29:50.383343');
INSERT INTO public.competencies VALUES (261, 62, 'Time management', 'I successfully manage my workload through the week', 'Desk Management', '2026-04-17 10:29:50.385591');
INSERT INTO public.competencies VALUES (262, 62, 'Data Quality', 'I consistently log everything on Bullhorn accurately', 'Desk Management', '2026-04-17 10:29:50.388178');
INSERT INTO public.competencies VALUES (263, 62, 'Data awareness', 'I understand the data behind my desk that leads me to success', 'Desk Management', '2026-04-17 10:29:50.390924');
INSERT INTO public.competencies VALUES (264, 62, 'Leads', 'I find leads independently and consistently follow up on them', 'Desk Management', '2026-04-17 10:29:50.393696');
INSERT INTO public.competencies VALUES (265, 62, 'Commercial Awareness', 'I am aware of my target and the activity required to achieve it', 'Desk Management', '2026-04-17 10:29:50.39664');
INSERT INTO public.competencies VALUES (266, 62, 'Active and Passive Candidates', 'I use passive candidate attraction methods as well as active methods', 'Candidate Attraction', '2026-04-17 10:29:50.39916');
INSERT INTO public.competencies VALUES (267, 62, 'Sourcing', 'I understand the process of sourcing a candidate and consistently follow it', 'Candidate Attraction', '2026-04-17 10:29:50.402045');
INSERT INTO public.competencies VALUES (268, 62, 'Advert Writing', 'I write effective, compelling, well written job adverts and consistently post all jobs on our website', 'Candidate Attraction', '2026-04-17 10:29:50.404858');
INSERT INTO public.competencies VALUES (269, 62, 'Engagement', 'I identify, engage, and get responses from candidates', 'Candidate Attraction', '2026-04-17 10:29:50.407402');
INSERT INTO public.competencies VALUES (270, 62, 'Referrals', 'I ask for and receive quality referrals from my network', 'Candidate Attraction', '2026-04-17 10:29:50.409956');
INSERT INTO public.competencies VALUES (271, 62, 'Qualify', 'I qualify candidates successfully', 'Candidate Management', '2026-04-17 10:29:50.412788');
INSERT INTO public.competencies VALUES (272, 62, 'Network building', 'I build a hotlist of suitable candidates within my niches in Bullhorn', 'Candidate Management', '2026-04-17 10:29:50.415796');
INSERT INTO public.competencies VALUES (273, 62, 'Communication', 'I communicate well by listening effectively and building rapport', 'Candidate Management', '2026-04-17 10:29:50.418636');
INSERT INTO public.competencies VALUES (274, 62, 'Marketing', 'I effectively market candidates to clients', 'Candidate Management', '2026-04-17 10:29:50.421529');
INSERT INTO public.competencies VALUES (449, 63, 'Data awareness', 'I use data to measure the performance of my team.', 'Development', '2026-04-17 10:29:50.889847');
INSERT INTO public.competencies VALUES (299, 61, 'Sector Lead 360', 'Most of the time', 'Core Competencies', '2026-04-17 10:29:50.486682');
INSERT INTO public.competencies VALUES (290, 62, 'Initiatives', 'I promote initiatives and incentives that drive growth', 'Growth', '2026-04-17 10:29:50.463713');
INSERT INTO public.competencies VALUES (321, 61, 'Communication', 'I communicate well by listening effectively and building rapport.', 'Candidate Management', '2026-04-17 10:29:50.54276');
INSERT INTO public.competencies VALUES (314, 61, 'Active and Passive Candidates', 'I use passive candidate attraction methods as well as active methods', 'Candidate Attraction', '2026-04-17 10:29:50.526081');
INSERT INTO public.competencies VALUES (318, 61, 'Referrals', 'I ask for and receive quality referrals from my network.', 'Candidate Attraction', '2026-04-17 10:29:50.536008');
INSERT INTO public.competencies VALUES (319, 61, 'Qualify', 'I successfully qualify candidates.', 'Candidate Management', '2026-04-17 10:29:50.538681');
INSERT INTO public.competencies VALUES (280, 62, 'Qualifying clients', 'I identify what a good client looks like and who I should be targeting', 'Candidate Management', '2026-04-17 10:29:50.436425');
INSERT INTO public.competencies VALUES (328, 61, 'Qualifying clients', 'I identify what a good client looks like and who I should be targeting.', 'Candidate Management', '2026-04-17 10:29:50.560453');
INSERT INTO public.competencies VALUES (169, 60, 'Commercial Awareness', 'I am aware of my target and the activity required to achieve it', 'Desk Management', '2026-04-17 10:29:50.12517');
INSERT INTO public.competencies VALUES (322, 61, 'Marketing', 'I effectively market candidates to clients successfully.', 'Candidate Management', '2026-04-17 10:29:50.545523');
INSERT INTO public.competencies VALUES (309, 61, 'Time management', 'I successfully manage my workload through the week', 'Desk Management', '2026-04-17 10:29:50.513201');
INSERT INTO public.competencies VALUES (173, 60, 'Engagement', 'I identify, engage, and get responses from candidates', 'Candidate Attraction', '2026-04-17 10:29:50.136613');
INSERT INTO public.competencies VALUES (174, 60, 'Referrals', 'I ask for and receive quality referrals from my network', 'Candidate Attraction', '2026-04-17 10:29:50.139936');
INSERT INTO public.competencies VALUES (177, 60, 'Communication', 'I communicate well by listening effectively and building rapport', 'Candidate Management', '2026-04-17 10:29:50.148284');
INSERT INTO public.competencies VALUES (183, 60, 'Niche Specialist', 'I talk confidently about my market', 'Candidate Management', '2026-04-17 10:29:50.164707');
INSERT INTO public.competencies VALUES (217, 59, 'Commercial Awareness', 'I am aware of my target and the activity required to achieve it', 'Desk Management', '2026-04-17 10:29:50.264754');
INSERT INTO public.competencies VALUES (276, 62, 'Relationship', 'I build trusted long-lasting relationships', 'Candidate Management', '2026-04-17 10:29:50.426608');
INSERT INTO public.competencies VALUES (277, 62, 'Quality check', 'I ensure the quality of candidates', 'Candidate Management', '2026-04-17 10:29:50.429635');
INSERT INTO public.competencies VALUES (278, 62, 'Building a client database', 'I research effectively to build client distribution lists', 'Candidate Management', '2026-04-17 10:29:50.431736');
INSERT INTO public.competencies VALUES (279, 62, 'Niche Specialist', 'I talk confidently about my market', 'Candidate Management', '2026-04-17 10:29:50.433752');
INSERT INTO public.competencies VALUES (281, 62, 'Sales calls', 'I successfully conduct sales calls and build relationships', 'Candidate Management', '2026-04-17 10:29:50.439222');
INSERT INTO public.competencies VALUES (282, 62, 'Client meetings', 'I confidently book and attend client meetings', 'Candidate Management', '2026-04-17 10:29:50.441919');
INSERT INTO public.competencies VALUES (283, 62, 'Negotiation', 'I negotiate contracts and appropriate commercial terms', 'Candidate Management', '2026-04-17 10:29:50.444948');
INSERT INTO public.competencies VALUES (284, 62, 'Client Strategy', 'I understand what solutions we can offer our clients and feel confident discussing them', 'Client Strategy', '2026-04-17 10:29:50.447613');
INSERT INTO public.competencies VALUES (285, 62, 'Client Penetration', 'I have more than one contact in the companies I work with', 'Client Strategy', '2026-04-17 10:29:50.450412');
INSERT INTO public.competencies VALUES (286, 62, 'Vacancy Qualification', 'I consistently qualify and rank every vacancy using the qualification form', 'Client Strategy', '2026-04-17 10:29:50.45318');
INSERT INTO public.competencies VALUES (287, 62, 'Managing your Client', 'I have a full understanding of the client process and expectations', 'Client Strategy', '2026-04-17 10:29:50.455968');
INSERT INTO public.competencies VALUES (288, 62, 'Retaining talent', 'I play a role in ensuring we meet the HPS retention goal', 'Growth', '2026-04-17 10:29:50.45843');
INSERT INTO public.competencies VALUES (289, 62, 'Data', 'I understand impactful data', 'Growth', '2026-04-17 10:29:50.460784');
INSERT INTO public.competencies VALUES (291, 62, 'Mindset', 'I consistently act and behave with a growth mindset', 'Growth', '2026-04-17 10:29:50.466483');
INSERT INTO public.competencies VALUES (292, 62, 'Personal development', 'I own my own development', 'Development', '2026-04-17 10:29:50.469128');
INSERT INTO public.competencies VALUES (293, 62, 'Development of others', 'I participate in the development of new starters', 'Development', '2026-04-17 10:29:50.47112');
INSERT INTO public.competencies VALUES (294, 62, 'Values alignment', 'I am aligned with and demonstrate values', 'Culture', '2026-04-17 10:29:50.473807');
INSERT INTO public.competencies VALUES (295, 62, 'Continuous improvement', 'I play a leading role in improving the culture of HPS', 'Culture', '2026-04-17 10:29:50.476626');
INSERT INTO public.competencies VALUES (296, 62, 'Performance', 'I am commercially aware of my own and the business''s trending performance', 'Business', '2026-04-17 10:29:50.47947');
INSERT INTO public.competencies VALUES (297, 62, 'Innovation', 'I play a part in identifying opportunities and threats to the HPS business', 'Business', '2026-04-17 10:29:50.481941');
INSERT INTO public.competencies VALUES (298, 62, 'Wider business strategy', 'I actively contribute to the business strategy', 'Business', '2026-04-17 10:29:50.484583');
INSERT INTO public.competencies VALUES (308, 61, 'Activity', 'I am consistently hitting my minimum activity on Cube', 'Desk Management', '2026-04-17 10:29:50.510687');
INSERT INTO public.competencies VALUES (310, 61, 'Data Quality', 'I consistently log everything on Bullhorn accurately', 'Desk Management', '2026-04-17 10:29:50.51542');
INSERT INTO public.competencies VALUES (311, 61, 'Data awareness', 'I understand the data behind my desk that leads me to success', 'Desk Management', '2026-04-17 10:29:50.51859');
INSERT INTO public.competencies VALUES (312, 61, 'Leads', 'I find leads independently and consistently follow up on them', 'Desk Management', '2026-04-17 10:29:50.521083');
INSERT INTO public.competencies VALUES (313, 61, 'Commercial Awareness', 'I am aware of my target and the activity required to achieve it', 'Desk Management', '2026-04-17 10:29:50.523508');
INSERT INTO public.competencies VALUES (315, 61, 'Sourcing', 'I understand the process of sourcing a candidate and consistently follow it.', 'Candidate Attraction', '2026-04-17 10:29:50.528885');
INSERT INTO public.competencies VALUES (316, 61, 'Advert Writing', 'I write effective, compelling, well-written job adverts and post all jobs on our website.', 'Candidate Attraction', '2026-04-17 10:29:50.530903');
INSERT INTO public.competencies VALUES (317, 61, 'Engagement', 'I identify, engage, and get responses from candidates.', 'Candidate Attraction', '2026-04-17 10:29:50.533143');
INSERT INTO public.competencies VALUES (320, 61, 'Network building', 'I build a hotlist of suitable candidates within my niches in Bullhorn.', 'Candidate Management', '2026-04-17 10:29:50.540739');
INSERT INTO public.competencies VALUES (323, 61, 'Placement', 'I support the candidate through the offer stage effectively.', 'Candidate Management', '2026-04-17 10:29:50.547873');
INSERT INTO public.competencies VALUES (324, 61, 'Relationship', 'I build trusted, long-lasting relationships.', 'Candidate Management', '2026-04-17 10:29:50.550595');
INSERT INTO public.competencies VALUES (325, 61, 'Quality check', 'I consistently ensure the quality of candidates.', 'Candidate Management', '2026-04-17 10:29:50.55264');
INSERT INTO public.competencies VALUES (326, 61, 'Building a client database', 'I research effectively to build client distribution lists.', 'Candidate Management', '2026-04-17 10:29:50.555185');
INSERT INTO public.competencies VALUES (327, 61, 'Niche Specialist', 'I talk confidently about my market.', 'Candidate Management', '2026-04-17 10:29:50.557688');
INSERT INTO public.competencies VALUES (329, 61, 'Sales calls', 'I successfully conduct sales calls and build relationships.', 'Candidate Management', '2026-04-17 10:29:50.563263');
INSERT INTO public.competencies VALUES (330, 61, 'Client meetings', 'I confidently book and attend client meetings.', 'Candidate Management', '2026-04-17 10:29:50.566175');
INSERT INTO public.competencies VALUES (347, 64, 'Team Leader 360', 'Most of the time', 'Core Competencies', '2026-04-17 10:29:50.610729');
INSERT INTO public.competencies VALUES (338, 61, 'Initiatives', 'I promote initiatives and incentives that drive growth.', 'Growth', '2026-04-17 10:29:50.586921');
INSERT INTO public.competencies VALUES (388, 64, 'Personal development', 'I own my own development', 'Development', '2026-04-17 10:29:50.718552');
INSERT INTO public.competencies VALUES (369, 64, 'Communication', 'I consistently communicate well by listening effectively and building rapport', 'Candidate Management', '2026-04-17 10:29:50.667613');
INSERT INTO public.competencies VALUES (366, 64, 'Referrals', 'I ask for and receive quality referrals from my network.', 'Candidate Attraction', '2026-04-17 10:29:50.659645');
INSERT INTO public.competencies VALUES (367, 64, 'Qualify', 'I consistently qualify candidates successfully', 'Candidate Management', '2026-04-17 10:29:50.662142');
INSERT INTO public.competencies VALUES (362, 64, 'Active and Passive Candidates', 'I use passive candidate attraction methods as well as active.', 'Candidate Attraction', '2026-04-17 10:29:50.649136');
INSERT INTO public.competencies VALUES (376, 64, 'Qualifying clients', 'I identify what a good client looks like and who I should be targeting', 'Candidate Management', '2026-04-17 10:29:50.686892');
INSERT INTO public.competencies VALUES (357, 64, 'Time management', 'I successfully manage my workload through the week.', 'Desk Management', '2026-04-17 10:29:50.635895');
INSERT INTO public.competencies VALUES (370, 64, 'Marketing', 'I successfully and effectively market candidates to clients', 'Candidate Management', '2026-04-17 10:29:50.670525');
INSERT INTO public.competencies VALUES (212, 59, 'Activity', 'I consistently hit over my minimum activity on Cube', 'Desk Management', '2026-04-17 10:29:50.251803');
INSERT INTO public.competencies VALUES (223, 59, 'Qualify', 'I qualify candidates successfully', 'Candidate Management', '2026-04-17 10:29:50.28027');
INSERT INTO public.competencies VALUES (226, 59, 'Marketing', 'I market candidates to clients effectively and successfully', 'Candidate Management', '2026-04-17 10:29:50.287836');
INSERT INTO public.competencies VALUES (227, 59, 'Placement', 'I support candidates effectively through the offer stage', 'Candidate Management', '2026-04-17 10:29:50.290563');
INSERT INTO public.competencies VALUES (228, 59, 'Relationship', 'I build trusted, long-lasting relationships', 'Candidate Management', '2026-04-17 10:29:50.293293');
INSERT INTO public.competencies VALUES (229, 59, 'Quality check', 'I ensure the quality of candidates', 'Candidate Management', '2026-04-17 10:29:50.296013');
INSERT INTO public.competencies VALUES (331, 61, 'Negotiation', 'I negotiate contracts and appropriate commercial terms.', 'Candidate Management', '2026-04-17 10:29:50.56869');
INSERT INTO public.competencies VALUES (332, 61, 'Client Strategy', 'I understand what solutions we can offer our clients and feel confident in discussing them.', 'Client Strategy', '2026-04-17 10:29:50.571503');
INSERT INTO public.competencies VALUES (333, 61, 'Client Penetration', 'I have more than one contact in the companies I work with.', 'Client Strategy', '2026-04-17 10:29:50.574262');
INSERT INTO public.competencies VALUES (334, 61, 'Vacancy Qualification', 'I qualify and rank every vacancy using the qualification form.', 'Client Strategy', '2026-04-17 10:29:50.577029');
INSERT INTO public.competencies VALUES (335, 61, 'Managing your Client', 'I have a full understanding of client process and expectations.', 'Client Strategy', '2026-04-17 10:29:50.579599');
INSERT INTO public.competencies VALUES (336, 61, 'Retaining talent', 'I play a role in ensuring we meet the HPS retention goal.', 'Growth', '2026-04-17 10:29:50.581538');
INSERT INTO public.competencies VALUES (337, 61, 'Data', 'I understand impactful data.', 'Growth', '2026-04-17 10:29:50.58415');
INSERT INTO public.competencies VALUES (339, 61, 'Mindset', 'I consistently act and behave with a growth mindset.', 'Growth', '2026-04-17 10:29:50.589792');
INSERT INTO public.competencies VALUES (340, 61, 'Personal development', 'I own my own development.', 'Development', '2026-04-17 10:29:50.592372');
INSERT INTO public.competencies VALUES (341, 61, 'Development of others', 'I participate in the development of new starters.', 'Development', '2026-04-17 10:29:50.594892');
INSERT INTO public.competencies VALUES (342, 61, 'Values alignment', 'I am aligned with and demonstrate values.', 'Culture', '2026-04-17 10:29:50.597696');
INSERT INTO public.competencies VALUES (343, 61, 'Continuous improvement', 'I play a leading role in improving the culture of HPS.', 'Culture', '2026-04-17 10:29:50.600283');
INSERT INTO public.competencies VALUES (344, 61, 'Performance', 'I am commercially aware of my own and the business''s trending performance.', 'Business', '2026-04-17 10:29:50.602738');
INSERT INTO public.competencies VALUES (345, 61, 'Innovation', 'I play a part in identifying opportunities and threats to the HPS business.', 'Business', '2026-04-17 10:29:50.605329');
INSERT INTO public.competencies VALUES (346, 61, 'Wider business strategy', 'I actively contribute to the business strategy.', 'Business', '2026-04-17 10:29:50.607902');
INSERT INTO public.competencies VALUES (356, 64, 'Activity', 'I consistently hit my minimum activity on Cube.', 'Desk Management', '2026-04-17 10:29:50.63336');
INSERT INTO public.competencies VALUES (358, 64, 'Data Quality', 'I consistently log everything on Bullhorn accurately.', 'Desk Management', '2026-04-17 10:29:50.638802');
INSERT INTO public.competencies VALUES (359, 64, 'Data awareness', 'I understand the data behind my desk that leads me to success.', 'Desk Management', '2026-04-17 10:29:50.641228');
INSERT INTO public.competencies VALUES (360, 64, 'Leads', 'I find leads independently and follow up on them.', 'Desk Management', '2026-04-17 10:29:50.643786');
INSERT INTO public.competencies VALUES (361, 64, 'Commercial Awareness', 'I am aware of my target and the activity required to achieve it.', 'Desk Management', '2026-04-17 10:29:50.646257');
INSERT INTO public.competencies VALUES (363, 64, 'Sourcing', 'I understand the process of sourcing a candidate and consistently follow it.', 'Candidate Attraction', '2026-04-17 10:29:50.651701');
INSERT INTO public.competencies VALUES (364, 64, 'Advert Writing', 'I write effective, compelling, well-written job adverts and post all jobs on our website.', 'Candidate Attraction', '2026-04-17 10:29:50.654098');
INSERT INTO public.competencies VALUES (365, 64, 'Engagement', 'I identify, engage, and get responses from candidates.', 'Candidate Attraction', '2026-04-17 10:29:50.656732');
INSERT INTO public.competencies VALUES (368, 64, 'Network building', 'I consistently build a hotlist of suitable candidates within my niches in Bullhorn', 'Candidate Management', '2026-04-17 10:29:50.664734');
INSERT INTO public.competencies VALUES (371, 64, 'Placement', 'I effectively support the candidate through the offer stage', 'Candidate Management', '2026-04-17 10:29:50.673106');
INSERT INTO public.competencies VALUES (372, 64, 'Relationship', 'I build trusted, long-lasting relationships', 'Candidate Management', '2026-04-17 10:29:50.675459');
INSERT INTO public.competencies VALUES (373, 64, 'Quality check', 'I consistently ensure the quality of candidates', 'Candidate Management', '2026-04-17 10:29:50.678363');
INSERT INTO public.competencies VALUES (374, 64, 'Building a client database', 'I research effectively to build client distribution lists', 'Candidate Management', '2026-04-17 10:29:50.680853');
INSERT INTO public.competencies VALUES (375, 64, 'Niche Specialist', 'I talk confidently about my market', 'Candidate Management', '2026-04-17 10:29:50.684512');
INSERT INTO public.competencies VALUES (377, 64, 'Sales calls', 'I successfully conduct sales calls and build relationships', 'Candidate Management', '2026-04-17 10:29:50.690185');
INSERT INTO public.competencies VALUES (378, 64, 'Client meetings', 'I confidently book and attend client meetings', 'Candidate Management', '2026-04-17 10:29:50.692636');
INSERT INTO public.competencies VALUES (379, 64, 'Negotiation', 'I negotiate contracts and appropriate commercial terms', 'Candidate Management', '2026-04-17 10:29:50.695468');
INSERT INTO public.competencies VALUES (380, 64, 'Client Strategy', 'I develop relationships with strategically identified clients', 'Client Strategy', '2026-04-17 10:29:50.698004');
INSERT INTO public.competencies VALUES (381, 64, 'Client Penetration', 'I have more than one contact in the companies I work with', 'Client Strategy', '2026-04-17 10:29:50.700853');
INSERT INTO public.competencies VALUES (382, 64, 'Vacancy Qualification', 'I qualify and rank every vacancy using the qualification form', 'Client Strategy', '2026-04-17 10:29:50.703112');
INSERT INTO public.competencies VALUES (383, 64, 'Managing your Client', 'I have a full understanding of client processes and expectations', 'Client Strategy', '2026-04-17 10:29:50.705995');
INSERT INTO public.competencies VALUES (384, 64, 'Business needs', 'I identify business needs to drive growth', 'Growth', '2026-04-17 10:29:50.708429');
INSERT INTO public.competencies VALUES (385, 64, 'Data analysis', 'I create and understand impactful data', 'Growth', '2026-04-17 10:29:50.711141');
INSERT INTO public.competencies VALUES (386, 64, 'Initiatives', 'I promote initiatives and incentives that drive growth', 'Growth', '2026-04-17 10:29:50.713511');
INSERT INTO public.competencies VALUES (387, 64, 'Mindset', 'I consistently act and behave with a growth mindset', 'Growth', '2026-04-17 10:29:50.716424');
INSERT INTO public.competencies VALUES (402, 64, 'Performance Management', 'I am responsible for managing underperformance for my team', 'People', '2026-04-17 10:29:50.759181');
INSERT INTO public.competencies VALUES (446, 63, 'Personal development', 'I own my own development.', 'Development', '2026-04-17 10:29:50.882117');
INSERT INTO public.competencies VALUES (405, 63, 'Team Leader 360', 'Most of the time', 'Core Competencies', '2026-04-17 10:29:50.76729');
INSERT INTO public.competencies VALUES (427, 63, 'Communication', 'I communicate well by listening effectively and building rapport.', 'Candidate Management', '2026-04-17 10:29:50.832535');
INSERT INTO public.competencies VALUES (395, 64, 'Behavioural', 'I drive the right behaviours within my team', 'Culture', '2026-04-17 10:29:50.738382');
INSERT INTO public.competencies VALUES (230, 59, 'Building a client database', 'I research effectively to build client distribution lists', 'Candidate Management', '2026-04-17 10:29:50.298296');
INSERT INTO public.competencies VALUES (424, 63, 'Referrals', 'I ask for and receive quality referrals from my network.', 'Candidate Attraction', '2026-04-17 10:29:50.824369');
INSERT INTO public.competencies VALUES (425, 63, 'Qualify', 'I qualify candidates successfully.', 'Candidate Management', '2026-04-17 10:29:50.827099');
INSERT INTO public.competencies VALUES (420, 63, 'Active and Passive Candidates', 'I use passive candidate attraction methods as well as active methods.', 'Candidate Attraction', '2026-04-17 10:29:50.813767');
INSERT INTO public.competencies VALUES (399, 64, 'Situational Leadership', 'I use the development journey to understand where the biggest impact can be had', 'People', '2026-04-17 10:29:50.750988');
INSERT INTO public.competencies VALUES (434, 63, 'Qualifying clients', 'I identify what a good client looks like and who I should be targeting.', 'Candidate Management', '2026-04-17 10:29:50.850855');
INSERT INTO public.competencies VALUES (232, 59, 'Qualifying clients', 'I identify what a good client looks like and who I should be targeting', 'Candidate Management', '2026-04-17 10:29:50.304274');
INSERT INTO public.competencies VALUES (428, 63, 'Marketing', 'I effectively and successfully market candidates to clients.', 'Candidate Management', '2026-04-17 10:29:50.834793');
INSERT INTO public.competencies VALUES (415, 63, 'Time management', 'I successfully manage my workload through the week', 'Desk Management', '2026-04-17 10:29:50.800616');
INSERT INTO public.competencies VALUES (233, 59, 'Sales calls', 'I successfully conduct sales calls and build relationships', 'Candidate Management', '2026-04-17 10:29:50.307112');
INSERT INTO public.competencies VALUES (234, 59, 'Client meetings', 'I confidently book and attend client meetings', 'Candidate Management', '2026-04-17 10:29:50.309993');
INSERT INTO public.competencies VALUES (235, 59, 'Negotiation', 'I negotiate contracts and appropriate commercial terms', 'Candidate Management', '2026-04-17 10:29:50.312356');
INSERT INTO public.competencies VALUES (389, 64, 'Development of others', 'I own the development of the team and am responsible for retention', 'Development', '2026-04-17 10:29:50.721448');
INSERT INTO public.competencies VALUES (390, 64, 'Adaptability', 'I identify market and business changes and alter team direction accordingly', 'Development', '2026-04-17 10:29:50.72369');
INSERT INTO public.competencies VALUES (391, 64, 'Data awareness', 'I use data to measure the performance of my team', 'Development', '2026-04-17 10:29:50.727283');
INSERT INTO public.competencies VALUES (392, 64, 'Values alignment', 'I align with and demonstrate values', 'Culture', '2026-04-17 10:29:50.729942');
INSERT INTO public.competencies VALUES (393, 64, 'Continuous improvement', 'I play a leading role in improving the culture of HPS', 'Culture', '2026-04-17 10:29:50.733091');
INSERT INTO public.competencies VALUES (394, 64, 'Contribution', 'I contribute to relevant meetings and events where appropriate', 'Culture', '2026-04-17 10:29:50.735731');
INSERT INTO public.competencies VALUES (396, 64, 'Motivate', 'I motivate my team to success', 'People', '2026-04-17 10:29:50.740874');
INSERT INTO public.competencies VALUES (397, 64, 'Inspire', 'I inspire and motivate team members', 'People', '2026-04-17 10:29:50.74378');
INSERT INTO public.competencies VALUES (398, 64, 'Wellbeing', 'I look after the well-being of my team members', 'People', '2026-04-17 10:29:50.746148');
INSERT INTO public.competencies VALUES (400, 64, 'Expectations', 'I set clear expectations', 'People', '2026-04-17 10:29:50.75343');
INSERT INTO public.competencies VALUES (401, 64, 'Hiring talent', 'I own the hiring for my team', 'People', '2026-04-17 10:29:50.756582');
INSERT INTO public.competencies VALUES (414, 63, 'Activity', 'I am consistently hitting my minimum activity on Cube', 'Desk Management', '2026-04-17 10:29:50.797739');
INSERT INTO public.competencies VALUES (416, 63, 'Data Quality', 'I consistently log everything on Bullhorn accurately', 'Desk Management', '2026-04-17 10:29:50.80327');
INSERT INTO public.competencies VALUES (417, 63, 'Data awareness', 'I understand the data behind my desk that leads me to success', 'Desk Management', '2026-04-17 10:29:50.805988');
INSERT INTO public.competencies VALUES (418, 63, 'Leads', 'I find leads independently and follow up on them', 'Desk Management', '2026-04-17 10:29:50.808369');
INSERT INTO public.competencies VALUES (419, 63, 'Commercial Awareness', 'I am aware of my target and the activity required to achieve it.', 'Desk Management', '2026-04-17 10:29:50.811334');
INSERT INTO public.competencies VALUES (421, 63, 'Sourcing', 'I understand the process of sourcing a candidate and follow it.', 'Candidate Attraction', '2026-04-17 10:29:50.81666');
INSERT INTO public.competencies VALUES (422, 63, 'Advert Writing', 'I write effective, compelling, well-written job adverts and consistently post all jobs on our website.', 'Candidate Attraction', '2026-04-17 10:29:50.818872');
INSERT INTO public.competencies VALUES (423, 63, 'Engagement', 'I identify, engage, and get responses from candidates.', 'Candidate Attraction', '2026-04-17 10:29:50.821699');
INSERT INTO public.competencies VALUES (426, 63, 'Network building', 'I build a hotlist of suitable candidates within my niches in Bullhorn.', 'Candidate Management', '2026-04-17 10:29:50.829728');
INSERT INTO public.competencies VALUES (429, 63, 'Placement', 'I support the candidate through the offer stage effectively.', 'Candidate Management', '2026-04-17 10:29:50.837542');
INSERT INTO public.competencies VALUES (430, 63, 'Relationship', 'I build trusted, long-lasting relationships.', 'Candidate Management', '2026-04-17 10:29:50.839922');
INSERT INTO public.competencies VALUES (431, 63, 'Quality check', 'I ensure the quality of candidates.', 'Candidate Management', '2026-04-17 10:29:50.842689');
INSERT INTO public.competencies VALUES (432, 63, 'Building a client database', 'I research effectively to build client distribution lists.', 'Candidate Management', '2026-04-17 10:29:50.845607');
INSERT INTO public.competencies VALUES (433, 63, 'Niche Specialist', 'I talk confidently about my market.', 'Candidate Management', '2026-04-17 10:29:50.848254');
INSERT INTO public.competencies VALUES (435, 63, 'Sales calls', 'I successfully conduct sales calls and build relationships.', 'Candidate Management', '2026-04-17 10:29:50.853534');
INSERT INTO public.competencies VALUES (436, 63, 'Client meetings', 'I confidently book and attend client meetings.', 'Candidate Management', '2026-04-17 10:29:50.856485');
INSERT INTO public.competencies VALUES (437, 63, 'Negotiation', 'I negotiate contracts and appropriate commercial terms.', 'Candidate Management', '2026-04-17 10:29:50.85968');
INSERT INTO public.competencies VALUES (438, 63, 'Client Strategy', 'I develop relationships with strategically identified clients.', 'Client Strategy', '2026-04-17 10:29:50.861962');
INSERT INTO public.competencies VALUES (439, 63, 'Client Penetration', 'I have more than one contact in the companies I work with.', 'Client Strategy', '2026-04-17 10:29:50.864716');
INSERT INTO public.competencies VALUES (440, 63, 'Vacancy Qualification', 'I qualify and rank every vacancy using the qualification form.', 'Client Strategy', '2026-04-17 10:29:50.866911');
INSERT INTO public.competencies VALUES (441, 63, 'Managing your Client', 'I have a full understanding of client process and expectations.', 'Client Strategy', '2026-04-17 10:29:50.869657');
INSERT INTO public.competencies VALUES (442, 63, 'Business needs', 'I identify business needs to drive growth.', 'Growth', '2026-04-17 10:29:50.871772');
INSERT INTO public.competencies VALUES (443, 63, 'Data analysis', 'I create and understand impactful data.', 'Growth', '2026-04-17 10:29:50.874677');
INSERT INTO public.competencies VALUES (444, 63, 'Initiatives', 'I promote initiatives and incentives that drive growth.', 'Growth', '2026-04-17 10:29:50.87699');
INSERT INTO public.competencies VALUES (445, 63, 'Mindset', 'I consistently act and behave with a growth mindset.', 'Growth', '2026-04-17 10:29:50.879811');
INSERT INTO public.competencies VALUES (447, 63, 'Development of others', 'I own the development of the team and am responsible for retention.', 'Development', '2026-04-17 10:29:50.884859');
INSERT INTO public.competencies VALUES (448, 63, 'Adaptability', 'I identify market/business changes and alter team direction accordingly.', 'Development', '2026-04-17 10:29:50.887115');
INSERT INTO public.competencies VALUES (460, 63, 'Performance Management', 'I am responsible for managing underperformance for my team.', 'People', '2026-04-17 10:29:51.00518');
INSERT INTO public.competencies VALUES (504, 66, 'Scale', 'I have the foresight to scale and develop my team', 'Growth', '2026-04-17 10:29:51.128879');
INSERT INTO public.competencies VALUES (463, 66, 'Divisional Manager 360', 'Most of the time', 'Core Competencies', '2026-04-17 10:29:51.013708');
INSERT INTO public.competencies VALUES (485, 66, 'Communication', 'I communicate well by listening effectively and building rapport', 'Candidate Management', '2026-04-17 10:29:51.075068');
INSERT INTO public.competencies VALUES (453, 63, 'Behavioural', 'I drive the right behaviours within my team.', 'Culture', '2026-04-17 10:29:50.899683');
INSERT INTO public.competencies VALUES (236, 59, 'Client Strategy', 'I understand what solutions we can offer our clients and feel confident in discussing them', 'Client Strategy', '2026-04-17 10:29:50.315312');
INSERT INTO public.competencies VALUES (482, 66, 'Referrals', 'I ask for and receive quality referrals from my network', 'Candidate Attraction', '2026-04-17 10:29:51.066557');
INSERT INTO public.competencies VALUES (483, 66, 'Qualify', 'I successfully qualify candidates', 'Candidate Management', '2026-04-17 10:29:51.069751');
INSERT INTO public.competencies VALUES (478, 66, 'Active and Passive Candidates', 'I use passive candidate attraction methods as well as active methods', 'Candidate Attraction', '2026-04-17 10:29:51.055179');
INSERT INTO public.competencies VALUES (457, 63, 'Situational Leadership', 'I use the development journey to understand where the biggest impact can be had.', 'People', '2026-04-17 10:29:50.996923');
INSERT INTO public.competencies VALUES (493, 66, 'Sales calls', 'I successfully conduct sales calls and build relationships', 'Candidate Management', '2026-04-17 10:29:51.096362');
INSERT INTO public.competencies VALUES (237, 59, 'Client Penetration', 'I have more than one contact in the companies I work with', 'Client Strategy', '2026-04-17 10:29:50.317908');
INSERT INTO public.competencies VALUES (486, 66, 'Marketing', 'I effectively market candidates to clients', 'Candidate Management', '2026-04-17 10:29:51.077273');
INSERT INTO public.competencies VALUES (238, 59, 'Vacancy Qualification', 'I qualify and rank every vacancy using the qualification form', 'Client Strategy', '2026-04-17 10:29:50.320614');
INSERT INTO public.competencies VALUES (239, 59, 'Managing your Client', 'I have a full understanding of client processes and expectations', 'Client Strategy', '2026-04-17 10:29:50.32316');
INSERT INTO public.competencies VALUES (240, 59, 'Retaining talent', 'I play a role in ensuring we meet the HPS retention goal', 'Growth', '2026-04-17 10:29:50.325936');
INSERT INTO public.competencies VALUES (452, 63, 'Contribution', 'I contribute to relevant meetings and events where appropriate.', 'Culture', '2026-04-17 10:29:50.896845');
INSERT INTO public.competencies VALUES (454, 63, 'Motivate', 'I motivate my team to success.', 'People', '2026-04-17 10:29:50.901958');
INSERT INTO public.competencies VALUES (455, 63, 'Inspire', 'I inspire and motivate my team members.', 'People', '2026-04-17 10:29:50.991327');
INSERT INTO public.competencies VALUES (456, 63, 'Wellbeing', 'I look after the well-being of my team members.', 'People', '2026-04-17 10:29:50.994681');
INSERT INTO public.competencies VALUES (458, 63, 'Expectations', 'I set clear expectations.', 'People', '2026-04-17 10:29:50.999754');
INSERT INTO public.competencies VALUES (459, 63, 'Hiring talent', 'I own the hiring for my team.', 'People', '2026-04-17 10:29:51.002096');
INSERT INTO public.competencies VALUES (472, 66, 'Activity', 'I consistently hit my minimum activity on Cube', 'Desk Management', '2026-04-17 10:29:51.039016');
INSERT INTO public.competencies VALUES (473, 66, 'Time management', 'I successfully manage my workload through the week', 'Desk Management', '2026-04-17 10:29:51.041935');
INSERT INTO public.competencies VALUES (474, 66, 'Data Quality', 'I consistently log everything on Bullhorn accurately', 'Desk Management', '2026-04-17 10:29:51.044249');
INSERT INTO public.competencies VALUES (475, 66, 'Data awareness', 'I understand the data behind my desk that leads me to success', 'Desk Management', '2026-04-17 10:29:51.047117');
INSERT INTO public.competencies VALUES (476, 66, 'Leads', 'I find leads independently and follow up on them', 'Desk Management', '2026-04-17 10:29:51.04952');
INSERT INTO public.competencies VALUES (477, 66, 'Commercial Awareness', 'I am aware of my target and the activity required to achieve it', 'Desk Management', '2026-04-17 10:29:51.052445');
INSERT INTO public.competencies VALUES (479, 66, 'Sourcing', 'I understand the process of sourcing a candidate and follow it', 'Candidate Attraction', '2026-04-17 10:29:51.058086');
INSERT INTO public.competencies VALUES (480, 66, 'Advert Writing', 'I write effective, compelling, well-written job adverts and consistently post all jobs on our website', 'Candidate Attraction', '2026-04-17 10:29:51.061015');
INSERT INTO public.competencies VALUES (481, 66, 'Engagement', 'I identify, engage, and get responses from candidates', 'Candidate Attraction', '2026-04-17 10:29:51.0638');
INSERT INTO public.competencies VALUES (484, 66, 'Network building', 'I build a hotlist of suitable candidates within my niches in Bullhorn', 'Candidate Management', '2026-04-17 10:29:51.072023');
INSERT INTO public.competencies VALUES (487, 66, 'Placement', 'I support candidates effectively through the offer stage', 'Candidate Management', '2026-04-17 10:29:51.080141');
INSERT INTO public.competencies VALUES (488, 66, 'Relationship', 'I build trusted, long-lasting relationships', 'Candidate Management', '2026-04-17 10:29:51.082455');
INSERT INTO public.competencies VALUES (489, 66, 'Quality check', 'I consistently ensure the quality of candidates', 'Candidate Management', '2026-04-17 10:29:51.085347');
INSERT INTO public.competencies VALUES (490, 66, 'Building a client database', 'I research effectively to build client distribution lists', 'Candidate Management', '2026-04-17 10:29:51.088548');
INSERT INTO public.competencies VALUES (491, 66, 'Niche Specialist', 'I talk confidently about my market', 'Candidate Management', '2026-04-17 10:29:51.090859');
INSERT INTO public.competencies VALUES (492, 66, 'Qualifying clients', 'I identify what a good client looks like and who I should be targeting', 'Candidate Management', '2026-04-17 10:29:51.093656');
INSERT INTO public.competencies VALUES (494, 66, 'Client meetings', 'I confidently book and attend client meetings', 'Candidate Management', '2026-04-17 10:29:51.09935');
INSERT INTO public.competencies VALUES (495, 66, 'Negotiation', 'I negotiate contracts and appropriate commercial terms', 'Candidate Management', '2026-04-17 10:29:51.101654');
INSERT INTO public.competencies VALUES (496, 66, 'Client Strategy', 'I ensure all business activity is commercially focused and give strategic guidance', 'Client Strategy', '2026-04-17 10:29:51.104498');
INSERT INTO public.competencies VALUES (497, 66, 'Client Penetration', 'I have more than one contact in the companies I work with', 'Client Strategy', '2026-04-17 10:29:51.10677');
INSERT INTO public.competencies VALUES (498, 66, 'Vacancy Qualification', 'I qualify and rank every vacancy using the qualification form', 'Client Strategy', '2026-04-17 10:29:51.109878');
INSERT INTO public.competencies VALUES (499, 66, 'Managing your Client', 'I manage clients', 'Client Strategy', '2026-04-17 10:29:51.113764');
INSERT INTO public.competencies VALUES (500, 66, 'Business needs', 'I identify business needs to drive growth', 'Growth', '2026-04-17 10:29:51.116626');
INSERT INTO public.competencies VALUES (501, 66, 'Data analysis', 'I create and understand impactful data', 'Growth', '2026-04-17 10:29:51.11907');
INSERT INTO public.competencies VALUES (502, 66, 'Initiatives', 'I promote initiatives and incentives that drive growth', 'Growth', '2026-04-17 10:29:51.12252');
INSERT INTO public.competencies VALUES (503, 66, 'Mindset', 'I consistently act and behave with a growth mindset', 'Growth', '2026-04-17 10:29:51.125588');
INSERT INTO public.competencies VALUES (505, 66, 'Personal development', 'I own my own development', 'Development', '2026-04-17 10:29:51.13156');
INSERT INTO public.competencies VALUES (506, 66, 'Development of others', 'I own the development of the team and am responsible for retention', 'Development', '2026-04-17 10:29:51.134657');
INSERT INTO public.competencies VALUES (1039, 43, 'Senior Consultant 180 (Delivery)', 'I Most of the time', 'Core Competencies', '2026-04-17 10:30:29.477789');
INSERT INTO public.competencies VALUES (520, 66, 'Performance Management', 'I am responsible for managing underperformance for my team', 'People', '2026-04-17 10:29:51.177278');
INSERT INTO public.competencies VALUES (548, 65, 'Communication', 'I communicate well by listening effectively and building rapport', 'Candidate Management', '2026-04-17 10:29:51.25186');
INSERT INTO public.competencies VALUES (526, 65, 'Divisional Manager 360', 'Most of the time', 'Core Competencies', '2026-04-17 10:29:51.192634');
INSERT INTO public.competencies VALUES (513, 66, 'Behavioural', 'I drive the right behaviours within my team', 'Culture', '2026-04-17 10:29:51.157837');
INSERT INTO public.competencies VALUES (546, 65, 'Qualify', 'I qualify candidates successfully', 'Candidate Management', '2026-04-17 10:29:51.24641');
INSERT INTO public.competencies VALUES (547, 65, 'Network building', 'I build a hotlist of suitable candidates within my niches in Bullhorn', 'Candidate Management', '2026-04-17 10:29:51.248823');
INSERT INTO public.competencies VALUES (541, 65, 'Active and Passive Candidates', 'I use passive candidate attraction methods as well as active methods', 'Candidate Attraction', '2026-04-17 10:29:51.232688');
INSERT INTO public.competencies VALUES (517, 66, 'Situational Leadership', 'I use the development journey to understand where the biggest impact can be had', 'People', '2026-04-17 10:29:51.168831');
INSERT INTO public.competencies VALUES (557, 65, 'Client meetings', 'I confidently book and attend client meetings', 'Candidate Management', '2026-04-17 10:29:51.277742');
INSERT INTO public.competencies VALUES (242, 59, 'Initiatives', 'I promote initiatives and incentives that drive growth', 'Growth', '2026-04-17 10:29:50.331162');
INSERT INTO public.competencies VALUES (551, 65, 'Relationship', 'I build trusted, long-lasting relationships', 'Candidate Management', '2026-04-17 10:29:51.26102');
INSERT INTO public.competencies VALUES (243, 59, 'Mindset', 'I consistently act and behave with a growth mindset', 'Growth', '2026-04-17 10:29:50.334001');
INSERT INTO public.competencies VALUES (244, 59, 'Personal development', 'I own my own development', 'Development', '2026-04-17 10:29:50.336955');
INSERT INTO public.competencies VALUES (245, 59, 'Development of others', 'I participate in the development of new starters', 'Development', '2026-04-17 10:29:50.339831');
INSERT INTO public.competencies VALUES (246, 59, 'Values alignment', 'I am aligned with and demonstrate values', 'Culture', '2026-04-17 10:29:50.342694');
INSERT INTO public.competencies VALUES (247, 59, 'Continuous improvement', 'I play a leading role in improving the culture of HPS', 'Culture', '2026-04-17 10:29:50.34535');
INSERT INTO public.competencies VALUES (248, 59, 'Performance', 'I am commercially aware of my own and the business''s trending performance', 'Business', '2026-04-17 10:29:50.348521');
INSERT INTO public.competencies VALUES (507, 66, 'Adaptability', 'I identify market/business changes and alter team direction accordingly', 'Development', '2026-04-17 10:29:51.137628');
INSERT INTO public.competencies VALUES (508, 66, 'Data awareness', 'I use data to measure the performance of my team', 'Development', '2026-04-17 10:29:51.140911');
INSERT INTO public.competencies VALUES (509, 66, 'Business needs', 'I support development of the business', 'Development', '2026-04-17 10:29:51.144076');
INSERT INTO public.competencies VALUES (510, 66, 'Values alignment', 'I am aligned with and demonstrate values', 'Culture', '2026-04-17 10:29:51.147647');
INSERT INTO public.competencies VALUES (511, 66, 'Continuous improvement', 'I play a leading role in improving the culture of HPS', 'Culture', '2026-04-17 10:29:51.150908');
INSERT INTO public.competencies VALUES (512, 66, 'Contribution', 'I contribute to relevant meetings and events where appropriate', 'Culture', '2026-04-17 10:29:51.155659');
INSERT INTO public.competencies VALUES (514, 66, 'Motivate', 'I motivate my team to success', 'People', '2026-04-17 10:29:51.160719');
INSERT INTO public.competencies VALUES (515, 66, 'Inspire', 'I inspire and motivate team members', 'People', '2026-04-17 10:29:51.162962');
INSERT INTO public.competencies VALUES (516, 66, 'Wellbeing', 'I look after the well-being of my team members', 'People', '2026-04-17 10:29:51.165942');
INSERT INTO public.competencies VALUES (518, 66, 'Expectations', 'I set clear expectations', 'People', '2026-04-17 10:29:51.171878');
INSERT INTO public.competencies VALUES (519, 66, 'Hiring talent', 'I own the hiring for my team', 'People', '2026-04-17 10:29:51.17445');
INSERT INTO public.competencies VALUES (523, 66, 'Communication', 'I create a local-level micro culture to consistently drive high standards', 'Organisational', '2026-04-17 10:29:51.184969');
INSERT INTO public.competencies VALUES (524, 66, 'Change Mangement', 'I navigate change successfully', 'Organisational', '2026-04-17 10:29:51.187651');
INSERT INTO public.competencies VALUES (525, 66, 'Goal setting', 'I set clear goals and objectives', 'Organisational', '2026-04-17 10:29:51.189852');
INSERT INTO public.competencies VALUES (535, 65, 'Activity', 'I consistently hit my minimum activity on Cube', 'Desk Management', '2026-04-17 10:29:51.216995');
INSERT INTO public.competencies VALUES (536, 65, 'Time management', 'I successfully manage my workload through the week', 'Desk Management', '2026-04-17 10:29:51.219727');
INSERT INTO public.competencies VALUES (537, 65, 'Data Quality', 'I consistently log everything on Bullhorn accurately', 'Desk Management', '2026-04-17 10:29:51.222292');
INSERT INTO public.competencies VALUES (538, 65, 'Data awareness', 'I understand the data behind my desk that leads me to success', 'Desk Management', '2026-04-17 10:29:51.22498');
INSERT INTO public.competencies VALUES (539, 65, 'Leads', 'I find leads independently and follow up on them', 'Desk Management', '2026-04-17 10:29:51.227229');
INSERT INTO public.competencies VALUES (540, 65, 'Commercial Awareness', 'I am aware of my target and the activity required to achieve it', 'Desk Management', '2026-04-17 10:29:51.230483');
INSERT INTO public.competencies VALUES (542, 65, 'Sourcing', 'I understand the process of sourcing a candidate and follow it', 'Candidate Attraction', '2026-04-17 10:29:51.235454');
INSERT INTO public.competencies VALUES (543, 65, 'Advert Writing', 'I write effective, compelling, well-written job adverts and post all jobs on our website', 'Candidate Attraction', '2026-04-17 10:29:51.23784');
INSERT INTO public.competencies VALUES (544, 65, 'Engagement', 'I identify, engage, and get responses from candidates', 'Candidate Attraction', '2026-04-17 10:29:51.240695');
INSERT INTO public.competencies VALUES (545, 65, 'Referrals', 'I ask and receive quality referrals from my network', 'Candidate Attraction', '2026-04-17 10:29:51.243294');
INSERT INTO public.competencies VALUES (549, 65, 'Marketing', 'I effectively market candidates to clients successfully', 'Candidate Management', '2026-04-17 10:29:51.254929');
INSERT INTO public.competencies VALUES (550, 65, 'Placement', 'I support the candidate through the offer stage effectively', 'Candidate Management', '2026-04-17 10:29:51.257753');
INSERT INTO public.competencies VALUES (552, 65, 'Quality check', 'I ensure the quality of candidates', 'Candidate Management', '2026-04-17 10:29:51.263939');
INSERT INTO public.competencies VALUES (553, 65, 'Building a client database', 'I research effectively to build client distribution lists', 'Candidate Management', '2026-04-17 10:29:51.266237');
INSERT INTO public.competencies VALUES (554, 65, 'Niche Specialist', 'I talk confidently about my market', 'Candidate Management', '2026-04-17 10:29:51.269129');
INSERT INTO public.competencies VALUES (555, 65, 'Qualifying clients', 'I identify what a good client looks like and who I should be targeting', 'Candidate Management', '2026-04-17 10:29:51.271758');
INSERT INTO public.competencies VALUES (556, 65, 'Sales calls', 'I successfully conduct sales calls and build relationships', 'Candidate Management', '2026-04-17 10:29:51.274629');
INSERT INTO public.competencies VALUES (558, 65, 'Negotiation', 'I negotiate contracts and appropriate commercial terms', 'Candidate Management', '2026-04-17 10:29:51.28063');
INSERT INTO public.competencies VALUES (559, 65, 'Client Strategy', 'I ensure all business activity is commercially focused and give strategic guidance', 'Client Strategy', '2026-04-17 10:29:51.283277');
INSERT INTO public.competencies VALUES (560, 65, 'Client Penetration', 'I have more than one contact in the companies I work with', 'Client Strategy', '2026-04-17 10:29:51.286127');
INSERT INTO public.competencies VALUES (587, 65, 'Change Mangement', 'I navigate change successfully', 'Organisational', '2026-04-17 10:29:51.359187');
INSERT INTO public.competencies VALUES (567, 65, 'Scale', 'I have the foresight to scale and develop my team', 'Growth', '2026-04-17 10:29:51.303863');
INSERT INTO public.competencies VALUES (589, 68, 'Associate Director 360', 'Most of the time', 'Core Competencies', '2026-04-17 10:29:51.365303');
INSERT INTO public.competencies VALUES (614, 68, 'Relationship', 'I can build trusted, long-lasting relationships', 'Core Sales Skills', '2026-04-17 10:29:51.431519');
INSERT INTO public.competencies VALUES (576, 65, 'Behavioural', 'I drive the right behaviours within my team', 'Culture', '2026-04-17 10:29:51.329606');
INSERT INTO public.competencies VALUES (221, 59, 'Engagement', 'I identify, engage, and get responses from candidates', 'Candidate Attraction', '2026-04-17 10:29:50.275676');
INSERT INTO public.competencies VALUES (609, 68, 'Qualify', 'I can qualify candidates successfully', 'Core Sales Skills', '2026-04-17 10:29:51.417683');
INSERT INTO public.competencies VALUES (610, 68, 'Network building', 'I can build a hotlist of suitable candidates within my niches in Bullhorn', 'Core Sales Skills', '2026-04-17 10:29:51.420699');
INSERT INTO public.competencies VALUES (605, 68, 'Sourcing', 'I understand the process of sourcing a candidate and follow it', 'Core Sales Skills', '2026-04-17 10:29:51.407466');
INSERT INTO public.competencies VALUES (580, 65, 'Situational Leadership', 'I use the development journey to understand where the biggest impact can be had', 'People', '2026-04-17 10:29:51.340573');
INSERT INTO public.competencies VALUES (224, 59, 'Network building', 'I build a hotlist of suitable candidates within my niches in Bullhorn', 'Candidate Management', '2026-04-17 10:29:50.282848');
INSERT INTO public.competencies VALUES (615, 68, 'Quality check', 'I consistently ensure the quality of candidates', 'Core Sales Skills', '2026-04-17 10:29:51.434121');
INSERT INTO public.competencies VALUES (599, 68, 'Time management', 'I successfully manage my workload through the week', 'Core Sales Skills', '2026-04-17 10:29:51.39158');
INSERT INTO public.competencies VALUES (241, 59, 'Data', 'I understand impactful data', 'Growth', '2026-04-17 10:29:50.328819');
INSERT INTO public.competencies VALUES (249, 59, 'Innovation', 'I play a part in identifying opportunities and threats to the HPS business', 'Business', '2026-04-17 10:29:50.350877');
INSERT INTO public.competencies VALUES (250, 59, 'Wider business strategy', 'I actively contribute to the business strategy', 'Business', '2026-04-17 10:29:50.353328');
INSERT INTO public.competencies VALUES (561, 65, 'Vacancy Qualification', 'I qualify and rank every vacancy using the qualification form', 'Client Strategy', '2026-04-17 10:29:51.288409');
INSERT INTO public.competencies VALUES (562, 65, 'Managing your Client', 'I am able to manage clients', 'Client Strategy', '2026-04-17 10:29:51.29115');
INSERT INTO public.competencies VALUES (563, 65, 'Business needs', 'I identify business needs to drive growth', 'Growth', '2026-04-17 10:29:51.293807');
INSERT INTO public.competencies VALUES (564, 65, 'Data analysis', 'I create and understand impactful data', 'Growth', '2026-04-17 10:29:51.29664');
INSERT INTO public.competencies VALUES (565, 65, 'Initiatives', 'I promote initiatives and incentives that drive growth', 'Growth', '2026-04-17 10:29:51.298874');
INSERT INTO public.competencies VALUES (566, 65, 'Mindset', 'I consistently act and behave with a growth mindset', 'Growth', '2026-04-17 10:29:51.301504');
INSERT INTO public.competencies VALUES (568, 65, 'Personal development', 'I own my own development', 'Development', '2026-04-17 10:29:51.307083');
INSERT INTO public.competencies VALUES (569, 65, 'Development of others', 'I own the development of the team and am responsible for retention', 'Development', '2026-04-17 10:29:51.309466');
INSERT INTO public.competencies VALUES (570, 65, 'Adaptability', 'I identify market/business changes and alter team direction accordingly', 'Development', '2026-04-17 10:29:51.312197');
INSERT INTO public.competencies VALUES (571, 65, 'Data awareness', 'I use data to measure the performance of my team', 'Development', '2026-04-17 10:29:51.314706');
INSERT INTO public.competencies VALUES (572, 65, 'Business needs', 'I support the development of the business', 'Development', '2026-04-17 10:29:51.318067');
INSERT INTO public.competencies VALUES (573, 65, 'Values alignment', 'I am aligned with and demonstrate the values', 'Culture', '2026-04-17 10:29:51.320509');
INSERT INTO public.competencies VALUES (574, 65, 'Continuous improvement', 'I play a leading role in improving the culture of HPS', 'Culture', '2026-04-17 10:29:51.32409');
INSERT INTO public.competencies VALUES (575, 65, 'Contribution', 'I contribute to relevant meetings and events where appropriate', 'Culture', '2026-04-17 10:29:51.326464');
INSERT INTO public.competencies VALUES (577, 65, 'Motivate', 'I motivate my team to success', 'People', '2026-04-17 10:29:51.332181');
INSERT INTO public.competencies VALUES (578, 65, 'Inspire', 'I inspire and motivate team members', 'People', '2026-04-17 10:29:51.335047');
INSERT INTO public.competencies VALUES (579, 65, 'Wellbeing', 'I look after the well-being of my team members', 'People', '2026-04-17 10:29:51.337564');
INSERT INTO public.competencies VALUES (581, 65, 'Expectations', 'I set clear expectations', 'People', '2026-04-17 10:29:51.342979');
INSERT INTO public.competencies VALUES (582, 65, 'Hiring talent', 'I own the hiring for my team', 'People', '2026-04-17 10:29:51.346134');
INSERT INTO public.competencies VALUES (583, 65, 'Performance Management', 'I am responsible for managing underperformance in my team', 'People', '2026-04-17 10:29:51.348682');
INSERT INTO public.competencies VALUES (586, 65, 'Communication', 'I create local-level micro culture to drive high standards', 'Organisational', '2026-04-17 10:29:51.356955');
INSERT INTO public.competencies VALUES (588, 65, 'Goal setting', 'I can set clear goals and objectives', 'Organisational', '2026-04-17 10:29:51.361908');
INSERT INTO public.competencies VALUES (598, 68, 'Activity', 'I consistently hit my minimum activity on Cube', 'Core Sales Skills', '2026-04-17 10:29:51.389289');
INSERT INTO public.competencies VALUES (600, 68, 'Data Quality', 'I consistently log everything on Bullhorn accurately', 'Core Sales Skills', '2026-04-17 10:29:51.39432');
INSERT INTO public.competencies VALUES (601, 68, 'Data awareness', 'I understand the data behind my desk that leads me to success', 'Core Sales Skills', '2026-04-17 10:29:51.396426');
INSERT INTO public.competencies VALUES (602, 68, 'Leads', 'I find leads independently and follow up on them', 'Core Sales Skills', '2026-04-17 10:29:51.399577');
INSERT INTO public.competencies VALUES (603, 68, 'Commercial Awareness', 'I am aware of my target and the activity required to achieve it', 'Core Sales Skills', '2026-04-17 10:29:51.402134');
INSERT INTO public.competencies VALUES (604, 68, 'Active and Passive Candidates', 'I use passive candidate attraction methods as well as active methods', 'Core Sales Skills', '2026-04-17 10:29:51.40514');
INSERT INTO public.competencies VALUES (606, 68, 'Advert Writing', 'I can write an effective, compelling, well-written job advert and post all jobs on our website', 'Core Sales Skills', '2026-04-17 10:29:51.410284');
INSERT INTO public.competencies VALUES (607, 68, 'Engagement', 'I can identify, engage, and get responses from candidates', 'Core Sales Skills', '2026-04-17 10:29:51.41262');
INSERT INTO public.competencies VALUES (608, 68, 'Referrals', 'I ask and receive quality referrals from my network', 'Core Sales Skills', '2026-04-17 10:29:51.415441');
INSERT INTO public.competencies VALUES (611, 68, 'Communication', 'I communicate well by listening effectively and building rapport', 'Core Sales Skills', '2026-04-17 10:29:51.423084');
INSERT INTO public.competencies VALUES (612, 68, 'Marketing', 'I can effectively market candidates to clients successfully', 'Core Sales Skills', '2026-04-17 10:29:51.426006');
INSERT INTO public.competencies VALUES (613, 68, 'Placement', 'I can support the candidate through the offer stage effectively', 'Core Sales Skills', '2026-04-17 10:29:51.428428');
INSERT INTO public.competencies VALUES (616, 68, 'Building a client database', 'I can research effectively to build client distribution lists', 'Core Sales Skills', '2026-04-17 10:29:51.436867');
INSERT INTO public.competencies VALUES (630, 68, 'Scale', 'I have the foresight to scale and develop my team', 'Growth', '2026-04-17 10:29:51.474212');
INSERT INTO public.competencies VALUES (639, 68, 'Behavioural', 'I drive the right behaviours within my team', 'Culture', '2026-04-17 10:29:51.496916');
INSERT INTO public.competencies VALUES (652, 67, 'Associate Director 360', 'Most of the time', 'Core Competencies', '2026-04-17 10:29:51.531452');
INSERT INTO public.competencies VALUES (1117, 45, 'Commercial Awareness', 'I am aware of my target and the activity required to achieve it', 'Desk Management', '2026-04-17 10:30:29.698215');
INSERT INTO public.competencies VALUES (667, 67, 'Active and Passive Candidates', 'I use passive candidate attraction methods as well as active', 'Core Sales Skills', '2026-04-17 10:29:51.571447');
INSERT INTO public.competencies VALUES (643, 68, 'Situational Leadership', 'I use the development journey to understand where the biggest impact can be had', 'People', '2026-04-17 10:29:51.507716');
INSERT INTO public.competencies VALUES (618, 68, 'Qualifying clients', 'I can identify what a good client looks like and who I should be targeting', 'Core Sales Skills', '2026-04-17 10:29:51.441819');
INSERT INTO public.competencies VALUES (662, 67, 'Time management', 'I successfully manage my workload through the week', 'Core Sales Skills', '2026-04-17 10:29:51.558677');
INSERT INTO public.competencies VALUES (222, 59, 'Referrals', 'I ask for and receive quality referrals from my network', 'Candidate Attraction', '2026-04-17 10:29:50.277839');
INSERT INTO public.competencies VALUES (225, 59, 'Communication', 'I communicate well by listening effectively and building rapport', 'Candidate Management', '2026-04-17 10:29:50.285398');
INSERT INTO public.competencies VALUES (231, 59, 'Niche Specialist', 'I talk confidently about my market', 'Candidate Management', '2026-04-17 10:29:50.301094');
INSERT INTO public.competencies VALUES (617, 68, 'Niche Specialist', 'I can talk confidently about my market', 'Core Sales Skills', '2026-04-17 10:29:51.439157');
INSERT INTO public.competencies VALUES (619, 68, 'Sales calls', 'I can successfully conduct a sales call and build relationships', 'Core Sales Skills', '2026-04-17 10:29:51.444184');
INSERT INTO public.competencies VALUES (620, 68, 'Client meetings', 'I can confidently book and attend client meetings', 'Core Sales Skills', '2026-04-17 10:29:51.446987');
INSERT INTO public.competencies VALUES (621, 68, 'Negotiation', 'I can negotiate contracts and appropriate commercial terms', 'Core Sales Skills', '2026-04-17 10:29:51.44969');
INSERT INTO public.competencies VALUES (622, 68, 'Client Strategy', 'I ensure all business activity is commercially focused and give strategic guidance', 'Core Sales Skills', '2026-04-17 10:29:51.45307');
INSERT INTO public.competencies VALUES (623, 68, 'Client Penetration', 'I have more than one contact in the companies I work with', 'Core Sales Skills', '2026-04-17 10:29:51.455266');
INSERT INTO public.competencies VALUES (624, 68, 'Vacancy Qualification', 'I qualify and rank every vacancy using the qualification form', 'Core Sales Skills', '2026-04-17 10:29:51.458076');
INSERT INTO public.competencies VALUES (625, 68, 'Managing your Client', 'I am able to manage clients', 'Core Sales Skills', '2026-04-17 10:29:51.460698');
INSERT INTO public.competencies VALUES (626, 68, 'Business needs', 'I am able to identify business needs to drive growth', 'Growth', '2026-04-17 10:29:51.463735');
INSERT INTO public.competencies VALUES (627, 68, 'Data analysis', 'I am able to create and understand impactful data', 'Growth', '2026-04-17 10:29:51.466028');
INSERT INTO public.competencies VALUES (628, 68, 'Initiatives', 'I promote initiatives and incentives that drive growth', 'Growth', '2026-04-17 10:29:51.469148');
INSERT INTO public.competencies VALUES (629, 68, 'Mindset', 'I consistently act and behave with a growth mindset', 'Growth', '2026-04-17 10:29:51.471389');
INSERT INTO public.competencies VALUES (631, 68, 'Personal development', 'I own my own development', 'Development', '2026-04-17 10:29:51.476638');
INSERT INTO public.competencies VALUES (632, 68, 'Development of others', 'I own the development of the team and am responsible for retention', 'Development', '2026-04-17 10:29:51.479373');
INSERT INTO public.competencies VALUES (633, 68, 'Adaptability', 'I identify market/business changes and alter team direction accordingly', 'Development', '2026-04-17 10:29:51.481584');
INSERT INTO public.competencies VALUES (634, 68, 'Data awareness', 'I use data to measure the performance of my team', 'Development', '2026-04-17 10:29:51.484328');
INSERT INTO public.competencies VALUES (635, 68, 'Business needs', 'I support the development of the business', 'Development', '2026-04-17 10:29:51.486456');
INSERT INTO public.competencies VALUES (636, 68, 'Values alignment', 'I am aligned with and demonstrate values', 'Culture', '2026-04-17 10:29:51.489113');
INSERT INTO public.competencies VALUES (637, 68, 'Continuous improvement', 'I play a leading role in improving the culture of my area of responsibility', 'Culture', '2026-04-17 10:29:51.491263');
INSERT INTO public.competencies VALUES (638, 68, 'Contribution', 'I contribute to relevant meetings and events where appropriate', 'Culture', '2026-04-17 10:29:51.494093');
INSERT INTO public.competencies VALUES (640, 68, 'Motivate', 'I am able to motivate my team to success', 'People', '2026-04-17 10:29:51.499881');
INSERT INTO public.competencies VALUES (641, 68, 'Inspire', 'I inspire and motivate team members', 'People', '2026-04-17 10:29:51.502274');
INSERT INTO public.competencies VALUES (642, 68, 'Wellbeing', 'I look after the well-being of my team members', 'People', '2026-04-17 10:29:51.50545');
INSERT INTO public.competencies VALUES (644, 68, 'Expectations', 'I set clear expectations', 'People', '2026-04-17 10:29:51.510415');
INSERT INTO public.competencies VALUES (645, 68, 'Hiring talent', 'I own the hiring plan for my area of the business', 'People', '2026-04-17 10:29:51.512577');
INSERT INTO public.competencies VALUES (646, 68, 'Performance Management', 'I am responsible for managing underperformance for my team', 'People', '2026-04-17 10:29:51.515277');
INSERT INTO public.competencies VALUES (649, 68, 'Communication', 'I accurately communicate and translate divisional strategy', 'Organisational', '2026-04-17 10:29:51.523454');
INSERT INTO public.competencies VALUES (650, 68, 'Change Mangement', 'I navigate change successfully', 'Organisational', '2026-04-17 10:29:51.526229');
INSERT INTO public.competencies VALUES (651, 68, 'Goal setting', 'I set clear goals and objectives', 'Organisational', '2026-04-17 10:29:51.52844');
INSERT INTO public.competencies VALUES (661, 67, 'Activity', 'I consistently hit my minimum activity on Cube', 'Core Sales Skills', '2026-04-17 10:29:51.555892');
INSERT INTO public.competencies VALUES (663, 67, 'Data Quality', 'I consistently log everything on Bullhorn accurately', 'Core Sales Skills', '2026-04-17 10:29:51.560915');
INSERT INTO public.competencies VALUES (664, 67, 'Data awareness', 'I understand the data behind my desk that leads me to success', 'Core Sales Skills', '2026-04-17 10:29:51.563959');
INSERT INTO public.competencies VALUES (665, 67, 'Leads', 'I find leads independently and follow up on them', 'Core Sales Skills', '2026-04-17 10:29:51.566272');
INSERT INTO public.competencies VALUES (666, 67, 'Commercial Awareness', 'I am aware of my target and the activity required to achieve it', 'Core Sales Skills', '2026-04-17 10:29:51.569117');
INSERT INTO public.competencies VALUES (668, 67, 'Sourcing', 'I understand the process of sourcing a candidate and follow this', 'Core Sales Skills', '2026-04-17 10:29:51.57418');
INSERT INTO public.competencies VALUES (669, 67, 'Advert Writing', 'I write effective, compelling, well written job adverts and post all jobs on our website', 'Core Sales Skills', '2026-04-17 10:29:51.577241');
INSERT INTO public.competencies VALUES (670, 67, 'Engagement', 'I identify, engage, and get responses from candidates', 'Core Sales Skills', '2026-04-17 10:29:51.580078');
INSERT INTO public.competencies VALUES (1112, 45, 'Activity', 'I consistently hit over my minimum activity on Cube', 'Desk Management', '2026-04-17 10:30:29.684163');
INSERT INTO public.competencies VALUES (1121, 45, 'Engagement', 'I identify, engage, and get responses from candidates', 'Candidate Attraction', '2026-04-17 10:30:29.709059');
INSERT INTO public.competencies VALUES (1135, 45, 'Development of others', 'I participate in the development of new starters', 'Development', '2026-04-17 10:30:29.744443');
INSERT INTO public.competencies VALUES (1136, 45, 'Values alignment', 'I am aligned with and demonstrate values', 'Culture', '2026-04-17 10:30:29.74656');
INSERT INTO public.competencies VALUES (1137, 45, 'Continuous improvement', 'I play a leading role in improving the culture of HPS', 'Culture', '2026-04-17 10:30:29.749135');
INSERT INTO public.competencies VALUES (693, 67, 'Scale', 'I have the foresight to scale and develop my team', 'Growth', '2026-04-17 10:29:51.641095');
INSERT INTO public.competencies VALUES (674, 67, 'Communication', 'I communicate well by listening effectively and building rapport', 'Core Sales Skills', '2026-04-17 10:29:51.590761');
INSERT INTO public.competencies VALUES (715, 41, 'Recruitment Consultant 180 (Delivery)', 'Most of the time', 'Core Competencies', '2026-04-17 10:29:51.700908');
INSERT INTO public.competencies VALUES (702, 67, 'Behavioural', 'I drive the right behaviours within my team', 'Culture', '2026-04-17 10:29:51.666312');
INSERT INTO public.competencies VALUES (672, 67, 'Qualify', 'I qualify candidates successfully', 'Core Sales Skills', '2026-04-17 10:29:51.585523');
INSERT INTO public.competencies VALUES (706, 67, 'Situational Leadership', 'I use the development journey to understand where the biggest impact can be had', 'People', '2026-04-17 10:29:51.677075');
INSERT INTO public.competencies VALUES (681, 67, 'Qualifying clients', 'I identify what a good client looks like and who I should be targeting', 'Core Sales Skills', '2026-04-17 10:29:51.609533');
INSERT INTO public.competencies VALUES (675, 67, 'Marketing', 'I effectively market candidates to clients', 'Core Sales Skills', '2026-04-17 10:29:51.593172');
INSERT INTO public.competencies VALUES (673, 67, 'Network building', 'I build a hotlist of suitable candidates within my niches in Bullhorn', 'Core Sales Skills', '2026-04-17 10:29:51.587773');
INSERT INTO public.competencies VALUES (676, 67, 'Placement', 'I support the candidate through the offer stage effectively', 'Core Sales Skills', '2026-04-17 10:29:51.595957');
INSERT INTO public.competencies VALUES (677, 67, 'Relationship', 'I consistently build trusted, long-lasting relationships', 'Core Sales Skills', '2026-04-17 10:29:51.598356');
INSERT INTO public.competencies VALUES (678, 67, 'Quality check', 'I consistently ensure the quality of candidates', 'Core Sales Skills', '2026-04-17 10:29:51.601262');
INSERT INTO public.competencies VALUES (679, 67, 'Building a client database', 'I research effectively to build client distribution lists', 'Core Sales Skills', '2026-04-17 10:29:51.603639');
INSERT INTO public.competencies VALUES (680, 67, 'Niche Specialist', 'I talk confidently about my market', 'Core Sales Skills', '2026-04-17 10:29:51.606607');
INSERT INTO public.competencies VALUES (682, 67, 'Sales calls', 'I successfully conduct sales calls and build relationships', 'Core Sales Skills', '2026-04-17 10:29:51.612303');
INSERT INTO public.competencies VALUES (683, 67, 'Client meetings', 'I confidently book and attend client meetings', 'Core Sales Skills', '2026-04-17 10:29:51.615233');
INSERT INTO public.competencies VALUES (684, 67, 'Negotiation', 'I negotiate contracts and appropriate commercial terms', 'Core Sales Skills', '2026-04-17 10:29:51.618481');
INSERT INTO public.competencies VALUES (685, 67, 'Client Strategy', 'I consistently ensure all business activity is commercially focused and give strategic guidance', 'Core Sales Skills', '2026-04-17 10:29:51.620906');
INSERT INTO public.competencies VALUES (686, 67, 'Client Penetration', 'I have more than one contact in the companies I work with', 'Core Sales Skills', '2026-04-17 10:29:51.623801');
INSERT INTO public.competencies VALUES (687, 67, 'Vacancy Qualification', 'I qualify and rank every vacancy using the qualification form', 'Core Sales Skills', '2026-04-17 10:29:51.626073');
INSERT INTO public.competencies VALUES (688, 67, 'Managing your Client', 'I am able to manage clients', 'Core Sales Skills', '2026-04-17 10:29:51.62871');
INSERT INTO public.competencies VALUES (689, 67, 'Business needs', 'I am able to identify business needs to drive growth', 'Growth', '2026-04-17 10:29:51.630944');
INSERT INTO public.competencies VALUES (690, 67, 'Data analysis', 'I am able to create and understand impactful data', 'Growth', '2026-04-17 10:29:51.633793');
INSERT INTO public.competencies VALUES (691, 67, 'Initiatives', 'I promote initiatives and incentives that drive growth', 'Growth', '2026-04-17 10:29:51.636105');
INSERT INTO public.competencies VALUES (692, 67, 'Mindset', 'I consistently act and behave with a growth mindset', 'Growth', '2026-04-17 10:29:51.638826');
INSERT INTO public.competencies VALUES (694, 67, 'Personal development', 'I own my own development', 'Development', '2026-04-17 10:29:51.644085');
INSERT INTO public.competencies VALUES (695, 67, 'Development of others', 'I own the development of the team and am responsible for retention', 'Development', '2026-04-17 10:29:51.6472');
INSERT INTO public.competencies VALUES (696, 67, 'Adaptability', 'I identify market and business changes and alter team direction accordingly', 'Development', '2026-04-17 10:29:51.649977');
INSERT INTO public.competencies VALUES (697, 67, 'Data awareness', 'I use data to measure the performance of my team', 'Development', '2026-04-17 10:29:51.652748');
INSERT INTO public.competencies VALUES (698, 67, 'Business needs', 'I support the development of the business', 'Development', '2026-04-17 10:29:51.655652');
INSERT INTO public.competencies VALUES (699, 67, 'Values alignment', 'I am aligned with and demonstrate the values', 'Culture', '2026-04-17 10:29:51.658135');
INSERT INTO public.competencies VALUES (700, 67, 'Continuous improvement', 'I play a leading role in improving the culture of my area of responsibility', 'Culture', '2026-04-17 10:29:51.660872');
INSERT INTO public.competencies VALUES (701, 67, 'Contribution', 'I contribute to relevant meetings and events where appropriate', 'Culture', '2026-04-17 10:29:51.663428');
INSERT INTO public.competencies VALUES (703, 67, 'Motivate', 'I am able to motivate my team to success', 'People', '2026-04-17 10:29:51.669245');
INSERT INTO public.competencies VALUES (704, 67, 'Inspire', 'I am able to inspire and motivate my team members', 'People', '2026-04-17 10:29:51.671956');
INSERT INTO public.competencies VALUES (705, 67, 'Wellbeing', 'I look after the well-being of my team members', 'People', '2026-04-17 10:29:51.674276');
INSERT INTO public.competencies VALUES (707, 67, 'Expectations', 'I set clear expectations', 'People', '2026-04-17 10:29:51.679233');
INSERT INTO public.competencies VALUES (708, 67, 'Hiring talent', 'I own the hiring plan for my area of the business', 'People', '2026-04-17 10:29:51.682965');
INSERT INTO public.competencies VALUES (709, 67, 'Performance Management', 'I am responsible for managing underperformance for my team', 'People', '2026-04-17 10:29:51.685387');
INSERT INTO public.competencies VALUES (712, 67, 'Communication', 'I accurately communicate and translate divisional strategy', 'Organisational', '2026-04-17 10:29:51.693221');
INSERT INTO public.competencies VALUES (713, 67, 'Change Mangement', 'I navigate change successfully', 'Organisational', '2026-04-17 10:29:51.695905');
INSERT INTO public.competencies VALUES (714, 67, 'Goal setting', 'I set clear goals and objectives', 'Organisational', '2026-04-17 10:29:51.698103');
INSERT INTO public.competencies VALUES (722, 41, 'Activity', 'I consistently hit my minimum activity on Cube', 'Desk Management', '2026-04-17 10:29:51.718873');
INSERT INTO public.competencies VALUES (723, 41, 'Time management', 'I successfully manage my workload through the week', 'Desk Management', '2026-04-17 10:29:51.721183');
INSERT INTO public.competencies VALUES (724, 41, 'Data quality', 'I consistently log everything on Bullhorn accurately', 'Desk Management', '2026-04-17 10:29:51.724203');
INSERT INTO public.competencies VALUES (725, 41, 'Data awareness', 'I understand the data behind my desk that leads me to success', 'Desk Management', '2026-04-17 10:29:51.727176');
INSERT INTO public.competencies VALUES (1124, 45, 'Network building', 'I build a hotlist of suitable candidates within my niches in Bullhorn', 'Candidate Management', '2026-04-17 10:30:29.716245');
INSERT INTO public.competencies VALUES (1131, 45, 'Data', 'I understand impactful data', 'Growth', '2026-04-17 10:30:29.734855');
INSERT INTO public.competencies VALUES (1138, 45, 'Performance', 'I am commercially aware of my own and the business''s trending performance', 'Business', '2026-04-17 10:30:29.751325');
INSERT INTO public.competencies VALUES (1139, 45, 'Innovation', 'I play a part in identifying opportunities and threats to the HPS business', 'Business', '2026-04-17 10:30:29.754256');
INSERT INTO public.competencies VALUES (1140, 45, 'Wider business strategy', 'I actively contribute to the business strategy', 'Business', '2026-04-17 10:30:29.756977');
INSERT INTO public.competencies VALUES (1151, 46, 'Time management', 'I consistently manage my workload through the week', 'Desk Management', '2026-04-17 10:30:29.785887');
INSERT INTO public.competencies VALUES (1162, 46, 'Network building', 'I build a hotlist of suitable candidates within my niches in Bullhorn', 'Candidate Management', '2026-04-17 10:30:29.813445');
INSERT INTO public.competencies VALUES (1169, 46, 'Data', 'I understand impactful data', 'Growth', '2026-04-17 10:30:29.829695');
INSERT INTO public.competencies VALUES (739, 42, 'Recruitment Consultant 180 (Delivery)', 'Most of the time', 'Core Competencies', '2026-04-17 10:29:51.766499');
INSERT INTO public.competencies VALUES (763, 47, 'Sector Lead 180 (Delivery)', 'Most of the time', 'Core Competencies', '2026-04-17 10:29:51.826195');
INSERT INTO public.competencies VALUES (727, 41, 'Active and passive candidates', 'I use passive candidate attraction methods as well as active methods', 'Candidate Attraction', '2026-04-17 10:29:51.732127');
INSERT INTO public.competencies VALUES (778, 47, 'Active and Passive Candidates', 'I use passive candidate attraction methods as well as active methods', 'Candidate Attraction', '2026-04-17 10:29:51.863567');
INSERT INTO public.competencies VALUES (773, 47, 'Time management', 'I successfully manage my workload through the week', 'Desk Management', '2026-04-17 10:29:51.851232');
INSERT INTO public.competencies VALUES (728, 41, 'Sourcing', 'I understand the process of sourcing a candidate and follow it', 'Candidate Attraction', '2026-04-17 10:29:51.734752');
INSERT INTO public.competencies VALUES (729, 41, 'Advert writing', 'I write effective, compelling, well-written job adverts and post all jobs on our website', 'Candidate Attraction', '2026-04-17 10:29:51.737276');
INSERT INTO public.competencies VALUES (730, 41, 'Engagement', 'I identify, engage, and get responses from candidates', 'Candidate Attraction', '2026-04-17 10:29:51.74379');
INSERT INTO public.competencies VALUES (731, 41, 'Referrals', 'I ask for and receive quality referrals from my network', 'Candidate Attraction', '2026-04-17 10:29:51.746523');
INSERT INTO public.competencies VALUES (732, 41, 'Qualify', 'I qualify candidates successfully', 'Candidate Management', '2026-04-17 10:29:51.74885');
INSERT INTO public.competencies VALUES (733, 41, 'Network building', 'I build a hotlist of suitable candidates within my niches in Bullhorn', 'Candidate Management', '2026-04-17 10:29:51.751417');
INSERT INTO public.competencies VALUES (734, 41, 'Communication', 'I communicate well by listening effectively and building rapport', 'Candidate Management', '2026-04-17 10:29:51.7537');
INSERT INTO public.competencies VALUES (735, 41, 'Marketing', 'I effectively and successfully market candidates to clients', 'Candidate Management', '2026-04-17 10:29:51.756023');
INSERT INTO public.competencies VALUES (736, 41, 'Placement', 'I support candidates through the offer stage effectively', 'Candidate Management', '2026-04-17 10:29:51.758702');
INSERT INTO public.competencies VALUES (737, 41, 'Relationship', 'I build trusted, long-lasting relationships', 'Candidate Management', '2026-04-17 10:29:51.761304');
INSERT INTO public.competencies VALUES (738, 41, 'Quality check', 'I ensure the quality of candidates', 'Candidate Management', '2026-04-17 10:29:51.763982');
INSERT INTO public.competencies VALUES (746, 42, 'Activity', 'I consistently hit my minimum activity on Cube', 'Desk Management', '2026-04-17 10:29:51.784775');
INSERT INTO public.competencies VALUES (747, 42, 'Time management', 'I successfully manage my workload through the week', 'Desk Management', '2026-04-17 10:29:51.787222');
INSERT INTO public.competencies VALUES (748, 42, 'Data quality', 'I consistently log everything on Bullhorn accurately', 'Desk Management', '2026-04-17 10:29:51.78976');
INSERT INTO public.competencies VALUES (749, 42, 'Data awareness', 'I understand the data behind my desk that leads me to success', 'Desk Management', '2026-04-17 10:29:51.792133');
INSERT INTO public.competencies VALUES (750, 42, 'Leads', 'I find leads independently and follow up on them', 'Desk Management', '2026-04-17 10:29:51.794733');
INSERT INTO public.competencies VALUES (751, 42, 'Active and passive candidates', 'I use passive candidate attraction methods as well as active methods', 'Candidate Attraction', '2026-04-17 10:29:51.797015');
INSERT INTO public.competencies VALUES (752, 42, 'Sourcing', 'I understand the process of sourcing a candidate and follow it', 'Candidate Attraction', '2026-04-17 10:29:51.799305');
INSERT INTO public.competencies VALUES (753, 42, 'Advert writing', 'I write effective, compelling, well-written job adverts and post all jobs on our website', 'Candidate Attraction', '2026-04-17 10:29:51.80162');
INSERT INTO public.competencies VALUES (754, 42, 'Engagement', 'I identify, engage, and get responses from candidates', 'Candidate Attraction', '2026-04-17 10:29:51.803943');
INSERT INTO public.competencies VALUES (755, 42, 'Referrals', 'I ask for and receive quality referrals from my network', 'Candidate Attraction', '2026-04-17 10:29:51.806248');
INSERT INTO public.competencies VALUES (756, 42, 'Qualify', 'I qualify candidates successfully', 'Candidate Management', '2026-04-17 10:29:51.808907');
INSERT INTO public.competencies VALUES (757, 42, 'Network building', 'I build a hotlist of suitable candidates within my niches in Bullhorn', 'Candidate Management', '2026-04-17 10:29:51.811159');
INSERT INTO public.competencies VALUES (758, 42, 'Communication', 'I communicate well by listening effectively and building rapport', 'Candidate Management', '2026-04-17 10:29:51.813511');
INSERT INTO public.competencies VALUES (759, 42, 'Marketing', 'I effectively and successfully market candidates to clients', 'Candidate Management', '2026-04-17 10:29:51.815741');
INSERT INTO public.competencies VALUES (760, 42, 'Placement', 'I support candidates through the offer stage effectively', 'Candidate Management', '2026-04-17 10:29:51.817964');
INSERT INTO public.competencies VALUES (761, 42, 'Relationship', 'I build trusted, long-lasting relationships', 'Candidate Management', '2026-04-17 10:29:51.820188');
INSERT INTO public.competencies VALUES (762, 42, 'Quality check', 'I ensure the quality of candidates', 'Candidate Management', '2026-04-17 10:29:51.822906');
INSERT INTO public.competencies VALUES (772, 47, 'Activity', 'I consistently hit my minimum activity on Cube', 'Desk Management', '2026-04-17 10:29:51.848965');
INSERT INTO public.competencies VALUES (774, 47, 'Data Quality', 'I consistently log everything on Bullhorn accurately', 'Desk Management', '2026-04-17 10:29:51.853545');
INSERT INTO public.competencies VALUES (775, 47, 'Data awareness', 'I understand the data behind my desk that leads me to success', 'Desk Management', '2026-04-17 10:29:51.856164');
INSERT INTO public.competencies VALUES (776, 47, 'Leads', 'I find leads independently and follow up on them', 'Desk Management', '2026-04-17 10:29:51.85855');
INSERT INTO public.competencies VALUES (777, 47, 'Commercial Awareness', 'I am aware of my target and the activity required to achieve it', 'Desk Management', '2026-04-17 10:29:51.860801');
INSERT INTO public.competencies VALUES (1152, 46, 'Data Quality', 'I consistently log everything on Bullhorn accurately', 'Desk Management', '2026-04-17 10:30:29.788565');
INSERT INTO public.competencies VALUES (1153, 46, 'Data awareness', 'I understand the data behind my desk that leads me to success', 'Desk Management', '2026-04-17 10:30:29.791628');
INSERT INTO public.competencies VALUES (1154, 46, 'Leads', 'I find leads independently and consistently follow up on them', 'Desk Management', '2026-04-17 10:30:29.793762');
INSERT INTO public.competencies VALUES (1156, 46, 'Active and Passive Candidates', 'I use passive candidate attraction methods as well as active methods', 'Candidate Attraction', '2026-04-17 10:30:29.798275');
INSERT INTO public.competencies VALUES (1157, 46, 'Sourcing', 'I understand the process of sourcing a candidate and follow it', 'Candidate Attraction', '2026-04-17 10:30:29.801042');
INSERT INTO public.competencies VALUES (1158, 46, 'Advert Writing', 'I write an effective, compelling, well-written job advert and post all jobs on our website', 'Candidate Attraction', '2026-04-17 10:30:29.803865');
INSERT INTO public.competencies VALUES (1161, 46, 'Qualify', 'I qualify candidates successfully', 'Candidate Management', '2026-04-17 10:30:29.811488');
INSERT INTO public.competencies VALUES (1164, 46, 'Marketing', 'I effectively and successfully market candidates to clients', 'Candidate Management', '2026-04-17 10:30:29.817624');
INSERT INTO public.competencies VALUES (1165, 46, 'Placement', 'I effectively support the candidate through the offer stage', 'Candidate Management', '2026-04-17 10:30:29.820565');
INSERT INTO public.competencies VALUES (1166, 46, 'Relationship', 'I build trusted, long-lasting relationships', 'Candidate Management', '2026-04-17 10:30:29.822809');
INSERT INTO public.competencies VALUES (1167, 46, 'Quality check', 'I ensure the quality of candidates', 'Candidate Management', '2026-04-17 10:30:29.824937');
INSERT INTO public.competencies VALUES (1168, 46, 'Retaining talent', 'I play a role in ensuring we meet the HPS retention goal', 'Growth', '2026-04-17 10:30:29.827105');
INSERT INTO public.competencies VALUES (1170, 46, 'Initiatives', 'I promote initiatives and incentives that drive growth', 'Growth', '2026-04-17 10:30:29.831962');
INSERT INTO public.competencies VALUES (1171, 46, 'Mindset', 'I consistently act and behave with a growth mindset', 'Growth', '2026-04-17 10:30:29.835044');
INSERT INTO public.competencies VALUES (801, 48, 'Sector Lead 180 (Delivery)', 'Most of the time', 'Core Competencies', '2026-04-17 10:29:51.92285');
INSERT INTO public.competencies VALUES (792, 47, 'Initiatives', 'I promote initiatives and incentives that drive growth', 'Growth', '2026-04-17 10:29:51.898074');
INSERT INTO public.competencies VALUES (830, 48, 'Initiatives', 'I promote initiatives and incentives that drive growth', 'Growth', '2026-04-17 10:29:51.996771');
INSERT INTO public.competencies VALUES (785, 47, 'Communication', 'I communicate well by listening effectively and building rapport', 'Candidate Management', '2026-04-17 10:29:51.880782');
INSERT INTO public.competencies VALUES (823, 48, 'Communication', 'I communicate well by listening effectively and building rapport', 'Candidate Management', '2026-04-17 10:29:51.980171');
INSERT INTO public.competencies VALUES (782, 47, 'Referrals', 'I ask for and receive quality referrals from my network', 'Candidate Attraction', '2026-04-17 10:29:51.873567');
INSERT INTO public.competencies VALUES (820, 48, 'Referrals', 'I ask for and receive quality referrals from my network', 'Candidate Attraction', '2026-04-17 10:29:51.971654');
INSERT INTO public.competencies VALUES (783, 47, 'Qualify', 'I qualify candidates successfully', 'Candidate Management', '2026-04-17 10:29:51.875982');
INSERT INTO public.competencies VALUES (821, 48, 'Qualify', 'I qualify candidates successfully', 'Candidate Management', '2026-04-17 10:29:51.974763');
INSERT INTO public.competencies VALUES (816, 48, 'Active and Passive Candidates', 'I use passive candidate attraction methods as well as active methods', 'Candidate Attraction', '2026-04-17 10:29:51.960717');
INSERT INTO public.competencies VALUES (811, 48, 'Time management', 'I successfully manage my workload through the week', 'Desk Management', '2026-04-17 10:29:51.947591');
INSERT INTO public.competencies VALUES (786, 47, 'Marketing', 'I effectively market candidates to clients successfully', 'Candidate Management', '2026-04-17 10:29:51.883109');
INSERT INTO public.competencies VALUES (824, 48, 'Marketing', 'I effectively market candidates to clients successfully', 'Candidate Management', '2026-04-17 10:29:51.982872');
INSERT INTO public.competencies VALUES (781, 47, 'Engagement', 'I identify, engage, and get responses from candidates', 'Candidate Attraction', '2026-04-17 10:29:51.871114');
INSERT INTO public.competencies VALUES (784, 47, 'Network building', 'I build a hotlist of suitable candidates within my niches in Bullhorn', 'Candidate Management', '2026-04-17 10:29:51.878426');
INSERT INTO public.competencies VALUES (787, 47, 'Placement', 'I support candidates through the offer stage effectively', 'Candidate Management', '2026-04-17 10:29:51.886007');
INSERT INTO public.competencies VALUES (788, 47, 'Relationship', 'I build trusted long-lasting relationships', 'Candidate Management', '2026-04-17 10:29:51.888817');
INSERT INTO public.competencies VALUES (789, 47, 'Quality check', 'I ensure the quality of candidates', 'Candidate Management', '2026-04-17 10:29:51.891139');
INSERT INTO public.competencies VALUES (790, 47, 'Retaining talent', 'I play a role in ensuring we meet the HPS retention goal', 'Growth', '2026-04-17 10:29:51.893293');
INSERT INTO public.competencies VALUES (791, 47, 'Data', 'I understand impactful data', 'Growth', '2026-04-17 10:29:51.895585');
INSERT INTO public.competencies VALUES (793, 47, 'Mindset', 'I consistently act and behave with a growth mindset', 'Growth', '2026-04-17 10:29:51.900572');
INSERT INTO public.competencies VALUES (794, 47, 'Personal development', 'I own my own development', 'Development', '2026-04-17 10:29:51.903636');
INSERT INTO public.competencies VALUES (795, 47, 'Development of others', 'I participate in the development of new starters', 'Development', '2026-04-17 10:29:51.906271');
INSERT INTO public.competencies VALUES (796, 47, 'Values alignment', 'I am aligned with and demonstrate our values', 'Culture', '2026-04-17 10:29:51.908986');
INSERT INTO public.competencies VALUES (797, 47, 'Continuous improvement', 'I play a leading role in improving the culture of HPS', 'Culture', '2026-04-17 10:29:51.912009');
INSERT INTO public.competencies VALUES (798, 47, 'Performance', 'I am commercially aware of my own and the business''s trending performance', 'Business', '2026-04-17 10:29:51.914489');
INSERT INTO public.competencies VALUES (799, 47, 'Innovation', 'I play a part in identifying opportunities and threats to the HPS business', 'Business', '2026-04-17 10:29:51.916828');
INSERT INTO public.competencies VALUES (800, 47, 'Wider business strategy', 'I actively contribute to the business strategy', 'Business', '2026-04-17 10:29:51.919986');
INSERT INTO public.competencies VALUES (810, 48, 'Activity', 'I consistently hit my minimum activity on Cube', 'Desk Management', '2026-04-17 10:29:51.945203');
INSERT INTO public.competencies VALUES (812, 48, 'Data Quality', 'I consistently log everything on Bullhorn accurately', 'Desk Management', '2026-04-17 10:29:51.950138');
INSERT INTO public.competencies VALUES (813, 48, 'Data awareness', 'I understand the data behind my desk that leads me to success', 'Desk Management', '2026-04-17 10:29:51.95258');
INSERT INTO public.competencies VALUES (814, 48, 'Leads', 'I find leads independently and follow up on them', 'Desk Management', '2026-04-17 10:29:51.955201');
INSERT INTO public.competencies VALUES (815, 48, 'Commercial Awareness', 'I am aware of my target and the activity required to achieve it', 'Desk Management', '2026-04-17 10:29:51.958176');
INSERT INTO public.competencies VALUES (817, 48, 'Sourcing', 'I understand the process of sourcing a candidate and follow it', 'Candidate Attraction', '2026-04-17 10:29:51.964266');
INSERT INTO public.competencies VALUES (818, 48, 'Advert Writing', 'I write effective, compelling, well written job adverts and post all jobs on our website', 'Candidate Attraction', '2026-04-17 10:29:51.966624');
INSERT INTO public.competencies VALUES (819, 48, 'Engagement', 'I identify, engage, and get responses from candidates', 'Candidate Attraction', '2026-04-17 10:29:51.969522');
INSERT INTO public.competencies VALUES (822, 48, 'Network building', 'I build a hotlist of suitable candidates within my niches in Bullhorn', 'Candidate Management', '2026-04-17 10:29:51.977097');
INSERT INTO public.competencies VALUES (825, 48, 'Placement', 'I support candidates through the offer stage effectively', 'Candidate Management', '2026-04-17 10:29:51.985454');
INSERT INTO public.competencies VALUES (826, 48, 'Relationship', 'I build trusted long-lasting relationships', 'Candidate Management', '2026-04-17 10:29:51.987628');
INSERT INTO public.competencies VALUES (827, 48, 'Quality check', 'I ensure the quality of candidates', 'Candidate Management', '2026-04-17 10:29:51.989868');
INSERT INTO public.competencies VALUES (828, 48, 'Retaining talent', 'I play a role in ensuring we meet the HPS retention goal', 'Growth', '2026-04-17 10:29:51.992131');
INSERT INTO public.competencies VALUES (829, 48, 'Data', 'I understand impactful data', 'Growth', '2026-04-17 10:29:51.994709');
INSERT INTO public.competencies VALUES (831, 48, 'Mindset', 'I consistently act and behave with a growth mindset.', 'Growth', '2026-04-17 10:29:51.999465');
INSERT INTO public.competencies VALUES (832, 48, 'Personal development', 'I own my own development.', 'Development', '2026-04-17 10:29:52.001757');
INSERT INTO public.competencies VALUES (833, 48, 'Development of others', 'I participate in the development of new starters.', 'Development', '2026-04-17 10:29:52.004129');
INSERT INTO public.competencies VALUES (834, 48, 'Values alignment', 'I am aligned with and demonstrate values.', 'Culture', '2026-04-17 10:29:52.006902');
INSERT INTO public.competencies VALUES (835, 48, 'Continuous improvement', 'I play a leading role in improving the culture of HPS.', 'Culture', '2026-04-17 10:29:52.009293');
INSERT INTO public.competencies VALUES (1159, 46, 'Engagement', 'I identify, engage, and get responses from candidates', 'Candidate Attraction', '2026-04-17 10:30:29.805898');
INSERT INTO public.competencies VALUES (1172, 46, 'Personal development', 'I own my own development', 'Development', '2026-04-17 10:30:29.837147');
INSERT INTO public.competencies VALUES (1173, 46, 'Development of others', 'I participate in the development of new starters', 'Development', '2026-04-17 10:30:29.83967');
INSERT INTO public.competencies VALUES (1174, 46, 'Values alignment', 'I am aligned with and demonstrate values', 'Culture', '2026-04-17 10:30:29.842158');
INSERT INTO public.competencies VALUES (1175, 46, 'Continuous improvement', 'I play a leading role in improving the culture of HPS', 'Culture', '2026-04-17 10:30:29.844721');
INSERT INTO public.competencies VALUES (1176, 46, 'Performance', 'I am commercially aware of my own and the business''s trending performance', 'Business', '2026-04-17 10:30:29.846736');
INSERT INTO public.competencies VALUES (1177, 46, 'Innovation', 'I play a part in identifying opportunities and threats to HPS business', 'Business', '2026-04-17 10:30:29.84942');
INSERT INTO public.competencies VALUES (1178, 46, 'Wider business strategy', 'I actively contribute to the business strategy', 'Business', '2026-04-17 10:30:29.85211');
INSERT INTO public.competencies VALUES (839, 49, 'Team Leader 360', 'Most of the time', 'Core Competencies', '2026-04-17 10:29:52.020153');
INSERT INTO public.competencies VALUES (895, 50, 'Activity', 'I consistently hit my minimum activity on Cube.', 'Desk Management', '2026-04-17 10:29:52.16075');
INSERT INTO public.competencies VALUES (870, 49, 'Development of others', 'I own the development of the team and am responsible for retention.', 'Development', '2026-04-17 10:29:52.097618');
INSERT INTO public.competencies VALUES (863, 49, 'Relationship', 'I can build trusted, long-lasting relationships.', 'Candidate Management', '2026-04-17 10:29:52.080881');
INSERT INTO public.competencies VALUES (876, 49, 'Behavioural', 'I drive the right behaviours within my team.', 'Culture', '2026-04-17 10:29:52.113153');
INSERT INTO public.competencies VALUES (886, 50, 'Team Leader 360', 'Most of the time', 'Core Competencies', '2026-04-17 10:29:52.137763');
INSERT INTO public.competencies VALUES (836, 48, 'Performance', 'I am commercially aware of my own and the business''s trending performance.', 'Business', '2026-04-17 10:29:52.011712');
INSERT INTO public.competencies VALUES (837, 48, 'Innovation', 'I play a part in identifying opportunities and threats to HPS business.', 'Business', '2026-04-17 10:29:52.014403');
INSERT INTO public.competencies VALUES (838, 48, 'Wider business strategy', 'I actively contribute to the business strategy.', 'Business', '2026-04-17 10:29:52.016682');
INSERT INTO public.competencies VALUES (843, 49, 'Reliability', 'I provide a consistently good recruitment process.', 'Core Competencies', '2026-04-17 10:29:52.031085');
INSERT INTO public.competencies VALUES (848, 49, 'Activity', 'I am consistently hitting my minimum activity on Cube.', 'Desk Management', '2026-04-17 10:29:52.043565');
INSERT INTO public.competencies VALUES (851, 49, 'Data awareness', 'I understand the data behind my desk that leads me to success.', 'Desk Management', '2026-04-17 10:29:52.051146');
INSERT INTO public.competencies VALUES (857, 49, 'Referrals', 'I ask and receive quality referrals from my network.', 'Candidate Attraction', '2026-04-17 10:29:52.065569');
INSERT INTO public.competencies VALUES (864, 49, 'Quality check', 'I ensure the quality of candidates.', 'Candidate Management', '2026-04-17 10:29:52.083178');
INSERT INTO public.competencies VALUES (1122, 45, 'Referrals', 'I ask for and receive quality referrals from my network', 'Candidate Attraction', '2026-04-17 10:30:29.711827');
INSERT INTO public.competencies VALUES (849, 49, 'Time management', 'I successfully manage my workload through the week.', 'Desk Management', '2026-04-17 10:29:52.046221');
INSERT INTO public.competencies VALUES (865, 49, 'Business needs', 'I identify business needs to drive growth.', 'Growth', '2026-04-17 10:29:52.085552');
INSERT INTO public.competencies VALUES (852, 49, 'Leads', 'I find leads independently and follow up on them.', 'Desk Management', '2026-04-17 10:29:52.05335');
INSERT INTO public.competencies VALUES (1163, 46, 'Communication', 'I communicate well by listening effectively and building rapport', 'Candidate Management', '2026-04-17 10:30:29.815471');
INSERT INTO public.competencies VALUES (850, 49, 'Data Quality', 'I consistently log everything on Bullhorn accurately.', 'Desk Management', '2026-04-17 10:29:52.048744');
INSERT INTO public.competencies VALUES (853, 49, 'Active and Passive Candidates', 'I use passive candidate attraction methods as well as active methods.', 'Candidate Attraction', '2026-04-17 10:29:52.055768');
INSERT INTO public.competencies VALUES (854, 49, 'Sourcing', 'I understand the process of sourcing a candidate and follow it.', 'Candidate Attraction', '2026-04-17 10:29:52.058839');
INSERT INTO public.competencies VALUES (855, 49, 'Advert Writing', 'I can write an effective, compelling, well-written job advert and post all jobs on our website.', 'Candidate Attraction', '2026-04-17 10:29:52.06093');
INSERT INTO public.competencies VALUES (856, 49, 'Engagement', 'I identify, engage, and get responses from candidates.', 'Candidate Attraction', '2026-04-17 10:29:52.063071');
INSERT INTO public.competencies VALUES (858, 49, 'Qualify', 'I qualify candidates successfully.', 'Candidate Management', '2026-04-17 10:29:52.06764');
INSERT INTO public.competencies VALUES (859, 49, 'Network building', 'I build a hotlist of suitable candidates within my niches in Bullhorn.', 'Candidate Management', '2026-04-17 10:29:52.070225');
INSERT INTO public.competencies VALUES (860, 49, 'Communication', 'I communicate well by listening effectively and building rapport.', 'Candidate Management', '2026-04-17 10:29:52.073071');
INSERT INTO public.competencies VALUES (861, 49, 'Marketing', 'I can effectively market candidates to clients successfully.', 'Candidate Management', '2026-04-17 10:29:52.075704');
INSERT INTO public.competencies VALUES (862, 49, 'Placement', 'I can support the candidate through the offer stage effectively.', 'Candidate Management', '2026-04-17 10:29:52.078106');
INSERT INTO public.competencies VALUES (866, 49, 'Data analysis', 'I create and understand impactful data.', 'Growth', '2026-04-17 10:29:52.087781');
INSERT INTO public.competencies VALUES (867, 49, 'Initiatives', 'I promote initiatives and incentives that drive growth.', 'Growth', '2026-04-17 10:29:52.089958');
INSERT INTO public.competencies VALUES (868, 49, 'Mindset', 'I consistently act and behave with a growth mindset.', 'Growth', '2026-04-17 10:29:52.092365');
INSERT INTO public.competencies VALUES (869, 49, 'Personal development', 'I own my own development.', 'Development', '2026-04-17 10:29:52.095031');
INSERT INTO public.competencies VALUES (871, 49, 'Adaptability', 'I identify market and business changes and alter team direction accordingly.', 'Development', '2026-04-17 10:29:52.100249');
INSERT INTO public.competencies VALUES (872, 49, 'Data awareness', 'I use data to measure the performance of my team.', 'Development', '2026-04-17 10:29:52.102966');
INSERT INTO public.competencies VALUES (873, 49, 'Values alignment', 'I am aligned with and demonstrate values.', 'Culture', '2026-04-17 10:29:52.10536');
INSERT INTO public.competencies VALUES (874, 49, 'Continuous improvement', 'I play a leading role in improving the culture of HPS.', 'Culture', '2026-04-17 10:29:52.107662');
INSERT INTO public.competencies VALUES (875, 49, 'Contribution', 'I contribute to relevant meetings and events where appropriate.', 'Culture', '2026-04-17 10:29:52.110553');
INSERT INTO public.competencies VALUES (877, 49, 'Motivate', 'I motivate my team to success.', 'People', '2026-04-17 10:29:52.115616');
INSERT INTO public.competencies VALUES (878, 49, 'Inspire', 'I inspire and motivate my team members.', 'People', '2026-04-17 10:29:52.118263');
INSERT INTO public.competencies VALUES (879, 49, 'Wellbeing', 'I look after the well-being of my team members.', 'People', '2026-04-17 10:29:52.120786');
INSERT INTO public.competencies VALUES (880, 49, 'Situational Leadership', 'I use the development journey to understand where the biggest impact can be had.', 'People', '2026-04-17 10:29:52.122992');
INSERT INTO public.competencies VALUES (881, 49, 'Expectations', 'I set clear expectations.', 'People', '2026-04-17 10:29:52.125621');
INSERT INTO public.competencies VALUES (882, 49, 'Hiring talent', 'I own the hiring for my team.', 'People', '2026-04-17 10:29:52.127934');
INSERT INTO public.competencies VALUES (883, 49, 'Performance Management', 'I consistently manage underperformance in my team.', 'People', '2026-04-17 10:29:52.130542');
INSERT INTO public.competencies VALUES (1125, 45, 'Communication', 'I communicate well by listening effectively and building rapport', 'Candidate Management', '2026-04-17 10:30:29.71901');
INSERT INTO public.competencies VALUES (1150, 46, 'Activity', 'I consistently hit over my minimum activity on Cube', 'Desk Management', '2026-04-17 10:30:29.783788');
INSERT INTO public.competencies VALUES (1155, 46, 'Commercial Awareness', 'I am aware of my target and the activity required to achieve it', 'Desk Management', '2026-04-17 10:30:29.795807');
INSERT INTO public.competencies VALUES (1160, 46, 'Referrals', 'I ask for and receive quality referrals from my network', 'Candidate Attraction', '2026-04-17 10:30:29.808077');
INSERT INTO public.competencies VALUES (943, 51, 'Time management', 'I successfully manage my workload through the week', 'Core Sales Skills', '2026-04-17 10:29:52.285092');
INSERT INTO public.competencies VALUES (918, 50, 'Adaptability', 'I identify market and business changes and alter team direction accordingly.', 'Development', '2026-04-17 10:29:52.216351');
INSERT INTO public.competencies VALUES (933, 51, 'Divisional Manager 180 (Delivery)', 'Most of the time', 'Core Competencies', '2026-04-17 10:29:52.258961');
INSERT INTO public.competencies VALUES (909, 50, 'Placement', 'I can effectively support the candidate through the offer stage.', 'Candidate Management', '2026-04-17 10:29:52.195037');
INSERT INTO public.competencies VALUES (927, 50, 'Situational Leadership', 'I use the development journey to understand where the biggest impact can be had.', 'People', '2026-04-17 10:29:52.239539');
INSERT INTO public.competencies VALUES (892, 50, 'Self Orientation', 'I always act in the customers'' best interests.', 'Core Competencies', '2026-04-17 10:29:52.152876');
INSERT INTO public.competencies VALUES (896, 50, 'Time management', 'I consistently manage my workload through the week.', 'Desk Management', '2026-04-17 10:29:52.163117');
INSERT INTO public.competencies VALUES (897, 50, 'Data Quality', 'I consistently log everything on Bullhorn accurately.', 'Desk Management', '2026-04-17 10:29:52.165767');
INSERT INTO public.competencies VALUES (905, 50, 'Qualify', 'I can qualify candidates successfully.', 'Candidate Management', '2026-04-17 10:29:52.184988');
INSERT INTO public.competencies VALUES (906, 50, 'Network building', 'I can build a hotlist of suitable candidates within my niches in Bullhorn.', 'Candidate Management', '2026-04-17 10:29:52.187052');
INSERT INTO public.competencies VALUES (951, 51, 'Engagement', 'I identify, engage, and get responses from candidates', 'Core Sales Skills', '2026-04-17 10:29:52.3055');
INSERT INTO public.competencies VALUES (928, 50, 'Expectations', 'I set clear expectations.', 'People', '2026-04-17 10:29:52.241906');
INSERT INTO public.competencies VALUES (898, 50, 'Data awareness', 'I understand the data behind my desk that leads me to success.', 'Desk Management', '2026-04-17 10:29:52.167968');
INSERT INTO public.competencies VALUES (910, 50, 'Relationship', 'I build trusted, long-lasting relationships.', 'Candidate Management', '2026-04-17 10:29:52.197445');
INSERT INTO public.competencies VALUES (899, 50, 'Leads', 'I find leads independently and follow up on them.', 'Desk Management', '2026-04-17 10:29:52.170397');
INSERT INTO public.competencies VALUES (900, 50, 'Active and Passive Candidates', 'I use passive candidate attraction methods as well as active methods.', 'Candidate Attraction', '2026-04-17 10:29:52.172472');
INSERT INTO public.competencies VALUES (901, 50, 'Sourcing', 'I understand the process of sourcing a candidate and follow it.', 'Candidate Attraction', '2026-04-17 10:29:52.175082');
INSERT INTO public.competencies VALUES (902, 50, 'Advert Writing', 'I can write an effective, compelling, well-written job advert and consistently post all jobs on our website.', 'Candidate Attraction', '2026-04-17 10:29:52.177365');
INSERT INTO public.competencies VALUES (903, 50, 'Engagement', 'I can identify, engage, and get responses from candidates.', 'Candidate Attraction', '2026-04-17 10:29:52.179531');
INSERT INTO public.competencies VALUES (904, 50, 'Referrals', 'I ask for and receive quality referrals from my network.', 'Candidate Attraction', '2026-04-17 10:29:52.182036');
INSERT INTO public.competencies VALUES (907, 50, 'Communication', 'I communicate well by listening effectively and building rapport.', 'Candidate Management', '2026-04-17 10:29:52.189577');
INSERT INTO public.competencies VALUES (908, 50, 'Marketing', 'I can effectively and successfully market candidates to clients.', 'Candidate Management', '2026-04-17 10:29:52.19202');
INSERT INTO public.competencies VALUES (911, 50, 'Quality check', 'I consistently ensure the quality of candidates.', 'Candidate Management', '2026-04-17 10:29:52.199829');
INSERT INTO public.competencies VALUES (912, 50, 'Business needs', 'I identify business needs to drive growth.', 'Growth', '2026-04-17 10:29:52.202052');
INSERT INTO public.competencies VALUES (913, 50, 'Data analysis', 'I create and understand impactful data.', 'Growth', '2026-04-17 10:29:52.204222');
INSERT INTO public.competencies VALUES (914, 50, 'Initiatives', 'I promote initiatives and incentives that drive growth.', 'Growth', '2026-04-17 10:29:52.20636');
INSERT INTO public.competencies VALUES (915, 50, 'Mindset', 'I consistently act and behave with a growth mindset.', 'Growth', '2026-04-17 10:29:52.209111');
INSERT INTO public.competencies VALUES (916, 50, 'Personal development', 'I own my own development.', 'Development', '2026-04-17 10:29:52.21156');
INSERT INTO public.competencies VALUES (917, 50, 'Development of others', 'I own the development of my team and am responsible for retention.', 'Development', '2026-04-17 10:29:52.21384');
INSERT INTO public.competencies VALUES (919, 50, 'Data awareness', 'I use data to measure the performance of my team.', 'Development', '2026-04-17 10:29:52.218883');
INSERT INTO public.competencies VALUES (920, 50, 'Values alignment', 'I am aligned with and demonstrate values.', 'Culture', '2026-04-17 10:29:52.221282');
INSERT INTO public.competencies VALUES (921, 50, 'Continuous improvement', 'I play a leading role in improving the culture of HPS.', 'Culture', '2026-04-17 10:29:52.223582');
INSERT INTO public.competencies VALUES (922, 50, 'Contribution', 'I contribute to relevant meetings and events where appropriate.', 'Culture', '2026-04-17 10:29:52.226571');
INSERT INTO public.competencies VALUES (923, 50, 'Behavioural', 'I drive the right behaviours within my team.', 'Culture', '2026-04-17 10:29:52.22924');
INSERT INTO public.competencies VALUES (924, 50, 'Motivate', 'I motivate my team to success.', 'People', '2026-04-17 10:29:52.231761');
INSERT INTO public.competencies VALUES (925, 50, 'Inspire', 'I inspire and motivate team members.', 'People', '2026-04-17 10:29:52.234152');
INSERT INTO public.competencies VALUES (926, 50, 'Wellbeing', 'I look after the well-being of my team members.', 'People', '2026-04-17 10:29:52.23727');
INSERT INTO public.competencies VALUES (929, 50, 'Hiring talent', 'I own the hiring for my team.', 'People', '2026-04-17 10:29:52.244229');
INSERT INTO public.competencies VALUES (930, 50, 'Performance Management', 'I consistently manage underperformance in my team.', 'People', '2026-04-17 10:29:52.246575');
INSERT INTO public.competencies VALUES (942, 51, 'Activity', 'I consistently hit my minimum activity on Cube', 'Core Sales Skills', '2026-04-17 10:29:52.282636');
INSERT INTO public.competencies VALUES (944, 51, 'Data Quality', 'I consistently log everything on Bullhorn accurately', 'Core Sales Skills', '2026-04-17 10:29:52.287062');
INSERT INTO public.competencies VALUES (945, 51, 'Data awareness', 'I understand the data behind my desk that leads me to success', 'Core Sales Skills', '2026-04-17 10:29:52.289686');
INSERT INTO public.competencies VALUES (946, 51, 'Leads', 'I find leads independently and follow up on them', 'Core Sales Skills', '2026-04-17 10:29:52.29263');
INSERT INTO public.competencies VALUES (947, 51, 'Commercial Awareness', 'I am aware of my target and the activity required to achieve it', 'Core Sales Skills', '2026-04-17 10:29:52.294857');
INSERT INTO public.competencies VALUES (948, 51, 'Active and Passive Candidates', 'I use passive candidate attraction methods as well as active ones', 'Core Sales Skills', '2026-04-17 10:29:52.297409');
INSERT INTO public.competencies VALUES (949, 51, 'Sourcing', 'I understand the process of sourcing a candidate and follow this', 'Core Sales Skills', '2026-04-17 10:29:52.300308');
INSERT INTO public.competencies VALUES (950, 51, 'Advert Writing', 'I can write an effective, compelling, well written job advert and post all jobs on our website', 'Core Sales Skills', '2026-04-17 10:29:52.302819');
INSERT INTO public.competencies VALUES (952, 51, 'Referrals', 'I ask for and receive quality referrals from my network', 'Core Sales Skills', '2026-04-17 10:29:52.307768');
INSERT INTO public.competencies VALUES (953, 51, 'Qualify', 'I qualify candidates successfully', 'Core Sales Skills', '2026-04-17 10:29:52.310499');
INSERT INTO public.competencies VALUES (995, 52, 'Activity', 'I consistently hit my minimum activity on Cube', 'Core Sales Skills', '2026-04-17 10:29:52.419076');
INSERT INTO public.competencies VALUES (967, 51, 'Adaptability', 'I identify market/business changes and alter team direction accordingly', 'Development', '2026-04-17 10:29:52.349025');
INSERT INTO public.competencies VALUES (955, 51, 'Communication', 'I communicate well by listening effectively and building rapport', 'Core Sales Skills', '2026-04-17 10:29:52.315278');
INSERT INTO public.competencies VALUES (978, 51, 'Expectations', 'I set clear expectations', 'People', '2026-04-17 10:29:52.375537');
INSERT INTO public.competencies VALUES (55, 55, 'Network building', 'I build a hotlist of suitable candidates within my niches in Bullhorn', 'Candidate Management', '2026-04-17 10:29:49.785967');
INSERT INTO public.competencies VALUES (220, 59, 'Advert Writing', 'I write effective, compelling, well-written job adverts and post all jobs on our website', 'Candidate Attraction', '2026-04-17 10:29:50.272725');
INSERT INTO public.competencies VALUES (954, 51, 'Network building', 'I build a hotlist of suitable candidates within my niches in Bullhorn', 'Core Sales Skills', '2026-04-17 10:29:52.312977');
INSERT INTO public.competencies VALUES (956, 51, 'Marketing', 'I can effectively market candidates to clients successfully', 'Core Sales Skills', '2026-04-17 10:29:52.317567');
INSERT INTO public.competencies VALUES (1002, 52, 'Sourcing', 'I understand the process of sourcing a candidate and follow it', 'Core Sales Skills', '2026-04-17 10:29:52.439467');
INSERT INTO public.competencies VALUES (979, 51, 'Hiring talent', 'I own the hiring for my team', 'People', '2026-04-17 10:29:52.37859');
INSERT INTO public.competencies VALUES (957, 51, 'Placement', 'I support the candidate through the offer stage effectively', 'Core Sales Skills', '2026-04-17 10:29:52.320017');
INSERT INTO public.competencies VALUES (958, 51, 'Relationship', 'I build trusted, long-lasting relationships', 'Core Sales Skills', '2026-04-17 10:29:52.322472');
INSERT INTO public.competencies VALUES (959, 51, 'Quality check', 'I ensure the quality of candidates', 'Core Sales Skills', '2026-04-17 10:29:52.32517');
INSERT INTO public.competencies VALUES (960, 51, 'Business needs', 'I identify business needs to drive growth', 'Growth', '2026-04-17 10:29:52.328027');
INSERT INTO public.competencies VALUES (961, 51, 'Data analysis', 'I create and understand impactful data', 'Growth', '2026-04-17 10:29:52.331071');
INSERT INTO public.competencies VALUES (962, 51, 'Initiatives', 'I promote initiatives and incentives that drive growth', 'Growth', '2026-04-17 10:29:52.333973');
INSERT INTO public.competencies VALUES (963, 51, 'Mindset', 'I consistently act and behave with a growth mindset', 'Growth', '2026-04-17 10:29:52.337902');
INSERT INTO public.competencies VALUES (964, 51, 'Scale', 'I have the foresight to scale and develop my team', 'Growth', '2026-04-17 10:29:52.340849');
INSERT INTO public.competencies VALUES (965, 51, 'Personal development', 'I own my own development', 'Development', '2026-04-17 10:29:52.343471');
INSERT INTO public.competencies VALUES (966, 51, 'Development of others', 'I own the development of the team and am responsible for retention', 'Development', '2026-04-17 10:29:52.345777');
INSERT INTO public.competencies VALUES (968, 51, 'Data awareness', 'I use data to measure the performance of my team', 'Development', '2026-04-17 10:29:52.351249');
INSERT INTO public.competencies VALUES (969, 51, 'Business needs', 'I support development of business', 'Development', '2026-04-17 10:29:52.353919');
INSERT INTO public.competencies VALUES (970, 51, 'Values alignment', 'I am aligned with and demonstrate values', 'Culture', '2026-04-17 10:29:52.356022');
INSERT INTO public.competencies VALUES (971, 51, 'Continuous improvement', 'I play a leading role in improving the culture of HPS', 'Culture', '2026-04-17 10:29:52.358492');
INSERT INTO public.competencies VALUES (972, 51, 'Contribution', 'I contribute to relevant meetings and events where appropriate', 'Culture', '2026-04-17 10:29:52.360995');
INSERT INTO public.competencies VALUES (973, 51, 'Behavioural', 'I drive the right behaviours within my team', 'Culture', '2026-04-17 10:29:52.363629');
INSERT INTO public.competencies VALUES (974, 51, 'Motivate', 'I motivate my team to success', 'People', '2026-04-17 10:29:52.365844');
INSERT INTO public.competencies VALUES (975, 51, 'Inspire', 'I inspire and motivate my team members', 'People', '2026-04-17 10:29:52.368158');
INSERT INTO public.competencies VALUES (976, 51, 'Wellbeing', 'I look after the well-being of my team members', 'People', '2026-04-17 10:29:52.370517');
INSERT INTO public.competencies VALUES (977, 51, 'Situational Leadership', 'I use the development journey to understand where the biggest impact can be had', 'People', '2026-04-17 10:29:52.372856');
INSERT INTO public.competencies VALUES (980, 51, 'Performance Management', 'I am responsible for managing underperformance for my team', 'People', '2026-04-17 10:29:52.380751');
INSERT INTO public.competencies VALUES (983, 51, 'Communication', 'I create local level micro culture to drive high standards', 'Organisational', '2026-04-17 10:29:52.38845');
INSERT INTO public.competencies VALUES (984, 51, 'Change Mangement', 'I navigate change successfully', 'Organisational', '2026-04-17 10:29:52.390763');
INSERT INTO public.competencies VALUES (985, 51, 'Goal setting', 'I can set clear goals and objectives', 'Organisational', '2026-04-17 10:29:52.393443');
INSERT INTO public.competencies VALUES (986, 52, 'Divisional Manager 180 (Delivery)', 'I Most of the time', 'Core Competencies', '2026-04-17 10:29:52.395916');
INSERT INTO public.competencies VALUES (996, 52, 'Time management', 'I am able to successfully manage my workload through the week', 'Core Sales Skills', '2026-04-17 10:29:52.421654');
INSERT INTO public.competencies VALUES (997, 52, 'Data Quality', 'I consistently log everything on Bullhorn accurately', 'Core Sales Skills', '2026-04-17 10:29:52.424765');
INSERT INTO public.competencies VALUES (998, 52, 'Data awareness', 'I understand the data behind my desk that leads me to success', 'Core Sales Skills', '2026-04-17 10:29:52.42759');
INSERT INTO public.competencies VALUES (999, 52, 'Leads', 'I find leads independently and follow up on them', 'Core Sales Skills', '2026-04-17 10:29:52.430091');
INSERT INTO public.competencies VALUES (1000, 52, 'Commercial Awareness', 'I am aware of my target and the activity required to achieve it', 'Core Sales Skills', '2026-04-17 10:29:52.43319');
INSERT INTO public.competencies VALUES (1001, 52, 'Active and Passive Candidates', 'I use passive candidate attraction methods as well as active methods', 'Core Sales Skills', '2026-04-17 10:29:52.436553');
INSERT INTO public.competencies VALUES (1003, 52, 'Advert Writing', 'I can write an effective, compelling, well-written job advert and post all jobs on our website', 'Core Sales Skills', '2026-04-17 10:29:52.442228');
INSERT INTO public.competencies VALUES (1004, 52, 'Engagement', 'I can identify, engage, and get responses from candidates', 'Core Sales Skills', '2026-04-17 10:29:52.445203');
INSERT INTO public.competencies VALUES (1005, 52, 'Referrals', 'I ask for and receive quality referrals from my network', 'Core Sales Skills', '2026-04-17 10:29:52.447543');
INSERT INTO public.competencies VALUES (1006, 52, 'Qualify', 'I can qualify candidates successfully', 'Core Sales Skills', '2026-04-17 10:29:52.450359');
INSERT INTO public.competencies VALUES (1007, 52, 'Network building', 'I can build a hotlist of suitable candidates within my niches in Bullhorn', 'Core Sales Skills', '2026-04-17 10:29:52.452771');
INSERT INTO public.competencies VALUES (1008, 52, 'Communication', 'I communicate well by listening effectively and building rapport', 'Core Sales Skills', '2026-04-17 10:29:52.454948');
INSERT INTO public.competencies VALUES (1033, 52, 'Performance Management', 'I am responsible for managing underperformance in my team', 'People', '2026-04-17 10:29:52.519122');
INSERT INTO public.competencies VALUES (1017, 52, 'Scale', 'I have the foresight to scale and develop my team', 'Growth', '2026-04-17 10:29:52.47807');
INSERT INTO public.competencies VALUES (1061, 43, 'Communication', 'I communicate well by listening effectively and building rapport', 'Candidate Management', '2026-04-17 10:30:29.539675');
INSERT INTO public.competencies VALUES (1027, 52, 'Motivate', 'I am able to motivate my team to success', 'People', '2026-04-17 10:29:52.50265');
INSERT INTO public.competencies VALUES (671, 67, 'Referrals', 'I ask for and receive quality referrals from my network', 'Core Sales Skills', '2026-04-17 10:29:51.582648');
INSERT INTO public.competencies VALUES (726, 41, 'Leads', 'I find leads independently and follow up on them', 'Desk Management', '2026-04-17 10:29:51.729546');
INSERT INTO public.competencies VALUES (779, 47, 'Sourcing', 'I understand the process of sourcing a candidate and follow it', 'Candidate Attraction', '2026-04-17 10:29:51.865888');
INSERT INTO public.competencies VALUES (1050, 43, 'Data Quality', 'I consistently log everything on Bullhorn accurately', 'Desk Management', '2026-04-17 10:30:29.512501');
INSERT INTO public.competencies VALUES (1062, 43, 'Marketing', 'I effectively market candidates to clients successfully', 'Candidate Management', '2026-04-17 10:30:29.542449');
INSERT INTO public.competencies VALUES (1063, 43, 'Placement', 'I support the candidate effectively through the offer stage', 'Candidate Management', '2026-04-17 10:30:29.544697');
INSERT INTO public.competencies VALUES (1030, 52, 'Situational Leadership', 'I use the development journey to understand where the biggest impact can be had', 'People', '2026-04-17 10:29:52.51042');
INSERT INTO public.competencies VALUES (780, 47, 'Advert Writing', 'I write effective, compelling, well written job adverts and post all jobs on our website', 'Candidate Attraction', '2026-04-17 10:29:51.868437');
INSERT INTO public.competencies VALUES (1065, 43, 'Quality check', 'I ensure the quality of candidates', 'Candidate Management', '2026-04-17 10:30:29.550532');
INSERT INTO public.competencies VALUES (1051, 43, 'Data awareness', 'I understand the data behind my desk that leads me to success', 'Desk Management', '2026-04-17 10:30:29.514883');
INSERT INTO public.competencies VALUES (1009, 52, 'Marketing', 'I effectively market candidates to clients', 'Core Sales Skills', '2026-04-17 10:29:52.457584');
INSERT INTO public.competencies VALUES (1010, 52, 'Placement', 'I support the candidate through the offer stage effectively', 'Core Sales Skills', '2026-04-17 10:29:52.459777');
INSERT INTO public.competencies VALUES (1011, 52, 'Relationship', 'I build trusted, long-lasting relationships', 'Core Sales Skills', '2026-04-17 10:29:52.462111');
INSERT INTO public.competencies VALUES (1012, 52, 'Quality check', 'I ensure the quality of candidates', 'Core Sales Skills', '2026-04-17 10:29:52.465156');
INSERT INTO public.competencies VALUES (1013, 52, 'Business needs', 'I am able to identify business needs to drive growth', 'Growth', '2026-04-17 10:29:52.467705');
INSERT INTO public.competencies VALUES (1014, 52, 'Data analysis', 'I am able to create and understand impactful data', 'Growth', '2026-04-17 10:29:52.47006');
INSERT INTO public.competencies VALUES (1015, 52, 'Initiatives', 'I promote initiatives and incentives that drive growth', 'Growth', '2026-04-17 10:29:52.472618');
INSERT INTO public.competencies VALUES (1016, 52, 'Mindset', 'I consistently act and behave with a growth mindset', 'Growth', '2026-04-17 10:29:52.475023');
INSERT INTO public.competencies VALUES (1018, 52, 'Personal development', 'I own my own development', 'Development', '2026-04-17 10:29:52.480324');
INSERT INTO public.competencies VALUES (1019, 52, 'Development of others', 'I own the development of the team and am responsible for retention', 'Development', '2026-04-17 10:29:52.482885');
INSERT INTO public.competencies VALUES (1020, 52, 'Adaptability', 'I identify market and business changes and alter team direction accordingly', 'Development', '2026-04-17 10:29:52.485052');
INSERT INTO public.competencies VALUES (1021, 52, 'Data awareness', 'I can use data to measure the performance of my team', 'Development', '2026-04-17 10:29:52.488031');
INSERT INTO public.competencies VALUES (1022, 52, 'Business needs', 'I support development of the business', 'Development', '2026-04-17 10:29:52.490346');
INSERT INTO public.competencies VALUES (1023, 52, 'Values alignment', 'I am aligned with and demonstrate the values', 'Culture', '2026-04-17 10:29:52.492786');
INSERT INTO public.competencies VALUES (1024, 52, 'Continuous improvement', 'I play a leading role in improving the culture of HPS', 'Culture', '2026-04-17 10:29:52.495083');
INSERT INTO public.competencies VALUES (1025, 52, 'Contribution', 'I contribute to relevant meetings and events where appropriate', 'Culture', '2026-04-17 10:29:52.497439');
INSERT INTO public.competencies VALUES (1026, 52, 'Behavioural', 'I drive the right behaviours within my team', 'Culture', '2026-04-17 10:29:52.499927');
INSERT INTO public.competencies VALUES (1028, 52, 'Inspire', 'I am able to inspire and motivate team members', 'People', '2026-04-17 10:29:52.505124');
INSERT INTO public.competencies VALUES (1029, 52, 'Wellbeing', 'I look after the well-being of my team members', 'People', '2026-04-17 10:29:52.507496');
INSERT INTO public.competencies VALUES (1031, 52, 'Expectations', 'I set clear expectations', 'People', '2026-04-17 10:29:52.513579');
INSERT INTO public.competencies VALUES (1032, 52, 'Hiring talent', 'I own the hiring for my team', 'People', '2026-04-17 10:29:52.515799');
INSERT INTO public.competencies VALUES (1036, 52, 'Communication', 'I create a local-level micro culture to drive high standards', 'Organisational', '2026-04-17 10:29:52.527272');
INSERT INTO public.competencies VALUES (1037, 52, 'Change Mangement', 'I navigate change successfully', 'Organisational', '2026-04-17 10:29:52.529649');
INSERT INTO public.competencies VALUES (1038, 52, 'Goal setting', 'I can set clear goals and objectives', 'Organisational', '2026-04-17 10:29:52.532574');
INSERT INTO public.competencies VALUES (1043, 43, 'Reliability', 'I provide a consistently good recruitment process', 'Core Competencies', '2026-04-17 10:30:29.49125');
INSERT INTO public.competencies VALUES (1048, 43, 'Activity', 'I consistently hit my minimum activity on Cube', 'Desk Management', '2026-04-17 10:30:29.506645');
INSERT INTO public.competencies VALUES (1049, 43, 'Time management', 'I manage my workload successfully through the week', 'Desk Management', '2026-04-17 10:30:29.508991');
INSERT INTO public.competencies VALUES (1052, 43, 'Leads', 'I find leads independently and follow up on them', 'Desk Management', '2026-04-17 10:30:29.517086');
INSERT INTO public.competencies VALUES (1053, 43, 'Commercial awareness', 'I am aware of my target and the activity required to achieve it', 'Desk Management', '2026-04-17 10:30:29.51949');
INSERT INTO public.competencies VALUES (1054, 43, 'Active and Passive Candidates', 'I use passive candidate attraction methods as well as active methods', 'Candidate Attraction', '2026-04-17 10:30:29.522387');
INSERT INTO public.competencies VALUES (1055, 43, 'Sourcing', 'I understand the process of sourcing a candidate and follow it', 'Candidate Attraction', '2026-04-17 10:30:29.524748');
INSERT INTO public.competencies VALUES (1056, 43, 'Advert Writing', 'I write effective, compelling, well-written job adverts and post all jobs on our website', 'Candidate Attraction', '2026-04-17 10:30:29.527015');
INSERT INTO public.competencies VALUES (1057, 43, 'Engagement', 'I identify, engage, and get responses from candidates', 'Candidate Attraction', '2026-04-17 10:30:29.530077');
INSERT INTO public.competencies VALUES (1058, 43, 'Referrals', 'I ask for and receive quality referrals from my network', 'Candidate Attraction', '2026-04-17 10:30:29.532443');
INSERT INTO public.competencies VALUES (1059, 43, 'Qualify', 'I successfully qualify candidates', 'Candidate Management', '2026-04-17 10:30:29.534516');
INSERT INTO public.competencies VALUES (1060, 43, 'Network building', 'I build a hotlist of suitable candidates within my niches in Bullhorn', 'Candidate Management', '2026-04-17 10:30:29.536986');
INSERT INTO public.competencies VALUES (1064, 43, 'Relationship', 'I build trusted, long-lasting relationships', 'Candidate Management', '2026-04-17 10:30:29.547846');
INSERT INTO public.competencies VALUES (1066, 43, 'Accountability', 'I set high standards for performance', 'Role Modelling Skills', '2026-04-17 10:30:29.55381');
INSERT INTO public.competencies VALUES (1067, 43, 'Ethical & Professional conduct', 'I act professionally at all times and adhere to ethical standards', 'Role Modelling Skills', '2026-04-17 10:30:29.55613');
INSERT INTO public.competencies VALUES (1068, 43, 'Teamwork', 'I proactively collaborate effectively with the team and across the company', 'Role Modelling Skills', '2026-04-17 10:30:29.558709');
INSERT INTO public.competencies VALUES (1088, 44, 'Advert Writing', 'I write effective, compelling, well-written job adverts and post all jobs on our website', 'Candidate Attraction', '2026-04-17 10:30:29.610576');
INSERT INTO public.competencies VALUES (1102, 44, 'Leads by example', 'I demonstrate the right behaviours so that others follow', 'Role Modelling Skills', '2026-04-17 10:30:29.646126');
INSERT INTO public.competencies VALUES (1113, 45, 'Time management', 'I successfully manage my workload through the week', 'Desk Management', '2026-04-17 10:30:29.686803');
INSERT INTO public.competencies VALUES (1089, 44, 'Engagement', 'I identify, engage, and get responses from candidates', 'Candidate Attraction', '2026-04-17 10:30:29.612674');
INSERT INTO public.competencies VALUES (1069, 43, 'Continuous Learning', 'I am driven to continuously develop myself and my skills', 'Role Modelling Skills', '2026-04-17 10:30:29.561153');
INSERT INTO public.competencies VALUES (1114, 45, 'Data Quality', 'I consistently log everything on Bullhorn accurately', 'Desk Management', '2026-04-17 10:30:29.689148');
INSERT INTO public.competencies VALUES (1070, 43, 'Leads by example', 'I demonstrate the right behaviours to display so that others follow', 'Role Modelling Skills', '2026-04-17 10:30:29.563824');
INSERT INTO public.competencies VALUES (1115, 45, 'Data awareness', 'I understand the data behind my desk that leads me to success', 'Desk Management', '2026-04-17 10:30:29.691793');
INSERT INTO public.competencies VALUES (1090, 44, 'Referrals', 'I ask for and receive quality referrals from my network', 'Candidate Attraction', '2026-04-17 10:30:29.615176');
INSERT INTO public.competencies VALUES (1116, 45, 'Leads', 'I find leads independently and follow up on them', 'Desk Management', '2026-04-17 10:30:29.694581');
INSERT INTO public.competencies VALUES (1071, 44, 'Senior Consultant 180 (Delivery)', 'I Most of the time', 'Core Competencies', '2026-04-17 10:30:29.56685');
INSERT INTO public.competencies VALUES (1103, 45, 'Principal Recruiter 180 (Delivery)', 'Most of the time', 'Core Competencies', '2026-04-17 10:30:29.650071');
INSERT INTO public.competencies VALUES (1080, 44, 'Activity', 'I consistently hit my minimum activity on Cube', 'Desk Management', '2026-04-17 10:30:29.589794');
INSERT INTO public.competencies VALUES (1118, 45, 'Active and Passive Candidates', 'I use passive candidate attraction methods as well as active ones', 'Candidate Attraction', '2026-04-17 10:30:29.700496');
INSERT INTO public.competencies VALUES (1091, 44, 'Qualify', 'I successfully qualify candidates', 'Candidate Management', '2026-04-17 10:30:29.617338');
INSERT INTO public.competencies VALUES (1081, 44, 'Time management', 'I manage my workload successfully through the week', 'Desk Management', '2026-04-17 10:30:29.591991');
INSERT INTO public.competencies VALUES (1082, 44, 'Data Quality', 'I consistently log everything on Bullhorn accurately', 'Desk Management', '2026-04-17 10:30:29.594917');
INSERT INTO public.competencies VALUES (1083, 44, 'Data awareness', 'I understand the data behind my desk that leads me to success', 'Desk Management', '2026-04-17 10:30:29.598097');
INSERT INTO public.competencies VALUES (1084, 44, 'Leads', 'I find leads independently and follow up on them', 'Desk Management', '2026-04-17 10:30:29.600183');
INSERT INTO public.competencies VALUES (1085, 44, 'Commercial awareness', 'I am aware of my target and the activity required to achieve it', 'Desk Management', '2026-04-17 10:30:29.602598');
INSERT INTO public.competencies VALUES (1086, 44, 'Active and Passive Candidates', 'I use passive candidate attraction methods as well as active methods', 'Candidate Attraction', '2026-04-17 10:30:29.605682');
INSERT INTO public.competencies VALUES (1087, 44, 'Sourcing', 'I understand the process of sourcing a candidate and follow it', 'Candidate Attraction', '2026-04-17 10:30:29.607596');
INSERT INTO public.competencies VALUES (1092, 44, 'Network building', 'I build a hotlist of suitable candidates within my niches in Bullhorn', 'Candidate Management', '2026-04-17 10:30:29.619424');
INSERT INTO public.competencies VALUES (1093, 44, 'Communication', 'I communicate well by listening effectively and building rapport', 'Candidate Management', '2026-04-17 10:30:29.622');
INSERT INTO public.competencies VALUES (1094, 44, 'Marketing', 'I effectively and successfully market candidates to clients', 'Candidate Management', '2026-04-17 10:30:29.624944');
INSERT INTO public.competencies VALUES (1095, 44, 'Placement', 'I effectively support the candidate through the offer stage', 'Candidate Management', '2026-04-17 10:30:29.627041');
INSERT INTO public.competencies VALUES (1096, 44, 'Relationship', 'I build trusted long-lasting relationships', 'Candidate Management', '2026-04-17 10:30:29.629168');
INSERT INTO public.competencies VALUES (1097, 44, 'Quality check', 'I consistently ensure the quality of candidates', 'Candidate Management', '2026-04-17 10:30:29.63272');
INSERT INTO public.competencies VALUES (1098, 44, 'Accountability', 'I consistently set high standards for performance', 'Role Modelling Skills', '2026-04-17 10:30:29.635369');
INSERT INTO public.competencies VALUES (1099, 44, 'Ethical & Professional conduct', 'I act professionally at all times and adhere to ethical standards', 'Role Modelling Skills', '2026-04-17 10:30:29.637749');
INSERT INTO public.competencies VALUES (1100, 44, 'Teamwork', 'I proactively collaborate effectively with my team and across the company', 'Role Modelling Skills', '2026-04-17 10:30:29.640217');
INSERT INTO public.competencies VALUES (1101, 44, 'Continuous Learning', 'I am driven to continuously develop myself and my skills', 'Role Modelling Skills', '2026-04-17 10:30:29.64323');
INSERT INTO public.competencies VALUES (1119, 45, 'Sourcing', 'I understand the process of sourcing a candidate and follow it', 'Candidate Attraction', '2026-04-17 10:30:29.703049');
INSERT INTO public.competencies VALUES (1120, 45, 'Advert Writing', 'I write an effective, compelling, well-written job advert and post all jobs on our website', 'Candidate Attraction', '2026-04-17 10:30:29.705812');
INSERT INTO public.competencies VALUES (1123, 45, 'Qualify', 'I successfully qualify candidates', 'Candidate Management', '2026-04-17 10:30:29.71419');
INSERT INTO public.competencies VALUES (1126, 45, 'Marketing', 'I effectively and successfully market candidates to clients', 'Candidate Management', '2026-04-17 10:30:29.721157');
INSERT INTO public.competencies VALUES (1127, 45, 'Placement', 'I effectively support the candidate through the offer stage', 'Candidate Management', '2026-04-17 10:30:29.723309');
INSERT INTO public.competencies VALUES (1128, 45, 'Relationship', 'I build trusted long-lasting relationships', 'Candidate Management', '2026-04-17 10:30:29.72592');
INSERT INTO public.competencies VALUES (1129, 45, 'Quality check', 'I consistently ensure the quality of candidates', 'Candidate Management', '2026-04-17 10:30:29.729608');
INSERT INTO public.competencies VALUES (1130, 45, 'Retaining talent', 'I play a role in ensuring we meet the HPS retention goal', 'Growth', '2026-04-17 10:30:29.732214');
INSERT INTO public.competencies VALUES (1132, 45, 'Initiatives', 'I promote initiatives and incentives that drive growth', 'Growth', '2026-04-17 10:30:29.737205');
INSERT INTO public.competencies VALUES (1133, 45, 'Mindset', 'I consistently act and behave with a growth mindset', 'Growth', '2026-04-17 10:30:29.740045');
INSERT INTO public.competencies VALUES (1141, 46, 'Principal Recruiter 180 (Delivery)', 'Most of the time', 'Core Competencies', '2026-04-17 10:30:29.760557');
INSERT INTO public.competencies VALUES (1134, 45, 'Personal development', 'I own my own development', 'Development', '2026-04-17 10:30:29.742091');
INSERT INTO public.competencies VALUES (2, 56, 'Accountability', 'I take ownership of completing my own tasks and consistently achieve targets', 'Core Competencies', '2026-04-17 10:29:49.491838');
INSERT INTO public.competencies VALUES (3, 56, 'Customer service', 'I take pride in building trust and consistently deliver world class service to customers', 'Core Competencies', '2026-04-17 10:29:49.494995');
INSERT INTO public.competencies VALUES (4, 56, 'Credibility', 'I proactively become a sector expert and truly consult customers', 'Core Competencies', '2026-04-17 10:29:49.498238');
INSERT INTO public.competencies VALUES (5, 56, 'Reliability', 'I provide a consistently good recruitment process', 'Core Competencies', '2026-04-17 10:29:49.501353');
INSERT INTO public.competencies VALUES (6, 56, 'Intimacy', 'I act as a trusted advisor and make connections on a personal level', 'Core Competencies', '2026-04-17 10:29:49.504678');
INSERT INTO public.competencies VALUES (7, 56, 'Self Orientation', 'I always act in the customers best interests', 'Core Competencies', '2026-04-17 10:29:49.507698');
INSERT INTO public.competencies VALUES (37, 55, 'Accountability', 'I take ownership of completing my own tasks and consistently achieve targets', 'Core Competencies', '2026-04-17 10:29:49.731147');
INSERT INTO public.competencies VALUES (38, 55, 'Customer service', 'I take pride in building trust and consistently deliver world class service to customers', 'Core Competencies', '2026-04-17 10:29:49.734332');
INSERT INTO public.competencies VALUES (39, 55, 'Credibility', 'I proactively become a sector expert and truly consult customers', 'Core Competencies', '2026-04-17 10:29:49.736759');
INSERT INTO public.competencies VALUES (40, 55, 'Reliability', 'I provide a consistently good recruitment process', 'Core Competencies', '2026-04-17 10:29:49.740011');
INSERT INTO public.competencies VALUES (41, 55, 'Intimacy', 'I act as a trusted advisor and make connections on a personal level', 'Core Competencies', '2026-04-17 10:29:49.742718');
INSERT INTO public.competencies VALUES (42, 55, 'Self Orientation', 'I always act in the customers best interests', 'Core Competencies', '2026-04-17 10:29:49.745796');
INSERT INTO public.competencies VALUES (72, 58, 'Accountability', 'I take ownership of completing my own tasks and consistently achieve targets', 'Core Competencies', '2026-04-17 10:29:49.841054');
INSERT INTO public.competencies VALUES (73, 58, 'Customer service', 'I take pride in building trust and consistently deliver world class service to customers', 'Core Competencies', '2026-04-17 10:29:49.844819');
INSERT INTO public.competencies VALUES (74, 58, 'Credibility', 'I proactively become a sector expert and truly consult customers', 'Core Competencies', '2026-04-17 10:29:49.848582');
INSERT INTO public.competencies VALUES (75, 58, 'Reliability', 'I provide a consistently good recruitment process', 'Core Competencies', '2026-04-17 10:29:49.851793');
INSERT INTO public.competencies VALUES (76, 58, 'Intimacy', 'I act as a trusted advisor and am able to make connections on a personal level', 'Core Competencies', '2026-04-17 10:29:49.854811');
INSERT INTO public.competencies VALUES (77, 58, 'Self Orientation', 'I always act in the customer''s best interests', 'Core Competencies', '2026-04-17 10:29:49.85789');
INSERT INTO public.competencies VALUES (114, 57, 'Accountability', 'I take ownership of completing my own tasks and consistently achieve targets', 'Core Competencies', '2026-04-17 10:29:49.965907');
INSERT INTO public.competencies VALUES (115, 57, 'Customer service', 'I take pride in building trust and consistently deliver world class service to customers', 'Core Competencies', '2026-04-17 10:29:49.96866');
INSERT INTO public.competencies VALUES (116, 57, 'Credibility', 'I proactively become a sector expert and truly consult customers', 'Core Competencies', '2026-04-17 10:29:49.971615');
INSERT INTO public.competencies VALUES (117, 57, 'Reliability', 'I provide a consistently good recruitment process', 'Core Competencies', '2026-04-17 10:29:49.974039');
INSERT INTO public.competencies VALUES (118, 57, 'Intimacy', 'I act as a trusted advisor and am able to make connections on a personal level', 'Core Competencies', '2026-04-17 10:29:49.976745');
INSERT INTO public.competencies VALUES (119, 57, 'Self Orientation', 'I always act in the customers'' best interests', 'Core Competencies', '2026-04-17 10:29:49.980218');
INSERT INTO public.competencies VALUES (156, 60, 'Accountability', 'I take ownership of completing my own tasks and consistently achieve targets', 'Core Competencies', '2026-04-17 10:29:50.082979');
INSERT INTO public.competencies VALUES (157, 60, 'Customer service', 'I take pride in building trust and consistently deliver world-class service to customers', 'Core Competencies', '2026-04-17 10:29:50.085681');
INSERT INTO public.competencies VALUES (158, 60, 'Credibility', 'I proactively become a sector expert and truly consult customers', 'Core Competencies', '2026-04-17 10:29:50.088542');
INSERT INTO public.competencies VALUES (159, 60, 'Reliability', 'I provide a consistently good recruitment process', 'Core Competencies', '2026-04-17 10:29:50.091783');
INSERT INTO public.competencies VALUES (160, 60, 'Intimacy', 'I act as a trusted advisor and make connections on a personal level', 'Core Competencies', '2026-04-17 10:29:50.09467');
INSERT INTO public.competencies VALUES (161, 60, 'Self Orientation', 'I always act in the customers'' best interests', 'Core Competencies', '2026-04-17 10:29:50.097466');
INSERT INTO public.competencies VALUES (204, 59, 'Accountability', 'I take ownership of completing my own tasks and achieving targets', 'Core Competencies', '2026-04-17 10:29:50.224805');
INSERT INTO public.competencies VALUES (205, 59, 'Customer service', 'I take pride in building trust and consistently deliver world-class service to customers', 'Core Competencies', '2026-04-17 10:29:50.22833');
INSERT INTO public.competencies VALUES (206, 59, 'Credibility', 'I proactively become a sector expert and truly consult customers', 'Core Competencies', '2026-04-17 10:29:50.230687');
INSERT INTO public.competencies VALUES (207, 59, 'Reliability', 'I provide a consistently good recruitment process', 'Core Competencies', '2026-04-17 10:29:50.233549');
INSERT INTO public.competencies VALUES (208, 59, 'Intimacy', 'I act as a trusted advisor and make connections on a personal level', 'Core Competencies', '2026-04-17 10:29:50.240571');
INSERT INTO public.competencies VALUES (209, 59, 'Self Orientation', 'I consistently act in the customer''s best interests', 'Core Competencies', '2026-04-17 10:29:50.243279');
INSERT INTO public.competencies VALUES (252, 62, 'Accountability', 'I take ownership of completing my own tasks and achieving targets', 'Core Competencies', '2026-04-17 10:29:50.360656');
INSERT INTO public.competencies VALUES (253, 62, 'Customer service', 'I take pride in building trust and delivering world class service to customers', 'Core Competencies', '2026-04-17 10:29:50.362906');
INSERT INTO public.competencies VALUES (254, 62, 'Credibility', 'I proactively become a sector expert and truly consult customers', 'Core Competencies', '2026-04-17 10:29:50.366176');
INSERT INTO public.competencies VALUES (255, 62, 'Reliability', 'I provide a consistently good recruitment process', 'Core Competencies', '2026-04-17 10:29:50.36965');
INSERT INTO public.competencies VALUES (256, 62, 'Intimacy', 'I act as a trusted advisor and make connections on a personal level', 'Core Competencies', '2026-04-17 10:29:50.372475');
INSERT INTO public.competencies VALUES (257, 62, 'Self Orientation', 'I consistently act in the customer''s best interests', 'Core Competencies', '2026-04-17 10:29:50.374862');
INSERT INTO public.competencies VALUES (891, 50, 'Intimacy', 'I act as a trusted advisor and make connections on a personal level.', 'Core Competencies', '2026-04-17 10:29:52.150701');
INSERT INTO public.competencies VALUES (408, 63, 'Credibility', 'I proactively become a sector expert and truly consult customers', 'Core Competencies', '2026-04-17 10:29:50.775957');
INSERT INTO public.competencies VALUES (465, 66, 'Customer service', 'I take pride in building trust and consistently deliver world class service to customers.', 'Core Competencies', '2026-04-17 10:29:51.019436');
INSERT INTO public.competencies VALUES (527, 65, 'Accountability', 'I take ownership of completing my own tasks and consistently achieving targets', 'Core Competencies', '2026-04-17 10:29:51.194786');
INSERT INTO public.competencies VALUES (585, 65, 'Forecasting', 'I predict and deliver team targets and growth', 'Core Competencies', '2026-04-17 10:29:51.354142');
INSERT INTO public.competencies VALUES (300, 61, 'Accountability', 'I take ownership of completing my own tasks and consistently achieve targets', 'Core Competencies', '2026-04-17 10:29:50.489299');
INSERT INTO public.competencies VALUES (301, 61, 'Customer service', 'I take pride in building trust and consistently deliver world class service to customers', 'Core Competencies', '2026-04-17 10:29:50.492916');
INSERT INTO public.competencies VALUES (302, 61, 'Credibility', 'I proactively become a sector expert and truly consult customers', 'Core Competencies', '2026-04-17 10:29:50.495508');
INSERT INTO public.competencies VALUES (303, 61, 'Reliability', 'I provide a consistently good recruitment process', 'Core Competencies', '2026-04-17 10:29:50.498229');
INSERT INTO public.competencies VALUES (409, 63, 'Reliability', 'I provide a consistently good recruitment process', 'Core Competencies', '2026-04-17 10:29:50.779884');
INSERT INTO public.competencies VALUES (466, 66, 'Credibility', 'I proactively become a sector expert and truly consult customers.', 'Core Competencies', '2026-04-17 10:29:51.022361');
INSERT INTO public.competencies VALUES (528, 65, 'Customer service', 'I take pride in building trust and consistently delivering world-class service to customers', 'Core Competencies', '2026-04-17 10:29:51.197927');
INSERT INTO public.competencies VALUES (304, 61, 'Intimacy', 'I act as a trusted advisor and make connections on a personal level', 'Core Competencies', '2026-04-17 10:29:50.500938');
INSERT INTO public.competencies VALUES (305, 61, 'Self Orientation', 'I always act in the customers'' best interests', 'Core Competencies', '2026-04-17 10:29:50.503804');
INSERT INTO public.competencies VALUES (348, 64, 'Accountability', 'I take ownership of completing my own tasks & achieving targets.', 'Core Competencies', '2026-04-17 10:29:50.613211');
INSERT INTO public.competencies VALUES (349, 64, 'Customer service', 'I take pride in building trust & delivering world class service to customers.', 'Core Competencies', '2026-04-17 10:29:50.6157');
INSERT INTO public.competencies VALUES (350, 64, 'Credibility', 'I proactively become a sector expert and truly consult customers.', 'Core Competencies', '2026-04-17 10:29:50.618623');
INSERT INTO public.competencies VALUES (351, 64, 'Reliability', 'I provide a consistently good recruitment process.', 'Core Competencies', '2026-04-17 10:29:50.621291');
INSERT INTO public.competencies VALUES (352, 64, 'Intimacy', 'I act as a trusted advisor and make connections on a personal level.', 'Core Competencies', '2026-04-17 10:29:50.623361');
INSERT INTO public.competencies VALUES (353, 64, 'Self Orientation', 'I always act in the customers'' best interests.', 'Core Competencies', '2026-04-17 10:29:50.625794');
INSERT INTO public.competencies VALUES (403, 64, 'Delivering targets', 'I am accountable for delivering team targets', 'Core Competencies', '2026-04-17 10:29:50.762101');
INSERT INTO public.competencies VALUES (404, 64, 'Forecasting', 'I predict and deliver team targets and growth', 'Core Competencies', '2026-04-17 10:29:50.764484');
INSERT INTO public.competencies VALUES (406, 63, 'Accountability', 'I take ownership of completing my own tasks and achieving targets', 'Core Competencies', '2026-04-17 10:29:50.769677');
INSERT INTO public.competencies VALUES (407, 63, 'Customer service', 'I take pride in building trust and delivering world class service to customers', 'Core Competencies', '2026-04-17 10:29:50.77281');
INSERT INTO public.competencies VALUES (410, 63, 'Intimacy', 'I act as a trusted advisor and make connections on a personal level', 'Core Competencies', '2026-04-17 10:29:50.787336');
INSERT INTO public.competencies VALUES (411, 63, 'Self Orientation', 'I always act in the customers'' best interests', 'Core Competencies', '2026-04-17 10:29:50.79029');
INSERT INTO public.competencies VALUES (461, 63, 'Delivering targets', 'I am accountable for delivering team targets.', 'Core Competencies', '2026-04-17 10:29:51.007448');
INSERT INTO public.competencies VALUES (462, 63, 'Forecasting', 'I predict and deliver team targets and growth.', 'Core Competencies', '2026-04-17 10:29:51.010529');
INSERT INTO public.competencies VALUES (464, 66, 'Accountability', 'I take ownership of completing my own tasks and achieving targets.', 'Core Competencies', '2026-04-17 10:29:51.016847');
INSERT INTO public.competencies VALUES (467, 66, 'Reliability', 'I provide a consistently good recruitment process.', 'Core Competencies', '2026-04-17 10:29:51.024735');
INSERT INTO public.competencies VALUES (468, 66, 'Intimacy', 'I act as a trusted advisor and make connections on a personal level.', 'Core Competencies', '2026-04-17 10:29:51.028189');
INSERT INTO public.competencies VALUES (469, 66, 'Self Orientation', 'I always act in the customers'' best interests', 'Core Competencies', '2026-04-17 10:29:51.03119');
INSERT INTO public.competencies VALUES (521, 66, 'Delivering targets', 'I am accountable for delivering team targets', 'Core Competencies', '2026-04-17 10:29:51.179773');
INSERT INTO public.competencies VALUES (522, 66, 'Forecasting', 'I predict and deliver team targets and growth', 'Core Competencies', '2026-04-17 10:29:51.182506');
INSERT INTO public.competencies VALUES (529, 65, 'Credibility', 'I proactively become a sector expert and truly consult customers', 'Core Competencies', '2026-04-17 10:29:51.201029');
INSERT INTO public.competencies VALUES (530, 65, 'Reliability', 'I provide a consistently good recruitment process', 'Core Competencies', '2026-04-17 10:29:51.203987');
INSERT INTO public.competencies VALUES (531, 65, 'Intimacy', 'I act as a trusted advisor and make connections on a personal level', 'Core Competencies', '2026-04-17 10:29:51.206348');
INSERT INTO public.competencies VALUES (532, 65, 'Self Orientation', 'I always act in the customers'' best interests', 'Core Competencies', '2026-04-17 10:29:51.209082');
INSERT INTO public.competencies VALUES (584, 65, 'Delivering targets', 'I am accountable for delivering team targets', 'Core Competencies', '2026-04-17 10:29:51.351766');
INSERT INTO public.competencies VALUES (590, 68, 'Accountability', 'I take ownership of completing my tasks and consistently achieve targets', 'Core Competencies', '2026-04-17 10:29:51.368512');
INSERT INTO public.competencies VALUES (591, 68, 'Customer service', 'I take pride in building trust and consistently deliver world class service to customers', 'Core Competencies', '2026-04-17 10:29:51.371038');
INSERT INTO public.competencies VALUES (592, 68, 'Credibility', 'I proactively become a sector expert and truly consult customers', 'Core Competencies', '2026-04-17 10:29:51.373745');
INSERT INTO public.competencies VALUES (593, 68, 'Reliability', 'I provide a consistently good recruitment process', 'Core Competencies', '2026-04-17 10:29:51.376165');
INSERT INTO public.competencies VALUES (594, 68, 'Intimacy', 'I act as a trusted advisor and make connections on a personal level', 'Core Competencies', '2026-04-17 10:29:51.379038');
INSERT INTO public.competencies VALUES (595, 68, 'Self Orientation', 'I always act in the customers'' best interests', 'Core Competencies', '2026-04-17 10:29:51.381324');
INSERT INTO public.competencies VALUES (648, 68, 'Forecasting', 'I am able to predict and deliver team targets and growth', 'Core Competencies', '2026-04-17 10:29:51.520786');
INSERT INTO public.competencies VALUES (719, 41, 'Reliability', 'I provide a consistently good recruitment process', 'Core Competencies', '2026-04-17 10:29:51.711307');
INSERT INTO public.competencies VALUES (888, 50, 'Customer service', 'I consistently take pride in building trust and delivering world-class service to customers.', 'Core Competencies', '2026-04-17 10:29:52.142646');
INSERT INTO public.competencies VALUES (647, 68, 'Delivering targets', 'I am accountable for setting performance targets against budgets, linked to YOY growth', 'Core Competencies', '2026-04-17 10:29:51.517799');
INSERT INTO public.competencies VALUES (653, 67, 'Accountability', 'I consistently take ownership of completing my tasks and achieving targets', 'Core Competencies', '2026-04-17 10:29:51.533742');
INSERT INTO public.competencies VALUES (654, 67, 'Customer service', 'I take pride in building trust and consistently deliver world class service to customers', 'Core Competencies', '2026-04-17 10:29:51.536648');
INSERT INTO public.competencies VALUES (658, 67, 'Self Orientation', 'I always act in the customers best interests', 'Core Competencies', '2026-04-17 10:29:51.547923');
INSERT INTO public.competencies VALUES (720, 41, 'Intimacy', 'I act as a trusted advisor and am able to make connections on a personal level', 'Core Competencies', '2026-04-17 10:29:51.713664');
INSERT INTO public.competencies VALUES (889, 50, 'Credibility', 'I proactively become a sector expert and truly consult customers.', 'Core Competencies', '2026-04-17 10:29:52.145947');
INSERT INTO public.competencies VALUES (655, 67, 'Credibility', 'I proactively become a sector expert and truly consult customers', 'Core Competencies', '2026-04-17 10:29:51.539426');
INSERT INTO public.competencies VALUES (656, 67, 'Reliability', 'I provide a consistently good recruitment process', 'Core Competencies', '2026-04-17 10:29:51.542249');
INSERT INTO public.competencies VALUES (657, 67, 'Intimacy', 'I act as a trusted advisor and make connections on a personal level', 'Core Competencies', '2026-04-17 10:29:51.544758');
INSERT INTO public.competencies VALUES (710, 67, 'Delivering targets', 'I am accountable for setting performance targets against budgets, linked to YOY growth', 'Core Competencies', '2026-04-17 10:29:51.687845');
INSERT INTO public.competencies VALUES (711, 67, 'Forecasting', 'I am able to predict and deliver team targets and growth', 'Core Competencies', '2026-04-17 10:29:51.690631');
INSERT INTO public.competencies VALUES (716, 41, 'Accountability', 'I take ownership of completing my own tasks and achieving targets', 'Core Competencies', '2026-04-17 10:29:51.70345');
INSERT INTO public.competencies VALUES (717, 41, 'Customer service', 'I take pride in building trust and delivering world-class service to customers', 'Core Competencies', '2026-04-17 10:29:51.706432');
INSERT INTO public.competencies VALUES (718, 41, 'Credibility', 'I am learning to become a sector expert and truly consult customers', 'Core Competencies', '2026-04-17 10:29:51.708921');
INSERT INTO public.competencies VALUES (721, 41, 'Self orientation', 'I always act in the customers'' best interests', 'Core Competencies', '2026-04-17 10:29:51.716475');
INSERT INTO public.competencies VALUES (740, 42, 'Accountability', 'I take ownership of completing my own tasks and consistently achieve targets', 'Core Competencies', '2026-04-17 10:29:51.768739');
INSERT INTO public.competencies VALUES (741, 42, 'Customer service', 'I take pride in building trust and consistently delivering world class service to customers', 'Core Competencies', '2026-04-17 10:29:51.771197');
INSERT INTO public.competencies VALUES (742, 42, 'Credibility', 'I am learning to become a sector expert and truly consult customers', 'Core Competencies', '2026-04-17 10:29:51.773895');
INSERT INTO public.competencies VALUES (743, 42, 'Reliability', 'I provide a consistently good recruitment process', 'Core Competencies', '2026-04-17 10:29:51.776539');
INSERT INTO public.competencies VALUES (744, 42, 'Intimacy', 'I act as a trusted advisor and make connections on a personal level', 'Core Competencies', '2026-04-17 10:29:51.779745');
INSERT INTO public.competencies VALUES (745, 42, 'Self orientation', 'I always act in the customers'' best interests', 'Core Competencies', '2026-04-17 10:29:51.782249');
INSERT INTO public.competencies VALUES (764, 47, 'Accountability', 'I take ownership of completing my own tasks & consistently achieve targets', 'Core Competencies', '2026-04-17 10:29:51.828623');
INSERT INTO public.competencies VALUES (765, 47, 'Customer service', 'I take pride in building trust & consistently deliver world class service to customers', 'Core Competencies', '2026-04-17 10:29:51.830888');
INSERT INTO public.competencies VALUES (766, 47, 'Credibility', 'I proactively become a sector expert and truly consult customers', 'Core Competencies', '2026-04-17 10:29:51.833666');
INSERT INTO public.competencies VALUES (767, 47, 'Reliability', 'I provide a consistently good recruitment process', 'Core Competencies', '2026-04-17 10:29:51.836178');
INSERT INTO public.competencies VALUES (768, 47, 'Intimacy', 'I act as a trusted advisor and make connections on a personal level', 'Core Competencies', '2026-04-17 10:29:51.838787');
INSERT INTO public.competencies VALUES (769, 47, 'Self Orientation', 'I always act in the customers'' best interests', 'Core Competencies', '2026-04-17 10:29:51.841423');
INSERT INTO public.competencies VALUES (802, 48, 'Accountability', 'I take ownership of completing my own tasks and achieving targets', 'Core Competencies', '2026-04-17 10:29:51.925412');
INSERT INTO public.competencies VALUES (803, 48, 'Customer service', 'I take pride in building trust and delivering world class service to customers', 'Core Competencies', '2026-04-17 10:29:51.927718');
INSERT INTO public.competencies VALUES (804, 48, 'Credibility', 'I proactively become a sector expert and truly consult customers', 'Core Competencies', '2026-04-17 10:29:51.930557');
INSERT INTO public.competencies VALUES (805, 48, 'Reliability', 'I provide a consistently good recruitment process', 'Core Competencies', '2026-04-17 10:29:51.932856');
INSERT INTO public.competencies VALUES (806, 48, 'Intimacy', 'I act as a trusted advisor and make connections on a personal level', 'Core Competencies', '2026-04-17 10:29:51.935798');
INSERT INTO public.competencies VALUES (807, 48, 'Self Orientation', 'I always act in the customers'' best interests', 'Core Competencies', '2026-04-17 10:29:51.937935');
INSERT INTO public.competencies VALUES (840, 49, 'Accountability', 'I take ownership of completing my own tasks and achieving targets.', 'Core Competencies', '2026-04-17 10:29:52.023236');
INSERT INTO public.competencies VALUES (841, 49, 'Customer service', 'I take pride in building trust and delivering world-class service to customers.', 'Core Competencies', '2026-04-17 10:29:52.025521');
INSERT INTO public.competencies VALUES (842, 49, 'Credibility', 'I proactively become a sector expert and truly consult with customers.', 'Core Competencies', '2026-04-17 10:29:52.028461');
INSERT INTO public.competencies VALUES (844, 49, 'Intimacy', 'I act as a trusted advisor and make connections on a personal level.', 'Core Competencies', '2026-04-17 10:29:52.033222');
INSERT INTO public.competencies VALUES (845, 49, 'Self Orientation', 'I always act in the customer''s best interests.', 'Core Competencies', '2026-04-17 10:29:52.036137');
INSERT INTO public.competencies VALUES (884, 49, 'Delivering targets', 'I am accountable for delivering team targets.', 'Core Competencies', '2026-04-17 10:29:52.133034');
INSERT INTO public.competencies VALUES (885, 49, 'Forecasting', 'I predict and deliver team targets and growth.', 'Core Competencies', '2026-04-17 10:29:52.135592');
INSERT INTO public.competencies VALUES (887, 50, 'Accountability', 'I consistently take ownership of completing my own tasks and achieving targets.', 'Core Competencies', '2026-04-17 10:29:52.140501');
INSERT INTO public.competencies VALUES (890, 50, 'Reliability', 'I provide a consistently good recruitment process.', 'Core Competencies', '2026-04-17 10:29:52.148308');
INSERT INTO public.competencies VALUES (938, 51, 'Intimacy', 'I act as a trusted advisor and make connections on a personal level', 'Core Competencies', '2026-04-17 10:29:52.272106');
INSERT INTO public.competencies VALUES (1034, 52, 'Delivering targets', 'I am accountable for delivering team targets', 'Core Competencies', '2026-04-17 10:29:52.521615');
INSERT INTO public.competencies VALUES (1075, 44, 'Reliability', 'I provide a consistently good recruitment process', 'Core Competencies', '2026-04-17 10:30:29.577169');
INSERT INTO public.competencies VALUES (931, 50, 'Delivering targets', 'I am accountable for delivering team targets.', 'Core Competencies', '2026-04-17 10:29:52.249215');
INSERT INTO public.competencies VALUES (932, 50, 'Forecasting', 'I predict and deliver team targets and growth.', 'Core Competencies', '2026-04-17 10:29:52.251875');
INSERT INTO public.competencies VALUES (934, 51, 'Accountability', 'I consistently take ownership of completing my own tasks and achieving targets.', 'Core Competencies', '2026-04-17 10:29:52.261596');
INSERT INTO public.competencies VALUES (935, 51, 'Customer service', 'I consistently take pride in building trust and delivering world class service to customers', 'Core Competencies', '2026-04-17 10:29:52.26419');
INSERT INTO public.competencies VALUES (936, 51, 'Credibility', 'I proactively become a sector expert and truly consult customers', 'Core Competencies', '2026-04-17 10:29:52.267047');
INSERT INTO public.competencies VALUES (937, 51, 'Reliability', 'I consistently provide a good recruitment process', 'Core Competencies', '2026-04-17 10:29:52.269885');
INSERT INTO public.competencies VALUES (939, 51, 'Self Orientation', 'I always act in the customer''s best interests', 'Core Competencies', '2026-04-17 10:29:52.274853');
INSERT INTO public.competencies VALUES (981, 51, 'Delivering targets', 'I am accountable for consistently delivering team targets', 'Core Competencies', '2026-04-17 10:29:52.383606');
INSERT INTO public.competencies VALUES (1035, 52, 'Forecasting', 'I am able to predict and deliver team targets and growth', 'Core Competencies', '2026-04-17 10:29:52.524869');
INSERT INTO public.competencies VALUES (1076, 44, 'Intimacy', 'I act as a trusted advisor and make connections on a personal level', 'Core Competencies', '2026-04-17 10:30:29.579281');
INSERT INTO public.competencies VALUES (982, 51, 'Forecasting', 'I consistently predict and deliver team targets and growth', 'Core Competencies', '2026-04-17 10:29:52.385938');
INSERT INTO public.competencies VALUES (987, 52, 'Accountability', 'I consistently take ownership of completing my own tasks and achieving targets', 'Core Competencies', '2026-04-17 10:29:52.398634');
INSERT INTO public.competencies VALUES (988, 52, 'Customer service', 'I take pride in building trust and consistently deliver world-class service to customers', 'Core Competencies', '2026-04-17 10:29:52.400769');
INSERT INTO public.competencies VALUES (989, 52, 'Credibility', 'I proactively become a sector expert and truly consult customers', 'Core Competencies', '2026-04-17 10:29:52.403718');
INSERT INTO public.competencies VALUES (990, 52, 'Reliability', 'I provide a consistently good recruitment process', 'Core Competencies', '2026-04-17 10:29:52.405937');
INSERT INTO public.competencies VALUES (991, 52, 'Intimacy', 'I act as a trusted advisor and make connections on a personal level', 'Core Competencies', '2026-04-17 10:29:52.408517');
INSERT INTO public.competencies VALUES (992, 52, 'Self Orientation', 'I always act in the customers'' best interests', 'Core Competencies', '2026-04-17 10:29:52.410781');
INSERT INTO public.competencies VALUES (1040, 43, 'Accountability', 'I take ownership of completing my own tasks and consistently achieve targets', 'Core Competencies', '2026-04-17 10:30:29.481867');
INSERT INTO public.competencies VALUES (1041, 43, 'Customer service', 'I take pride in building trust and consistently deliver world-class service to customers', 'Core Competencies', '2026-04-17 10:30:29.484733');
INSERT INTO public.competencies VALUES (1042, 43, 'Credibility', 'I proactively become a sector expert and truly consult customers', 'Core Competencies', '2026-04-17 10:30:29.488345');
INSERT INTO public.competencies VALUES (1044, 43, 'Intimacy', 'I act as a trusted advisor and make connections on a personal level', 'Core Competencies', '2026-04-17 10:30:29.494103');
INSERT INTO public.competencies VALUES (1045, 43, 'Self Orientation', 'I always act in the customer''s best interests', 'Core Competencies', '2026-04-17 10:30:29.497451');
INSERT INTO public.competencies VALUES (1072, 44, 'Accountability', 'I take ownership of completing my own tasks and consistently achieve targets', 'Core Competencies', '2026-04-17 10:30:29.56927');
INSERT INTO public.competencies VALUES (1073, 44, 'Customer service', 'I take pride in building trust and consistently deliver world-class service to customers', 'Core Competencies', '2026-04-17 10:30:29.571512');
INSERT INTO public.competencies VALUES (1074, 44, 'Credibility', 'I proactively become a sector expert and truly consult customers', 'Core Competencies', '2026-04-17 10:30:29.574986');
INSERT INTO public.competencies VALUES (1077, 44, 'Self Orientation', 'I always act in the customer''s best interests', 'Core Competencies', '2026-04-17 10:30:29.582388');
INSERT INTO public.competencies VALUES (1104, 45, 'Accountability', 'I consistently take ownership of completing my own tasks & achieving targets', 'Core Competencies', '2026-04-17 10:30:29.652957');
INSERT INTO public.competencies VALUES (1105, 45, 'Customer service', 'I take pride in building trust & consistently deliver world class service to customers', 'Core Competencies', '2026-04-17 10:30:29.655917');
INSERT INTO public.competencies VALUES (1106, 45, 'Credibility', 'I proactively become a sector expert and truly consult customers', 'Core Competencies', '2026-04-17 10:30:29.658644');
INSERT INTO public.competencies VALUES (1107, 45, 'Reliability', 'I provide a consistently good recruitment process', 'Core Competencies', '2026-04-17 10:30:29.670679');
INSERT INTO public.competencies VALUES (1108, 45, 'Intimacy', 'I act as a trusted advisor and make connections on a personal level', 'Core Competencies', '2026-04-17 10:30:29.673206');
INSERT INTO public.competencies VALUES (1109, 45, 'Self Orientation', 'I always act in the customer''s best interests', 'Core Competencies', '2026-04-17 10:30:29.676791');
INSERT INTO public.competencies VALUES (1142, 46, 'Accountability', 'I take ownership of completing my own tasks & consistently achieve targets', 'Core Competencies', '2026-04-17 10:30:29.762974');
INSERT INTO public.competencies VALUES (1143, 46, 'Customer service', 'I take pride in building trust & consistently deliver world class service to customers', 'Core Competencies', '2026-04-17 10:30:29.76512');
INSERT INTO public.competencies VALUES (1144, 46, 'Credibility', 'I proactively become a sector expert and truly consult customers', 'Core Competencies', '2026-04-17 10:30:29.768044');
INSERT INTO public.competencies VALUES (1145, 46, 'Reliability', 'I provide a consistently good recruitment process', 'Core Competencies', '2026-04-17 10:30:29.771137');
INSERT INTO public.competencies VALUES (1146, 46, 'Intimacy', 'I act as a trusted advisor and make connections on a personal level', 'Core Competencies', '2026-04-17 10:30:29.773326');
INSERT INTO public.competencies VALUES (1147, 46, 'Self Orientation', 'I always act in the customer''s best interests', 'Core Competencies', '2026-04-17 10:30:29.775343');
INSERT INTO public.users VALUES (1, 'Josie Hughes', 'josie.hughes@highfieldps.co.uk', '{admin,manager,employee}', NULL, 'Management', 'Head of People & Performance', NULL, NULL, 'active', '2026-06-15 19:22:57.402757', '2026-06-15 19:22:57.402757', NULL);
INSERT INTO public.users VALUES (2, 'Andrew Collins', 'andrew.collins@highfieldps.co.uk', '{manager,employee}', NULL, 'Data Centre Recruitment', 'Sales Manager', NULL, NULL, 'active', '2026-06-15 19:22:57.416174', '2026-06-15 19:22:57.416174', NULL);
INSERT INTO public.users VALUES (3, 'Harry Mann', 'harry.mann@highfieldps.co.uk', '{employee}', 2, 'Data Centre Recruitment', 'Talent Acquisition Consultant', '2026-04-01', 'in_progress', 'active', '2026-06-15 19:22:57.420602', '2026-06-15 19:22:57.420602', NULL);
INSERT INTO public.users VALUES (4, 'Matt Gilham', 'matt.gilham@highfieldps.co.uk', '{employee}', 2, 'Data Centre Recruitment', 'Recruitment Consultant', NULL, NULL, 'active', '2026-06-15 19:22:57.4262', '2026-06-15 19:22:57.4262', 58);
INSERT INTO public.users VALUES (7, 'Chloe Bennett', 'chloe.bennett@highfieldps.co.uk', '{employee}', 2, 'Data Centre Recruitment', 'Recruitment Consultant', NULL, NULL, 'active', '2026-06-15 20:26:34.088212', '2026-06-15 20:26:34.088212', NULL);
INSERT INTO public.users VALUES (8, 'Tom Westwood', 'tom.westwood@highfieldps.co.uk', '{employee}', 2, 'Technology Recruitment', 'Senior Recruitment Consultant', NULL, NULL, 'active', '2026-06-15 20:26:34.093273', '2026-06-15 20:26:34.093273', 58);
INSERT INTO public.users VALUES (6, 'Jamie Thornton', 'jamie.thornton@highfieldps.co.uk', '{employee}', 2, 'Data Centre Recruitment', 'Trainee Recruitment Consultant', '2026-06-02', NULL, 'active', '2026-06-15 20:26:34.082863', '2026-06-15 20:26:34.082863', 60);
INSERT INTO public.users VALUES (5, 'Kirsty Rossell', 'kirsty.rossell@highfieldps.co.uk', '{employee}', 2, 'Data Centre Recruitment', 'Recruitment Consultant', '2026-04-15', 'in_progress', 'active', '2026-06-15 19:22:57.430355', '2026-06-16 06:56:41.752', NULL);
INSERT INTO public.assessments (user_id, competency_id, role_id, rating, updated_at) VALUES
(6,71,58,'green','2026-07-06 11:00:00'),(6,72,58,'green','2026-07-06 11:00:00'),(6,73,58,'green','2026-07-06 11:00:00'),(6,74,58,'green','2026-07-06 11:00:00'),(6,75,58,'green','2026-07-06 11:00:00'),(6,76,58,'green','2026-07-06 11:00:00'),(6,77,58,'green','2026-07-06 11:00:00'),
(6,80,58,'green','2026-07-06 11:00:00'),(6,81,58,'green','2026-07-06 11:00:00'),(6,82,58,'green','2026-07-06 11:00:00'),(6,83,58,'green','2026-07-06 11:00:00'),(6,84,58,'green','2026-07-06 11:00:00'),(6,85,58,'green','2026-07-06 11:00:00'),(6,86,58,'green','2026-07-06 11:00:00'),
(6,87,58,'green','2026-07-06 11:00:00'),(6,88,58,'green','2026-07-06 11:00:00'),(6,89,58,'green','2026-07-06 11:00:00'),(6,90,58,'green','2026-07-06 11:00:00'),(6,91,58,'green','2026-07-06 11:00:00'),(6,92,58,'green','2026-07-06 11:00:00'),(6,93,58,'green','2026-07-06 11:00:00'),
(6,94,58,'green','2026-07-06 11:00:00'),(6,95,58,'green','2026-07-06 11:00:00'),(6,96,58,'green','2026-07-06 11:00:00'),(6,97,58,'green','2026-07-06 11:00:00'),(6,98,58,'green','2026-07-06 11:00:00'),(6,99,58,'green','2026-07-06 11:00:00'),(6,100,58,'green','2026-07-06 11:00:00'),
(6,101,58,'green','2026-07-06 11:00:00'),(6,102,58,'green','2026-07-06 11:00:00'),(6,103,58,'green','2026-07-06 11:00:00'),(6,104,58,'green','2026-07-06 11:00:00'),(6,105,58,'green','2026-07-06 11:00:00'),(6,106,58,'green','2026-07-06 11:00:00'),(6,107,58,'green','2026-07-06 11:00:00'),
(6,108,58,'green','2026-07-06 11:00:00'),(6,109,58,'green','2026-07-06 11:00:00'),(6,110,58,'green','2026-07-06 11:00:00'),
(6,155,60,'green','2026-07-06 10:00:00'),(6,156,60,'green','2026-07-06 10:00:00'),(6,157,60,'green','2026-07-06 10:00:00'),(6,158,60,'green','2026-07-06 10:00:00'),(6,159,60,'green','2026-07-06 10:00:00'),(6,160,60,'green','2026-07-06 10:00:00'),(6,161,60,'green','2026-07-06 10:00:00'),
(6,164,60,'green','2026-07-06 10:00:00'),(6,165,60,'green','2026-07-06 10:00:00'),(6,166,60,'green','2026-07-06 10:00:00'),(6,167,60,'green','2026-07-06 10:00:00'),(6,168,60,'green','2026-07-06 10:00:00'),(6,169,60,'green','2026-07-06 10:00:00'),(6,170,60,'green','2026-07-06 10:00:00'),
(6,171,60,'green','2026-07-06 10:00:00'),(6,172,60,'green','2026-07-06 10:00:00'),(6,173,60,'green','2026-07-06 10:00:00'),(6,174,60,'green','2026-07-06 10:00:00'),(6,175,60,'green','2026-07-06 10:00:00'),(6,176,60,'green','2026-07-06 10:00:00'),(6,177,60,'green','2026-07-06 10:00:00'),
(6,178,60,'green','2026-07-06 10:00:00'),(6,179,60,'green','2026-07-06 10:00:00'),(6,180,60,'green','2026-07-06 10:00:00'),(6,181,60,'green','2026-07-06 10:00:00'),(6,182,60,'green','2026-07-06 10:00:00'),(6,183,60,'green','2026-07-06 10:00:00'),(6,184,60,'green','2026-07-06 10:00:00'),
(6,185,60,'green','2026-07-06 10:00:00'),(6,186,60,'green','2026-07-06 10:00:00'),(6,187,60,'green','2026-07-06 10:00:00'),(6,188,60,'green','2026-07-06 10:00:00'),(6,189,60,'green','2026-07-06 10:00:00'),(6,190,60,'green','2026-07-06 10:00:00'),(6,191,60,'green','2026-07-06 10:00:00'),
(6,192,60,'green','2026-07-06 10:00:00'),(6,193,60,'green','2026-07-06 10:00:00'),(6,194,60,'green','2026-07-06 10:00:00'),(6,195,60,'green','2026-07-06 10:00:00'),
(8,1,56,'green','2026-07-06 11:00:00'),(8,2,56,'green','2026-07-06 11:00:00'),(8,3,56,'green','2026-07-06 11:00:00'),(8,4,56,'green','2026-07-06 11:00:00'),(8,5,56,'green','2026-07-06 11:00:00'),(8,6,56,'green','2026-07-06 11:00:00'),(8,7,56,'green','2026-07-06 11:00:00'),
(8,9,56,'green','2026-07-06 11:00:00'),(8,10,56,'green','2026-07-06 11:00:00'),(8,11,56,'green','2026-07-06 11:00:00'),(8,12,56,'green','2026-07-06 11:00:00'),(8,13,56,'green','2026-07-06 11:00:00'),(8,14,56,'green','2026-07-06 11:00:00'),(8,15,56,'green','2026-07-06 11:00:00'),
(8,16,56,'green','2026-07-06 11:00:00'),(8,17,56,'green','2026-07-06 11:00:00'),(8,18,56,'green','2026-07-06 11:00:00'),
(8,71,58,'green','2026-07-06 10:00:00'),(8,72,58,'green','2026-07-06 10:00:00'),(8,73,58,'green','2026-07-06 10:00:00'),(8,74,58,'green','2026-07-06 10:00:00'),(8,75,58,'green','2026-07-06 10:00:00'),(8,76,58,'green','2026-07-06 10:00:00'),(8,77,58,'green','2026-07-06 10:00:00'),
(8,80,58,'green','2026-07-06 10:00:00'),(8,81,58,'green','2026-07-06 10:00:00');
INSERT INTO public.financial_progress (target_id, role_id, current_amount, user_id) VALUES
(15, 60, 108000, 6),
(16, 60, 198000, 6);
SELECT pg_catalog.setval('public.career_paths_id_seq', 3, true);
SELECT pg_catalog.setval('public.competencies_id_seq', 1198, true);
SELECT pg_catalog.setval('public.roles_id_seq', 79, true);
SELECT pg_catalog.setval('public.users_id_seq', 11, true);
`;

export async function seedIfEmpty(): Promise<void> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query("SELECT COUNT(*) FROM career_paths");
    if (parseInt(rows[0].count, 10) > 0) {
      logger.info("Database already seeded, skipping.");
      return;
    }
    logger.info("Seeding database with demo data...");
    await client.query(SEED_SQL);
    logger.info("Database seeded successfully.");
  } catch (err) {
    logger.error({ err }, "Failed to seed database");
    throw err;
  } finally {
    client.release();
  }
}

export async function seedDemoProgressV2IfMissing(): Promise<void> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      "SELECT COUNT(*) FROM assessments WHERE user_id IN (3, 4)"
    );
    if (parseInt(rows[0].count, 10) > 0) {
      logger.info("Demo assessment data v2 already present, skipping.");
      return;
    }
    logger.info("Inserting demo career progress data v2 (Matt & Harry)...");
    await client.query(`
      INSERT INTO assessments (user_id, competency_id, role_id, rating, updated_at) VALUES
      (4,1,56,'green','2026-07-06 05:29:47'),(4,2,56,'green','2026-07-06 05:29:43'),(4,3,56,'green','2026-07-06 05:29:44'),(4,4,56,'green','2026-07-06 05:29:43'),(4,5,56,'green','2026-07-06 05:29:46'),(4,6,56,'green','2026-07-06 05:29:45'),(4,7,56,'green','2026-07-06 05:29:49'),
      (4,9,56,'amber','2026-07-06 05:29:51'),(4,10,56,'green','2026-07-06 05:29:54'),(4,11,56,'green','2026-07-06 05:29:51'),(4,12,56,'green','2026-07-06 05:29:52'),(4,13,56,'green','2026-07-06 05:29:53'),(4,14,56,'green','2026-07-06 05:29:15'),(4,15,56,'green','2026-07-06 05:29:19'),
      (4,16,56,'green','2026-07-06 05:29:16'),(4,17,56,'green','2026-07-06 05:29:17'),(4,18,56,'green','2026-07-06 05:29:18'),(4,19,56,'amber','2026-07-06 05:29:27'),(4,20,56,'amber','2026-07-06 05:29:25'),(4,21,56,'green','2026-07-06 05:29:22'),(4,22,56,'green','2026-07-06 05:29:22'),
      (4,23,56,'green','2026-07-06 05:29:26'),(4,24,56,'green','2026-07-06 05:29:30'),(4,25,56,'green','2026-07-06 05:29:29'),(4,26,56,'green','2026-07-06 05:29:20'),(4,27,56,'green','2026-07-06 05:29:25'),(4,28,56,'green','2026-07-06 05:29:28'),(4,29,56,'green','2026-07-06 05:29:31'),
      (4,30,56,'green','2026-07-06 05:29:21'),(4,31,56,'green','2026-07-06 05:29:24'),(4,32,56,'green','2026-07-06 05:29:34'),(4,33,56,'red','2026-07-06 05:29:33'),(4,34,56,'green','2026-07-06 05:29:35'),(4,35,56,'green','2026-07-06 05:29:35'),
      (4,71,58,'amber','2026-07-06 05:30:37'),(4,72,58,'red','2026-07-06 05:30:31'),(4,73,58,'amber','2026-07-06 05:30:33'),(4,74,58,'red','2026-07-06 05:30:32'),(4,75,58,'amber','2026-07-06 05:30:35'),(4,76,58,'amber','2026-07-06 05:30:34'),(4,77,58,'amber','2026-07-06 05:30:37'),
      (4,80,58,'green','2026-07-06 05:30:48'),(4,81,58,'amber','2026-07-06 05:30:53'),(4,82,58,'green','2026-07-06 05:30:50'),(4,83,58,'amber','2026-07-06 05:30:51'),(4,84,58,'amber','2026-07-06 05:30:52'),(4,85,58,'green','2026-07-06 05:30:49'),(4,86,58,'amber','2026-07-06 05:30:09'),
      (4,87,58,'red','2026-07-06 05:30:12'),(4,88,58,'amber','2026-07-06 05:30:10'),(4,89,58,'amber','2026-07-06 05:30:11'),(4,90,58,'red','2026-07-06 05:30:14'),(4,91,58,'green','2026-07-06 05:30:23'),(4,92,58,'green','2026-07-06 05:30:19'),(4,93,58,'green','2026-07-06 05:30:17'),
      (4,94,58,'green','2026-07-06 05:30:18'),(4,95,58,'green','2026-07-06 05:30:21'),(4,96,58,'green','2026-07-06 05:30:24'),(4,97,58,'green','2026-07-06 05:30:25'),(4,98,58,'green','2026-07-06 05:30:16'),(4,99,58,'green','2026-07-06 05:30:20'),(4,100,58,'green','2026-07-06 05:30:23'),
      (4,101,58,'green','2026-07-06 05:30:26'),(4,102,58,'green','2026-07-06 05:30:16'),(4,103,58,'green','2026-07-06 05:30:19'),(4,104,58,'amber','2026-07-06 05:30:28'),(4,105,58,'green','2026-07-06 05:30:27'),(4,106,58,'amber','2026-07-06 05:30:29'),(4,107,58,'amber','2026-07-06 05:30:29'),
      (4,108,58,'green','2026-07-06 05:30:55'),(4,109,58,'green','2026-07-06 05:30:57'),(4,110,58,'amber','2026-07-06 05:30:59'),(4,111,58,'green','2026-07-06 05:30:56'),(4,112,58,'amber','2026-07-06 05:30:58'),
      (3,727,41,'red','2026-06-15 19:37:13'),(3,728,41,'green','2026-06-15 19:37:16'),(3,729,41,'green','2026-06-15 19:37:12'),(3,730,41,'green','2026-06-15 19:37:14'),(3,731,41,'green','2026-06-15 19:37:15'),(3,733,41,'amber','2026-06-15 19:37:54'),(3,734,41,'red','2026-06-15 19:37:52'),(3,735,41,'amber','2026-06-15 19:37:53'),(3,736,41,'red','2026-06-15 19:37:56');
      INSERT INTO financial_progress (target_id, role_id, current_amount, user_id) VALUES (11, 58, 80000, 4);
    `);
    logger.info("Demo career progress data v2 inserted successfully.");
  } catch (err) {
    logger.error({ err }, "Failed to insert demo progress data v2");
    throw err;
  } finally {
    client.release();
  }
}

export async function seedManagerPortalDataIfMissing(): Promise<void> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query("SELECT COUNT(*) FROM probation_items");
    if (parseInt(rows[0].count, 10) > 0) {
      logger.info("Manager portal demo data already present, skipping.");
      return;
    }
    logger.info("Seeding manager portal demo data...");
    await client.query(`
      -- Teams
      INSERT INTO teams (id, name, status) VALUES
      (1, 'US Perm', 'active')
      ON CONFLICT (id) DO NOTHING;
      SELECT setval('teams_id_seq', GREATEST((SELECT MAX(id) FROM teams), 1));

      -- Financial targets (for role-level billing benchmarks used in career tracker)
      INSERT INTO financial_targets (id, role_id, label, target_amount, period_label, option_group, sort_order) VALUES
      (1,  44, 'Average weekly billings over 8 weeks',   3000,  '8-week average',  '',  0),
      (2,  57, 'Average weekly billings over 8 weeks',   3000,  '8-week average',  '',  0),
      (3,  46, 'Average weekly billings over 13 weeks',  5000,  '13-week average', '',  0),
      (4,  59, 'Average weekly billings over 13 weeks',  5000,  '13-week average', '',  0),
      (5,  48, 'Average weekly billings over 13 weeks',  7000,  '13-week average', '',  0),
      (6,  61, 'Average weekly billings over 13 weeks',  7000,  '13-week average', '',  0),
      (7,  54, 'Average weekly billings over 13 weeks',  10000, '13-week average', '',  0),
      (8,  67, 'Average weekly billings over 13 weeks',  10000, '13-week average', '',  0),
      (9,  43, 'Total billed in 6 months',               80000, '6 months',        '1', 0),
      (10, 43, 'Total billed in 12 months',              150000,'12 months',        '1', 1),
      (11, 58, 'Total billed in 6 months',               80000, '6 months',        '1', 0),
      (12, 58, 'Total billed in 12 months',              150000,'12 months',        '1', 1),
      (13, 45, 'Total billed in 6 months',               120000,'6 months',        '1', 0),
      (14, 45, 'Total billed in 12 months',              220000,'12 months',        '1', 1),
      (15, 60, 'Total billed in 6 months',               120000,'6 months',        '1', 0),
      (16, 60, 'Total billed in 12 months',              220000,'12 months',        '1', 1),
      (17, 47, 'Total billed in 12 months',              250000,'12 months',        '',  0),
      (18, 62, 'Total billed in 12 months',              250000,'12 months',        '',  0),
      (19, 53, 'Total billed in 12 months',              400000,'12 months',        '',  0),
      (20, 68, 'Total billed in 12 months',              400000,'12 months',        '',  0)
      ON CONFLICT (id) DO NOTHING;
      SELECT setval('financial_targets_id_seq', GREATEST((SELECT MAX(id) FROM financial_targets), 20));

      -- Probation review items (the questions/sections used in all probation reviews)
      INSERT INTO probation_items (id, section, section_order, item_text, item_order, rating_type) VALUES
      (1,  'Skills',                1, 'Can use core systems and tools required for the role at a basic, functional level',      1, 'yes_no_progress'),
      (2,  'Skills',                1, 'Is able to log accurate, appropriate information on Bullhorn and other company systems', 2, 'yes_no_progress'),
      (3,  'Skills',                1, 'Demonstrates basic role competence required to operate safely and effectively',          3, 'yes_no_progress'),
      (4,  'Skills',                1, 'Follows agreed ways of working and Highfield / DataX / Data Exec way of working',       4, 'yes_no_progress'),
      (5,  'Behaviours',            2, 'Can demonstrate professional conduct at work',                                          1, 'yes_no_progress'),
      (6,  'Behaviours',            2, 'Displays a constructive and respectful attitude',                                       2, 'yes_no_progress'),
      (7,  'Behaviours',            2, 'Engages appropriately with feedback and guidance',                                      3, 'yes_no_progress'),
      (8,  'Behaviours',            2, 'Shows willingness to learn and improve',                                                4, 'yes_no_progress'),
      (9,  'Knowledge',             3, 'Has a basic understanding of the role and the recruitment lifecycle',                   1, 'yes_no_progress'),
      (10, 'Knowledge',             3, 'Demonstrates developing awareness of their sector and market',                          2, 'yes_no_progress'),
      (11, 'Knowledge',             3, 'Understands what is expected of them in the role',                                      3, 'yes_no_progress'),
      (12, 'Activity',              4, 'Activity levels broadly align to expectations for the stage of their role',             1, 'yes_no_progress'),
      (13, 'Activity',              4, 'Demonstrates consistent effort and application',                                        2, 'yes_no_progress'),
      (14, 'Activity',              4, 'Is engaging with required activity rather than avoiding it',                            3, 'yes_no_progress'),
      (15, 'Financial Awareness',   5, 'Understands how individual activity contributes to revenue',                            1, 'yes_no_progress'),
      (16, 'Financial Awareness',   5, 'Is developing commercial awareness appropriate to probation stage',                     2, 'yes_no_progress'),
      (17, 'Behaviour and Conduct', 6, 'Behaviours are aligned to company standards',                                          1, 'yes_no_progress'),
      (18, 'Behaviour and Conduct', 6, 'No conduct or behavioural concerns identified',                                        2, 'yes_no_progress'),
      (19, 'Values',                7, 'Driven',       1, 'values_rating'),
      (20, 'Values',                7, 'Disciplined',  2, 'values_rating'),
      (21, 'Values',                7, 'Competitive',  3, 'values_rating'),
      (22, 'Values',                7, 'Committed',    4, 'values_rating'),
      (23, 'Values',                7, 'Positive',     5, 'values_rating'),
      (24, 'Values',                7, 'Resilient',    6, 'values_rating')
      ON CONFLICT (id) DO NOTHING;
      SELECT setval('probation_items_id_seq', GREATEST((SELECT MAX(id) FROM probation_items), 24));

      -- Probation manager reviews — Harry Mann (user 3): Month 1 (published) + Month 3 (draft)
      INSERT INTO probation_manager_reviews (id, user_id, review_period, going_well, development_areas, review_status, review_date, published_at, created_at, updated_at) VALUES
      (5, 3, 'month1',
        'Harry has made a really positive start to his probation. He has quickly adapted to core systems and consistently demonstrates professional conduct. His willingness to learn and positive attitude to feedback are real strengths — he is already building solid candidate relationships across the team.',
        'Harry should focus on building his sector knowledge and commercial awareness over the coming weeks. We have agreed he will shadow two BD calls per week and read the weekly DataX market briefings to accelerate his understanding of the data centre space.',
        'on_track', '2026-05-05', '2026-05-06 09:00:00', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (6, 3, 'month3',
        'Harry continues to impress. His activity levels are consistently strong and he has built excellent candidate relationships across the data centre and tech infrastructure market. His sector knowledge has improved significantly since Month 1 — he is asking the right questions and really engaging with the market.',
        'Harry now needs to start converting more of his BD activity into live roles. We will work together on objection handling and how to tailor his pitch to different client profiles. Key focus before Month 6: secure at least one PSL or retained assignment.',
        'on_track', '2026-06-16', NULL, '2026-06-15 19:22:57', '2026-06-15 19:22:57')
      ON CONFLICT (id) DO NOTHING;
      SELECT setval('probation_manager_reviews_id_seq', GREATEST((SELECT MAX(id) FROM probation_manager_reviews), 6));

      -- Probation self-reflections
      INSERT INTO probation_reflections (id, user_id, review_period, went_well, learned, more_support, focus_next, confidence, created_at, updated_at) VALUES
      (4, 3, 'month1',
        'I really enjoyed getting to grips with Bullhorn and the team''s way of working. The shadowing sessions with senior consultants have been really helpful — I feel much more confident on the phone than I did on day one.',
        'I''ve learned a lot about the data centre and tech infrastructure market from the weekly briefings and the team. I now have a much better understanding of the types of roles clients are typically looking to fill.',
        'I would like more guidance on how to structure my BD emails and initial client calls. I sometimes struggle to know how to open a conversation with a new client.',
        'Focus on increasing my BD activity and converting more conversations into at least expressions of interest before the Month 3 review.',
        'amber', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (5, 3, 'month3',
        'My activity levels have been consistently high and I have built some strong candidate relationships. I have also started to have some really productive BD conversations that I think could turn into live roles.',
        'How to tailor my approach to different types of candidates and clients. I am getting much better at identifying when someone is the right fit for a role, and when to push hard for an interview.',
        'I would benefit from more practice on handling objections from clients, particularly around preferred supplier lists and exclusivity arrangements.',
        'Convert at least one BD conversation into a live role before Month 6, and continue building market knowledge through the DataX reports.',
        'green', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (6, 5, 'month1',
        'Really enjoyed getting stuck in. Picked up the systems quickly and feel comfortable with the day-to-day process.',
        'The full recruitment lifecycle end-to-end. The team have been really supportive.',
        'More guidance on BD cold outreach — I am not sure how to approach new clients yet.',
        'Start building my BD call list and make at least 5 new client approaches before Month 3.',
        'green', '2026-06-15 20:26:34', '2026-06-16 06:57:29')
      ON CONFLICT (id) DO NOTHING;
      SELECT setval('probation_reflections_id_seq', GREATEST((SELECT MAX(id) FROM probation_reflections), 6));

      -- Probation agreed actions
      INSERT INTO probation_actions (id, user_id, review_period, action_text, status, created_at, updated_at) VALUES
      (3, 3, 'month1', 'Shadow 2 BD calls per week with senior consultants',          'complete',     '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (4, 3, 'month1', 'Read the weekly DataX market briefings',                      'complete',     '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (5, 3, 'month1', 'Build a target client list of 20 data centre companies',      'in_progress',  '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (6, 3, 'month3', 'Deliver tailored BD pitches to 5 new target clients',         'in_progress',  '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (7, 3, 'month3', 'Complete sector mapping for top 10 target accounts',          'not_started',  '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (8, 3, 'month3', 'Attend a data centre networking event before Month 6 review', 'not_started',  '2026-06-15 19:22:57', '2026-06-15 19:22:57')
      ON CONFLICT (id) DO NOTHING;
      SELECT setval('probation_actions_id_seq', GREATEST((SELECT MAX(id) FROM probation_actions), 8));

      -- Probation item assessments — Harry Mann (user 3) Month 1 + Month 3, Kirsty Rossell (user 5) Month 1
      INSERT INTO probation_assessments (id, user_id, item_id, rating, note, manager_rating, manager_comment, review_period, created_at, updated_at) VALUES
      -- Harry Month 1
      (20, 3,  1, 'yes',         '',                                                                       'yes',         '',                                                                                                         'month1', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (21, 3,  2, 'yes',         '',                                                                       'yes',         '',                                                                                                         'month1', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (22, 3,  3, 'in_progress', 'Getting better but still building confidence in complex tasks.',          'in_progress', 'Developing well — benefits from shadowing senior consultants for more complex situations.',                  'month1', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (23, 3,  4, 'yes',         '',                                                                       'yes',         '',                                                                                                         'month1', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (24, 3,  5, 'yes',         '',                                                                       'yes',         '',                                                                                                         'month1', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (25, 3,  6, 'yes',         '',                                                                       'yes',         '',                                                                                                         'month1', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (26, 3,  7, 'yes',         '',                                                                       'yes',         '',                                                                                                         'month1', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (27, 3,  8, 'yes',         '',                                                                       'yes',         '',                                                                                                         'month1', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (28, 3,  9, 'in_progress', '',                                                                       'in_progress', '',                                                                                                         'month1', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (29, 3, 10, 'in_progress', 'Reading the weekly briefings to build sector knowledge.',                'in_progress', 'Market awareness is growing — asks good questions in team meetings.',                                       'month1', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (30, 3, 11, 'yes',         '',                                                                       'yes',         '',                                                                                                         'month1', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (31, 3, 12, 'yes',         '',                                                                       'yes',         '',                                                                                                         'month1', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (32, 3, 13, 'yes',         '',                                                                       'yes',         '',                                                                                                         'month1', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (33, 3, 14, 'yes',         '',                                                                       'yes',         '',                                                                                                         'month1', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (34, 3, 15, 'in_progress', '',                                                                       'in_progress', '',                                                                                                         'month1', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (35, 3, 16, 'in_progress', '',                                                                       'in_progress', '',                                                                                                         'month1', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (36, 3, 17, 'yes',         '',                                                                       'yes',         '',                                                                                                         'month1', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (37, 3, 18, 'yes',         '',                                                                       'yes',         '',                                                                                                         'month1', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (38, 3, 19, 'most',        '',                                                                       'most',        '',                                                                                                         'month1', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (39, 3, 20, 'most',        '',                                                                       'most',        '',                                                                                                         'month1', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (40, 3, 21, 'some',        '',                                                                       'some',        '',                                                                                                         'month1', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (41, 3, 22, 'most',        '',                                                                       'most',        '',                                                                                                         'month1', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (42, 3, 23, 'most',        '',                                                                       'most',        '',                                                                                                         'month1', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (43, 3, 24, 'most',        '',                                                                       'most',        '',                                                                                                         'month1', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      -- Harry Month 3
      (44, 3,  1, 'yes',         'Comfortable with all systems now, including SourceWhale.',               'yes',         'Strong progress — using systems effectively and efficiently.',                                              'month3', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (45, 3,  2, 'yes',         '',                                                                       'yes',         '',                                                                                                         'month3', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (46, 3,  3, 'yes',         'Had some really productive BD calls this month.',                        '',            '',                                                                                                         'month3', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (47, 3,  4, 'yes',         '',                                                                       '',            '',                                                                                                         'month3', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (48, 3,  5, 'yes',         '',                                                                       'yes',         '',                                                                                                         'month3', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (49, 3,  6, 'yes',         '',                                                                       '',            '',                                                                                                         'month3', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (50, 3,  7, 'yes',         '',                                                                       '',            '',                                                                                                         'month3', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (51, 3,  8, 'yes',         '',                                                                       '',            '',                                                                                                         'month3', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (52, 3,  9, 'yes',         '',                                                                       'yes',         'Has a solid understanding of the full recruitment lifecycle now.',                                          'month3', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (53, 3, 10, 'in_progress', 'Still learning — following sector news and DataX reports weekly.',       'in_progress', 'Showing real improvement. Continue with the DataX reports and add key sector LinkedIn follows.',            'month3', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (54, 3, 11, 'yes',         '',                                                                       '',            '',                                                                                                         'month3', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (55, 3, 12, 'yes',         '',                                                                       '',            '',                                                                                                         'month3', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (56, 3, 13, 'yes',         '',                                                                       '',            '',                                                                                                         'month3', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (57, 3, 14, 'yes',         '',                                                                       '',            '',                                                                                                         'month3', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (58, 3, 15, 'in_progress', '',                                                                       '',            '',                                                                                                         'month3', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (59, 3, 16, 'yes',         '',                                                                       '',            '',                                                                                                         'month3', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (60, 3, 17, 'yes',         '',                                                                       '',            '',                                                                                                         'month3', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (61, 3, 18, 'yes',         '',                                                                       '',            '',                                                                                                         'month3', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (62, 3, 19, 'most',        '',                                                                       'most',        'Harry consistently demonstrates a driven attitude — proactively seeks out new opportunities.',             'month3', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (63, 3, 20, 'most',        '',                                                                       '',            '',                                                                                                         'month3', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (64, 3, 21, 'most',        '',                                                                       '',            '',                                                                                                         'month3', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (65, 3, 22, 'most',        '',                                                                       '',            '',                                                                                                         'month3', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (66, 3, 23, 'most',        '',                                                                       '',            '',                                                                                                         'month3', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      (67, 3, 24, 'most',        '',                                                                       '',            '',                                                                                                         'month3', '2026-06-15 19:22:57', '2026-06-15 19:22:57'),
      -- Kirsty Month 1
      (68, 5,  1, 'yes',         '', '', '', 'month1', '2026-06-15 20:26:34', '2026-06-15 20:26:34'),
      (69, 5,  2, 'yes',         '', '', '', 'month1', '2026-06-15 20:26:34', '2026-06-15 20:26:34'),
      (70, 5,  3, 'yes',         '', '', '', 'month1', '2026-06-15 20:26:34', '2026-06-15 20:26:34'),
      (71, 5,  4, 'yes',         '', '', '', 'month1', '2026-06-15 20:26:34', '2026-06-15 20:26:34'),
      (72, 5,  5, 'yes',         '', '', '', 'month1', '2026-06-15 20:26:34', '2026-06-15 20:26:34'),
      (73, 5,  6, 'yes',         '', '', '', 'month1', '2026-06-15 20:26:34', '2026-06-15 20:26:34'),
      (74, 5,  7, 'yes',         '', '', '', 'month1', '2026-06-15 20:26:34', '2026-06-15 20:26:34'),
      (75, 5,  8, 'yes',         '', '', '', 'month1', '2026-06-15 20:26:34', '2026-06-15 20:26:34'),
      (76, 5,  9, 'yes',         '', '', '', 'month1', '2026-06-15 20:26:34', '2026-06-15 20:26:34'),
      (77, 5, 10, 'in_progress', 'Still building sector knowledge.', '', '', 'month1', '2026-06-15 20:26:34', '2026-06-15 20:26:34'),
      (78, 5, 11, 'yes',         '', '', '', 'month1', '2026-06-15 20:26:34', '2026-06-15 20:26:34'),
      (79, 5, 12, 'yes',         '', '', '', 'month1', '2026-06-15 20:26:34', '2026-06-15 20:26:34'),
      (80, 5, 13, 'yes',         '', '', '', 'month1', '2026-06-15 20:26:34', '2026-06-15 20:26:34'),
      (81, 5, 14, 'yes',         '', '', '', 'month1', '2026-06-15 20:26:34', '2026-06-15 20:26:34'),
      (82, 5, 15, 'in_progress', '', '', '', 'month1', '2026-06-15 20:26:34', '2026-06-15 20:26:34'),
      (83, 5, 16, 'yes',         '', '', '', 'month1', '2026-06-15 20:26:34', '2026-06-15 20:26:34'),
      (84, 5, 17, 'yes',         '', '', '', 'month1', '2026-06-15 20:26:34', '2026-06-15 20:26:34'),
      (85, 5, 18, 'yes',         '', '', '', 'month1', '2026-06-15 20:26:34', '2026-06-15 20:26:34'),
      (86, 5, 19, 'most',        '', '', '', 'month1', '2026-06-15 20:26:34', '2026-06-15 20:26:34'),
      (87, 5, 20, 'most',        '', '', '', 'month1', '2026-06-15 20:26:34', '2026-06-15 20:26:34'),
      (88, 5, 21, 'most',        '', '', '', 'month1', '2026-06-15 20:26:34', '2026-06-15 20:26:34'),
      (89, 5, 22, 'most',        '', '', '', 'month1', '2026-06-15 20:26:34', '2026-06-15 20:26:34'),
      (90, 5, 23, 'most',        '', '', '', 'month1', '2026-06-15 20:26:34', '2026-06-15 20:26:34'),
      (91, 5, 24, 'most',        '', '', '', 'month1', '2026-06-15 20:26:34', '2026-06-15 20:26:34')
      ON CONFLICT (id) DO NOTHING;
      SELECT setval('probation_assessments_id_seq', GREATEST((SELECT MAX(id) FROM probation_assessments), 91));
    `);
    logger.info("Manager portal demo data seeded successfully.");
  } catch (err) {
    logger.error({ err }, "Failed to seed manager portal demo data");
    throw err;
  } finally {
    client.release();
  }
}

export async function seedLdDemoDataIfMissing(): Promise<void> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query("SELECT COUNT(*) FROM learning_log_entries");
    if (parseInt(rows[0].count, 10) > 0) {
      logger.info("L&D demo data already present, skipping.");
      return;
    }
    logger.info("Seeding L&D demo data...");
    await client.query(`
      -- L&D users (ids 12-15)
      INSERT INTO users (id, name, email, job_title, department, is_active, roles, manager_id) VALUES
      (12, 'Emily Amos',        NULL, 'Learning & Development Manager',     'People & Culture', 'active', ARRAY['ld','employee'], NULL),
      (13, 'Rhonda D''Ambrosio',NULL, 'L&D Business Partner',               'People & Culture', 'active', ARRAY['ld','employee'], NULL),
      (14, 'Claire Proudlove',  NULL, 'Training & Development Coordinator', 'People & Culture', 'active', ARRAY['ld','employee'], NULL),
      (15, 'Derek Goff',        NULL, 'L&D Consultant',                     'People & Culture', 'active', ARRAY['ld','employee'], NULL)
      ON CONFLICT (id) DO NOTHING;

      SELECT setval('users_id_seq', GREATEST((SELECT MAX(id) FROM users), 15));

      -- Manager logins for user 1 and 2
      INSERT INTO manager_logins (user_id, prev_login_at, last_login_at) VALUES
      (1, '2026-08-03 20:58:25.914547', '2026-08-09 20:58:25.914547'),
      (2, '2026-08-03 20:58:25.914547', '2026-08-09 20:58:25.914547')
      ON CONFLICT (user_id) DO NOTHING;

      -- Learning log entries (all 17)
      INSERT INTO learning_log_entries (id, user_id, training, date_of_learning, delivered_by, what_did_i_learn, further_training_needed, created_at) VALUES
      (1,  3, 'LinkedIn Recruiter Advanced Search',          '2026-05-14', 'Internal L&D',
        'Learned to use Boolean search strings and filters to build targeted talent pipelines. Explored saving searches and setting up automated alerts for passive candidates.',
        'Would benefit from a session on LinkedIn InMail best practices and response rate optimisation.', '2026-05-15 20:59:07'),
      (2,  3, 'Structured Interviewing & Competency Frameworks', '2026-06-03', 'Josie Hughes',
        'Covered how to design competency-based questions aligned to role requirements. Practiced scoring candidate responses using the STAR method consistently.',
        'None at this stage — will apply framework on next round of client interviews.', '2026-06-04 20:59:07'),
      (3,  4, 'Business Development & Client Outreach',      '2026-05-20', 'Andrew Collins',
        'Covered warm calling techniques, handling objections, and structuring a first client meeting. Discussed how to identify decision-makers on LinkedIn and craft personalised outreach messages.',
        'Would like a session on pitch decks and presenting the agency value proposition to new clients.', '2026-05-21 20:59:07'),
      (4,  4, 'Salary Benchmarking & Market Data',           '2026-06-18', 'Internal L&D',
        'Used industry salary surveys and competitor data to set realistic salary bands for active roles. Learned how to present market data to candidates and clients to manage expectations.',
        '', '2026-06-19 20:59:07'),
      (5,  5, 'Candidate Experience & Retention',            '2026-05-08', 'Josie Hughes',
        'Explored the candidate journey from first contact to placement and beyond. Identified key touchpoints where candidate experience can be improved — especially post-offer communication.',
        'Follow-up session on NPS measurement for candidates would be useful.', '2026-05-09 20:59:07'),
      (6,  5, 'Employment Law Essentials for Recruiters',    '2026-07-01', 'External Trainer — Peninsula HR',
        'Covered key legislation including the Equality Act 2010, IR35 rules for contractors, and GDPR requirements for storing candidate data. Discussed what constitutes a discriminatory job advert.',
        'Would like a refresher on IR35 specifically as it affects several of our current contractor placements.', '2026-07-02 20:59:07'),
      (7,  6, 'Introduction to the Recruitment Lifecycle',   '2026-06-10', 'Andrew Collins',
        'Walked through the end-to-end recruitment process: taking a job brief, sourcing, screening, shortlisting, interview management, and offer. Understood how each stage impacts the next.',
        'Need to shadow at least two full client meetings before handling independently.', '2026-06-11 20:59:07'),
      (8,  6, 'CV Screening & Candidate Assessment',         '2026-07-08', 'Harry Mann',
        'Learned how to quickly assess CVs against a job brief, identify transferable skills, and flag red flags. Practiced screening 10 real CVs and received feedback on my shortlist decisions.',
        'Would like more practice on telephone screening — found it harder than CV screening.', '2026-07-09 20:59:07'),
      (9,  7, 'Account Management & Client Relationships',   '2026-05-27', 'Andrew Collins',
        'Discussed how to transition from transactional recruitment to becoming a trusted advisor. Covered regular client contact plans, QBRs, and identifying cross-sell opportunities within existing accounts.',
        '', '2026-05-28 20:59:07'),
      (10, 7, 'Negotiation Skills for Recruiters',           '2026-06-25', 'External Trainer — Huthwaite International',
        'Covered principled negotiation, understanding both parties'' positions and best alternatives, and how to handle salary counteroffers. Practiced live negotiation scenarios with a partner.',
        'None — the external trainer was excellent and the content was comprehensive.', '2026-06-26 20:59:07'),
      (11, 8, 'Managing a Desk & Hitting Targets',           '2026-04-22', 'Andrew Collins',
        'Reviewed pipeline management, activity metrics, and how to prioritise a busy desk during competing deadlines. Discussed how to forecast billings accurately and communicate risks early.',
        '', '2026-04-23 20:59:07'),
      (12, 8, 'Mentoring & Developing Junior Consultants',   '2026-06-30', 'Josie Hughes',
        'Covered the role of an informal mentor, how to give constructive feedback, and how to set development goals with junior team members. Discussed how to balance mentoring with personal billing targets.',
        'Would value a session on coaching methodology — currently using a more directive style.', '2026-07-01 20:59:07'),
      (13, 6, 'Telephone Screening Techniques',              '2026-08-06', 'Kirsty Rossell',
        'Practised telephone screening calls with role plays. Learned how to quickly build rapport, ask concise qualifying questions, and assess enthusiasm and communication skills in under 15 minutes. Took notes on how to structure post-call summaries for clients.',
        'Want to do a live call with a senior consultant present to get real-time feedback.', '2026-08-06 20:59:07'),
      (14, 4, 'Writing Compelling Job Adverts',              '2026-08-07', 'Josie Hughes',
        'Reviewed the difference between a job description and a job advert. Learned how to write benefit-led copy, use inclusive language, and structure adverts to improve application rates. Rewrote two live adverts during the session and saw immediate improvement.',
        '', '2026-08-07 20:59:07'),
      (15, 8, 'AI Tools in Recruitment: Practical Applications', '2026-08-07', 'External Webinar — RecTech Summit',
        'Explored how AI tools are being used for sourcing, outreach personalisation, and candidate screening. Discussed ethical considerations and the risk of bias in automated screening. Hands-on demo of two platforms.',
        'Would like budget approval to trial one of the AI sourcing tools for 30 days.', '2026-08-07 20:59:07'),
      (16, 5, 'GDPR Refresher for Recruitment Teams',        '2026-08-08', 'External Trainer — Peninsula HR',
        'Annual refresher covering data retention policies, subject access requests, and lawful basis for processing candidate data. Updated on recent ICO guidance relevant to recruitment databases. Reviewed our internal privacy notices.',
        'Team should review our candidate database for records older than 2 years that need purging.', '2026-08-08 20:59:07'),
      (17, 3, 'Closing Techniques & Overcoming Candidate Hesitation', '2026-08-08', 'Tom Westwood',
        'Worked through common reasons candidates stall at offer stage — competing offers, counter-offers, cold feet. Learned how to identify hesitation early in the process and address concerns before they become blockers. Practised close conversations with Tom.',
        'None — excellent session. Will start applying the pre-close technique immediately.', '2026-08-08 20:59:07')
      ON CONFLICT (id) DO NOTHING;

      SELECT setval('learning_log_entries_id_seq', GREATEST((SELECT MAX(id) FROM learning_log_entries), 17));

      -- Company training sessions
      INSERT INTO company_learning_entries (id, title, date_of_learning, trainer, description) VALUES
      (1, 'Trust Equation',    '03/03/26', 'Emily Amos',
        'An exploration of the Trust Equation framework (Credibility + Reliability + Intimacy / Self-Orientation) and how it applies to building stronger client and candidate relationships in recruitment. The session covered practical ways to increase each component of the equation and how to identify where trust may be breaking down in a relationship.'),
      (2, 'Recruiter Insider', '03/03/26', 'Emily Amos',
        'An interactive session drawing on real-world recruiter experiences to explore what separates good consultants from great ones. Topics included market positioning, building a personal brand as a recruiter, managing high-pressure pipelines, and how to use insight and data to add genuine value to clients and candidates alike.')
      ON CONFLICT (id) DO NOTHING;

      SELECT setval('company_learning_entries_id_seq', GREATEST((SELECT MAX(id) FROM company_learning_entries), 2));

      -- Individual feedback entries
      INSERT INTO ld_feedback (id, user_id, author_name, title, content, feedback_date, send_to_manager, send_to_individual) VALUES
      (2, 3, 'Emily Amos', 'Q2 Performance Review',
        'Harry has shown excellent progress in his sourcing techniques this quarter. His Boolean search skills have noticeably improved and he is building strong candidate pipelines consistently. He would benefit from working on his client communication confidence — recommend pairing him with a senior consultant for joint client calls over the next 4 weeks.',
        '15/07/26', true, false),
      (3, 4, 'Emily Amos', 'Onboarding Check-In — 3 Months',
        'Matt has settled in well and is showing real commercial awareness for someone at his stage. His activity metrics are strong. Main development area is structured follow-up with candidates post-interview. Recommend a session on pipeline discipline in Q3.',
        '20/06/26', false, false),
      (4, 5, 'Derek Goff', 'Compliance Training Review',
        'Kirsty completed all mandatory compliance modules on time and scored above average on the GDPR assessment. She asked thoughtful questions during the employment law session which shows good engagement with the content. No further training required at this stage.',
        '05/07/26', false, false),
      (5, 6, 'Emily Amos', 'Probation Mid-Point Feedback',
        'Jamie is progressing well for a trainee. CV screening accuracy has improved markedly since the July session. He is proactive in asking for guidance which is a great attitude. Focus for H2 is building telephone confidence — would like to see him lead 3 candidate screening calls independently by end of September.',
        '10/08/26', true, true),
      (6, 7, 'Derek Goff', 'Negotiation Skills Follow-Up',
        'Chloe applied the principled negotiation framework effectively on her last two placements. Both resulted in accepted offers with no counter-offer complications. Strong performance — ready to take on more complex salary negotiation scenarios. Suggest enrolling in the advanced salary benchmarking workshop in Q4.',
        '02/08/26', false, false),
      (7, 8, 'Emily Amos', 'Mentoring Programme Assessment',
        'Tom has demonstrated genuine coaching aptitude in his informal mentoring of junior team members. His feedback to them is constructive and well-framed. As discussed, enrolling him in the formal coaching methodology programme in September will help him build on this natural strength and provide a more structured approach.',
        '28/07/26', true, false)
      ON CONFLICT (id) DO NOTHING;

      SELECT setval('ld_feedback_id_seq', GREATEST((SELECT MAX(id) FROM ld_feedback), 7));
    `);
    logger.info("L&D demo data seeded successfully.");
  } catch (err) {
    logger.error({ err }, "Failed to seed L&D demo data");
    throw err;
  } finally {
    client.release();
  }
}

export async function seedDemoProgressIfMissing(): Promise<void> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      "SELECT COUNT(*) FROM assessments WHERE user_id IN (6, 8)"
    );
    if (parseInt(rows[0].count, 10) > 0) {
      logger.info("Demo assessment data already present, skipping.");
      return;
    }
    logger.info("Inserting demo career progress data...");
    await client.query(`
      UPDATE users SET target_role_id = 60 WHERE id = 6 AND (target_role_id IS NULL OR target_role_id != 60);
      INSERT INTO assessments (user_id, competency_id, role_id, rating, updated_at) VALUES
      (6,71,58,'green','2026-07-06 11:00:00'),(6,72,58,'green','2026-07-06 11:00:00'),(6,73,58,'green','2026-07-06 11:00:00'),(6,74,58,'green','2026-07-06 11:00:00'),(6,75,58,'green','2026-07-06 11:00:00'),(6,76,58,'green','2026-07-06 11:00:00'),(6,77,58,'green','2026-07-06 11:00:00'),
      (6,80,58,'green','2026-07-06 11:00:00'),(6,81,58,'green','2026-07-06 11:00:00'),(6,82,58,'green','2026-07-06 11:00:00'),(6,83,58,'green','2026-07-06 11:00:00'),(6,84,58,'green','2026-07-06 11:00:00'),(6,85,58,'green','2026-07-06 11:00:00'),(6,86,58,'green','2026-07-06 11:00:00'),
      (6,87,58,'green','2026-07-06 11:00:00'),(6,88,58,'green','2026-07-06 11:00:00'),(6,89,58,'green','2026-07-06 11:00:00'),(6,90,58,'green','2026-07-06 11:00:00'),(6,91,58,'green','2026-07-06 11:00:00'),(6,92,58,'green','2026-07-06 11:00:00'),(6,93,58,'green','2026-07-06 11:00:00'),
      (6,94,58,'green','2026-07-06 11:00:00'),(6,95,58,'green','2026-07-06 11:00:00'),(6,96,58,'green','2026-07-06 11:00:00'),(6,97,58,'green','2026-07-06 11:00:00'),(6,98,58,'green','2026-07-06 11:00:00'),(6,99,58,'green','2026-07-06 11:00:00'),(6,100,58,'green','2026-07-06 11:00:00'),
      (6,101,58,'green','2026-07-06 11:00:00'),(6,102,58,'green','2026-07-06 11:00:00'),(6,103,58,'green','2026-07-06 11:00:00'),(6,104,58,'green','2026-07-06 11:00:00'),(6,105,58,'green','2026-07-06 11:00:00'),(6,106,58,'green','2026-07-06 11:00:00'),(6,107,58,'green','2026-07-06 11:00:00'),
      (6,108,58,'green','2026-07-06 11:00:00'),(6,109,58,'green','2026-07-06 11:00:00'),(6,110,58,'green','2026-07-06 11:00:00'),
      (6,155,60,'green','2026-07-06 10:00:00'),(6,156,60,'green','2026-07-06 10:00:00'),(6,157,60,'green','2026-07-06 10:00:00'),(6,158,60,'green','2026-07-06 10:00:00'),(6,159,60,'green','2026-07-06 10:00:00'),(6,160,60,'green','2026-07-06 10:00:00'),(6,161,60,'green','2026-07-06 10:00:00'),
      (6,164,60,'green','2026-07-06 10:00:00'),(6,165,60,'green','2026-07-06 10:00:00'),(6,166,60,'green','2026-07-06 10:00:00'),(6,167,60,'green','2026-07-06 10:00:00'),(6,168,60,'green','2026-07-06 10:00:00'),(6,169,60,'green','2026-07-06 10:00:00'),(6,170,60,'green','2026-07-06 10:00:00'),
      (6,171,60,'green','2026-07-06 10:00:00'),(6,172,60,'green','2026-07-06 10:00:00'),(6,173,60,'green','2026-07-06 10:00:00'),(6,174,60,'green','2026-07-06 10:00:00'),(6,175,60,'green','2026-07-06 10:00:00'),(6,176,60,'green','2026-07-06 10:00:00'),(6,177,60,'green','2026-07-06 10:00:00'),
      (6,178,60,'green','2026-07-06 10:00:00'),(6,179,60,'green','2026-07-06 10:00:00'),(6,180,60,'green','2026-07-06 10:00:00'),(6,181,60,'green','2026-07-06 10:00:00'),(6,182,60,'green','2026-07-06 10:00:00'),(6,183,60,'green','2026-07-06 10:00:00'),(6,184,60,'green','2026-07-06 10:00:00'),
      (6,185,60,'green','2026-07-06 10:00:00'),(6,186,60,'green','2026-07-06 10:00:00'),(6,187,60,'green','2026-07-06 10:00:00'),(6,188,60,'green','2026-07-06 10:00:00'),(6,189,60,'green','2026-07-06 10:00:00'),(6,190,60,'green','2026-07-06 10:00:00'),(6,191,60,'green','2026-07-06 10:00:00'),
      (6,192,60,'green','2026-07-06 10:00:00'),(6,193,60,'green','2026-07-06 10:00:00'),(6,194,60,'green','2026-07-06 10:00:00'),(6,195,60,'green','2026-07-06 10:00:00'),
      (8,1,56,'green','2026-07-06 11:00:00'),(8,2,56,'green','2026-07-06 11:00:00'),(8,3,56,'green','2026-07-06 11:00:00'),(8,4,56,'green','2026-07-06 11:00:00'),(8,5,56,'green','2026-07-06 11:00:00'),(8,6,56,'green','2026-07-06 11:00:00'),(8,7,56,'green','2026-07-06 11:00:00'),
      (8,9,56,'green','2026-07-06 11:00:00'),(8,10,56,'green','2026-07-06 11:00:00'),(8,11,56,'green','2026-07-06 11:00:00'),(8,12,56,'green','2026-07-06 11:00:00'),(8,13,56,'green','2026-07-06 11:00:00'),(8,14,56,'green','2026-07-06 11:00:00'),(8,15,56,'green','2026-07-06 11:00:00'),
      (8,16,56,'green','2026-07-06 11:00:00'),(8,17,56,'green','2026-07-06 11:00:00'),(8,18,56,'green','2026-07-06 11:00:00'),
      (8,71,58,'green','2026-07-06 10:00:00'),(8,72,58,'green','2026-07-06 10:00:00'),(8,73,58,'green','2026-07-06 10:00:00'),(8,74,58,'green','2026-07-06 10:00:00'),(8,75,58,'green','2026-07-06 10:00:00'),(8,76,58,'green','2026-07-06 10:00:00'),(8,77,58,'green','2026-07-06 10:00:00'),
      (8,80,58,'green','2026-07-06 10:00:00'),(8,81,58,'green','2026-07-06 10:00:00');
      INSERT INTO financial_progress (target_id, role_id, current_amount, user_id) VALUES
      (15, 60, 108000, 6),
      (16, 60, 198000, 6);
    `);
    logger.info("Demo career progress data inserted successfully.");
  } catch (err) {
    logger.error({ err }, "Failed to insert demo progress data");
    throw err;
  } finally {
    client.release();
  }
}
