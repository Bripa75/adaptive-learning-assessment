-- ═══════════════════════════════════════════════════════
--  RIPA ELEVATE — SUPABASE SCHEMA
--
--  HOW TO USE:
--  1. Go to supabase.com → your ripa-elevate project
--  2. Click SQL Editor in the left sidebar
--  3. Paste this entire file and click Run
--  4. All tables, security, and triggers are created
--
--  After running, scroll to the bottom and follow the
--  instructions to make yourself an admin.
-- ═══════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────
--  PROFILES  (extends auth.users)
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name  TEXT,
  last_name   TEXT,
  role        TEXT DEFAULT 'parent' CHECK (role IN ('parent','admin')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    COALESCE(NEW.raw_user_meta_data->>'role','parent')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─────────────────────────────────────
--  CHILDREN
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS children (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  grade_level   TEXT,
  has_iep       BOOLEAN DEFAULT FALSE,
  date_of_birth DATE,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_children_parent ON children(parent_id);

-- ─────────────────────────────────────
--  ASSESSMENTS
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS assessments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id          UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  parent_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category          TEXT NOT NULL CHECK (category IN ('math','reading','money','social','safety','time','decision')),
  difficulty_level  INTEGER NOT NULL DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 4),
  status            TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','abandoned')),
  current_question  INTEGER DEFAULT 0,
  started_at        TIMESTAMPTZ DEFAULT NOW(),
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_assessments_child  ON assessments(child_id);
CREATE INDEX IF NOT EXISTS idx_assessments_parent ON assessments(parent_id);
CREATE INDEX IF NOT EXISTS idx_assessments_status ON assessments(status);

-- ─────────────────────────────────────
--  RESPONSES
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS responses (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id       UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  question_id         TEXT NOT NULL,
  question_index      INTEGER NOT NULL,
  answer_chosen       INTEGER NOT NULL,
  is_correct          BOOLEAN NOT NULL,
  time_taken_seconds  INTEGER,
  hint_used           BOOLEAN DEFAULT FALSE,
  listen_used         BOOLEAN DEFAULT FALSE,
  steps_used          BOOLEAN DEFAULT FALSE,
  difficulty_level    INTEGER NOT NULL CHECK (difficulty_level BETWEEN 1 AND 4),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_responses_assessment ON responses(assessment_id);

-- ─────────────────────────────────────
--  RESULTS
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS results (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id       UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  child_id            UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  parent_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category            TEXT NOT NULL,
  level_reached       INTEGER NOT NULL CHECK (level_reached BETWEEN 1 AND 4),
  level_label         TEXT NOT NULL,
  score_percent       NUMERIC(5,2),
  total_questions     INTEGER,
  correct_answers     INTEGER,
  hints_used          INTEGER DEFAULT 0,
  listen_used         INTEGER DEFAULT 0,
  time_taken_seconds  INTEGER,
  strengths           TEXT[],
  growth_areas        TEXT[],
  recommendation      TEXT,
  raw_data            JSONB,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_results_child      ON results(child_id);
CREATE INDEX IF NOT EXISTS idx_results_parent     ON results(parent_id);
CREATE INDEX IF NOT EXISTS idx_results_assessment ON results(assessment_id);
CREATE INDEX IF NOT EXISTS idx_results_created    ON results(created_at DESC);

-- ─────────────────────────────────────
--  PAYMENTS
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_customer_id      TEXT UNIQUE,
  stripe_subscription_id  TEXT UNIQUE,
  stripe_payment_intent   TEXT,
  plan                    TEXT DEFAULT 'trial' CHECK (plan IN ('trial','one_time','monthly','annual')),
  status                  TEXT DEFAULT 'trial' CHECK (status IN ('trial','active','past_due','canceled','inactive')),
  amount_cents            INTEGER,
  currency                TEXT DEFAULT 'usd',
  trial_ends_at           TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  period_start            TIMESTAMPTZ,
  period_end              TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);

-- Auto-create trial record on parent signup
CREATE OR REPLACE FUNCTION handle_new_payment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.role = 'parent' THEN
    INSERT INTO payments (user_id, plan, status, trial_ends_at)
    VALUES (NEW.id, 'trial', 'trial', NOW() + INTERVAL '14 days');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created ON profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_payment();

-- ─────────────────────────────────────
--  LEADS
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  school        TEXT,
  role          TEXT,
  district      TEXT,
  inquiry_type  TEXT,
  message       TEXT,
  source        TEXT DEFAULT 'contact_form',
  status        TEXT DEFAULT 'new' CHECK (status IN ('new','contacted','converted','closed')),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status  ON leads(status);

-- ─────────────────────────────────────
--  ROW LEVEL SECURITY
-- ─────────────────────────────────────
ALTER TABLE profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE children    ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses   ENABLE ROW LEVEL SECURITY;
ALTER TABLE results     ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads       ENABLE ROW LEVEL SECURITY;

-- Helper: is current user an admin?
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$;

-- PROFILES
CREATE POLICY "profiles_self"  ON profiles FOR ALL  USING (auth.uid() = id);
CREATE POLICY "profiles_admin" ON profiles FOR SELECT USING (is_admin());

-- CHILDREN
CREATE POLICY "children_own"   ON children FOR ALL    USING (parent_id = auth.uid());
CREATE POLICY "children_admin" ON children FOR SELECT USING (is_admin());

-- ASSESSMENTS
CREATE POLICY "assessments_own"   ON assessments FOR ALL    USING (parent_id = auth.uid());
CREATE POLICY "assessments_admin" ON assessments FOR SELECT USING (is_admin());

-- RESPONSES
CREATE POLICY "responses_own" ON responses FOR ALL USING (
  EXISTS (SELECT 1 FROM assessments WHERE id = responses.assessment_id AND parent_id = auth.uid())
);
CREATE POLICY "responses_admin" ON responses FOR SELECT USING (is_admin());

-- RESULTS
CREATE POLICY "results_own"   ON results FOR ALL    USING (parent_id = auth.uid());
CREATE POLICY "results_admin" ON results FOR SELECT USING (is_admin());

-- PAYMENTS
CREATE POLICY "payments_own"   ON payments FOR ALL  USING (user_id = auth.uid());
CREATE POLICY "payments_admin" ON payments FOR ALL  USING (is_admin());

-- LEADS: anyone can submit (contact form), only admins read
CREATE POLICY "leads_insert" ON leads FOR INSERT WITH CHECK (true);
CREATE POLICY "leads_admin"  ON leads FOR ALL    USING (is_admin());

-- ─────────────────────────────────────
--  ADMIN VIEWS
-- ─────────────────────────────────────
CREATE OR REPLACE VIEW student_overview AS
SELECT
  c.id            AS child_id,
  c.first_name,
  c.last_name,
  c.grade_level,
  c.has_iep,
  c.parent_id,
  p.first_name    AS parent_first,
  p.last_name     AS parent_last,
  COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'completed') AS assessments_completed,
  MAX(a.completed_at)   AS last_assessment_date,
  COUNT(DISTINCT r.category) AS categories_completed
FROM children c
LEFT JOIN profiles    p ON p.id = c.parent_id
LEFT JOIN assessments a ON a.child_id = c.id
LEFT JOIN results     r ON r.child_id = c.id
GROUP BY c.id, c.first_name, c.last_name, c.grade_level, c.has_iep, c.parent_id, p.first_name, p.last_name;

CREATE OR REPLACE VIEW weekly_assessments AS
SELECT
  DATE_TRUNC('week', completed_at) AS week,
  COUNT(*)                          AS total_completed,
  COUNT(DISTINCT child_id)          AS unique_students
FROM assessments
WHERE status = 'completed' AND completed_at IS NOT NULL
GROUP BY DATE_TRUNC('week', completed_at)
ORDER BY week DESC;

-- ─────────────────────────────────────
--  MAKE YOURSELF ADMIN
--
--  1. Create your account at /app/signup.html first
--  2. Come back here, uncomment the UPDATE below
--  3. Replace the email addresses with your real ones
--  4. Run just this block in the SQL editor
-- ─────────────────────────────────────

-- UPDATE profiles
-- SET role = 'admin'
-- WHERE id IN (
--   SELECT id FROM auth.users
--   WHERE email IN (
--     'your-email@example.com',
--     'co-founder-email@example.com'
--   )
-- );
