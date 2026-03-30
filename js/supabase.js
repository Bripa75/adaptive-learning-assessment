/* ═══════════════════════════════════════════
   RIPA ELEVATE — SUPABASE CLIENT
   Replace SUPABASE_URL and SUPABASE_ANON
   with your real values before going live.
   Settings → API inside your Supabase project.
═══════════════════════════════════════════ */

const SUPABASE_URL  = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON = 'YOUR_ANON_PUBLIC_KEY_HERE';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);

/* ─── AUTH ─────────────────────────────── */
const Auth = {
  async signUp(email, password, firstName, lastName) {
    return db.auth.signUp({ email, password, options: { data: { first_name: firstName, last_name: lastName, role: 'parent' } } });
  },
  async signIn(email, password) {
    return db.auth.signInWithPassword({ email, password });
  },
  async signOut() { return db.auth.signOut(); },
  async getSession() { const { data: { session } } = await db.auth.getSession(); return session; },
  async getUser()    { const { data: { user } }    = await db.auth.getUser();    return user; },
  onAuthChange(cb)   { return db.auth.onAuthStateChange(cb); },
  async resetPassword(email) {
    return db.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/app/reset-password.html` });
  }
};

/* ─── PROFILES ──────────────────────────── */
const Profiles = {
  async get(id)         { return db.from('profiles').select('*').eq('id', id).single(); },
  async update(id, upd) { return db.from('profiles').update(upd).eq('id', id).select().single(); },
  async isAdmin(id)     { const { data } = await db.from('profiles').select('role').eq('id', id).single(); return data?.role === 'admin'; }
};

/* ─── CHILDREN ──────────────────────────── */
const Children = {
  async getByParent(parentId) {
    return db.from('children').select('*').eq('parent_id', parentId).order('created_at', { ascending: true });
  },
  async get(id) { return db.from('children').select('*').eq('id', id).single(); },
  async create(parentId, { firstName, lastName, gradeLevel, hasIep, notes }) {
    return db.from('children').insert({ parent_id: parentId, first_name: firstName, last_name: lastName, grade_level: gradeLevel, has_iep: hasIep, notes: notes || null }).select().single();
  },
  async update(id, upd) { return db.from('children').update(upd).eq('id', id).select().single(); }
};

/* ─── ASSESSMENTS ───────────────────────── */
const Assessments = {
  async create(childId, parentId, { category, difficultyLevel }) {
    return db.from('assessments').insert({ child_id: childId, parent_id: parentId, category, difficulty_level: difficultyLevel, status: 'in_progress', started_at: new Date().toISOString() }).select().single();
  },
  async getByChild(childId) {
    return db.from('assessments').select('*, results(*)').eq('child_id', childId).order('started_at', { ascending: false });
  },
  async getWithResponses(id) {
    return db.from('assessments').select('*, responses(*), results(*)').eq('id', id).single();
  },
  async complete(id) {
    return db.from('assessments').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', id).select().single();
  },
  async canRetake(childId, category) {
    const { data } = await db.from('assessments').select('completed_at').eq('child_id', childId).eq('category', category).eq('status', 'completed').order('completed_at', { ascending: false }).limit(1).single();
    if (!data) return { canRetake: true, daysLeft: 0 };
    const days = Math.floor((Date.now() - new Date(data.completed_at)) / 86400000);
    const daysLeft = Math.max(0, 30 - days);
    return { canRetake: daysLeft === 0, daysLeft };
  },
  async getLatestByCategory(childId) {
    return db.from('assessments').select('*, results(*)').eq('child_id', childId).eq('status', 'completed').order('completed_at', { ascending: false });
  }
};

/* ─── RESPONSES ─────────────────────────── */
const Responses = {
  async save({ assessmentId, questionId, questionIndex, answerChosen, isCorrect, timeTakenSeconds, hintUsed, listenUsed, stepsUsed, difficultyLevel }) {
    return db.from('responses').insert({ assessment_id: assessmentId, question_id: questionId, question_index: questionIndex, answer_chosen: answerChosen, is_correct: isCorrect, time_taken_seconds: timeTakenSeconds, hint_used: hintUsed || false, listen_used: listenUsed || false, steps_used: stepsUsed || false, difficulty_level: difficultyLevel }).select().single();
  },
  async getByAssessment(id) {
    return db.from('responses').select('*').eq('assessment_id', id).order('question_index', { ascending: true });
  }
};

/* ─── RESULTS ───────────────────────────── */
const Results = {
  async save(payload) { return db.from('results').insert(payload).select().single(); },
  async getByChild(id) { return db.from('results').select('*').eq('child_id', id).order('created_at', { ascending: false }); },
  async get(id)        { return db.from('results').select('*, assessments(*)').eq('id', id).single(); },
  async getByAssessment(id) { return db.from('results').select('*').eq('assessment_id', id).single(); }
};

/* ─── PAYMENTS ──────────────────────────── */
const Payments = {
  async get(userId) { return db.from('payments').select('*').eq('user_id', userId).single(); },
  async hasAccess(userId) {
    const { data } = await db.from('payments').select('status, plan, trial_ends_at').eq('user_id', userId).single();
    if (!data) return false;
    if (data.status === 'active') return true;
    if (data.plan === 'trial' && new Date(data.trial_ends_at) > new Date()) return true;
    return false;
  },
  async upsert(userId, upd) { return db.from('payments').upsert({ user_id: userId, ...upd }).select().single(); }
};

/* ─── LEADS ─────────────────────────────── */
const Leads = {
  async save(payload) { return db.from('leads').insert(payload).select().single(); },
  async getAll({ limit = 50, offset = 0 } = {}) {
    return db.from('leads').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
  }
};

/* ─── ADMIN ─────────────────────────────── */
const Admin = {
  async getAllStudents({ limit = 100, offset = 0 } = {}) {
    return db.from('children').select('*, profiles!children_parent_id_fkey(first_name, last_name, email), results(level_reached, category, created_at)', { count: 'exact' }).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
  },
  async getStats() {
    const [s, a, l, p] = await Promise.all([
      db.from('children').select('id', { count: 'exact', head: true }),
      db.from('assessments').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
      db.from('leads').select('id', { count: 'exact', head: true }),
      db.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'active')
    ]);
    return { totalStudents: s.count || 0, totalAssessments: a.count || 0, totalLeads: l.count || 0, activeSubscriptions: p.count || 0 };
  },
  async getRecentActivity(limit = 20) {
    return db.from('assessments').select('id, status, completed_at, category, difficulty_level, children(first_name, last_name), results(level_reached, score_percent)').eq('status', 'completed').order('completed_at', { ascending: false }).limit(limit);
  },
  async getWeeklyData(weeks = 8) {
    const since = new Date();
    since.setDate(since.getDate() - weeks * 7);
    return db.from('assessments').select('completed_at, status').eq('status', 'completed').gte('completed_at', since.toISOString());
  },
  async getAllLeads({ limit = 50, offset = 0 } = {}) {
    return db.from('leads').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
  },
  async updateLeadStatus(id, status, notes) {
    return db.from('leads').update({ status, notes }).eq('id', id).select().single();
  },
  async getAllPayments({ limit = 50, offset = 0 } = {}) {
    return db.from('payments').select('*, profiles!payments_user_id_fkey(first_name, last_name, email)', { count: 'exact' }).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
  }
};

window.RE = { db, Auth, Profiles, Children, Assessments, Responses, Results, Payments, Leads, Admin };
