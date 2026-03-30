// js/exam-engine.js — adaptive exam logic
import { assessments, responses, results } from './supabase.js';
import { computeResult } from './results.js';

let state = {
  assessmentId: null,
  childId: null,
  parentId: null,
  category: null,
  difficulty: null,   // L1 L2 L3 L4
  questions: [],      // filtered question list for this session
  currentIdx: 0,
  startTime: null,
  qStartTime: null,
  hintUsed: false,
  listenUsed: false,
  stepsUsed: false,
  hintCount: 0,
  listenCount: 0,
  stepsCount: 0,
  correctCount: 0,
};

// Called from exam-start.html after category + difficulty chosen
export async function startExam({ childId, parentId, category, difficulty, questions }) {
  state = { ...state, childId, parentId, category, difficulty, questions, currentIdx: 0,
            startTime: Date.now(), correctCount: 0, hintCount: 0, listenCount: 0, stepsCount: 0 };

  const { data: assessment, error } = await assessments.create({
    child_id: childId, parent_id: parentId,
    category, difficulty, status: 'in_progress',
    total_questions: questions.length,
  });

  if (error) { console.error('Assessment create error:', error); return false; }
  state.assessmentId = assessment.id;

  // Persist to sessionStorage so page refresh doesn't lose state
  sessionStorage.setItem('re_exam', JSON.stringify({ assessmentId: assessment.id, childId, parentId, category, difficulty, qIdx: 0 }));

  return true;
}

// Get current question
export function currentQuestion() {
  return state.questions[state.currentIdx] || null;
}

// Advance progress bar
export function progressPct() {
  return state.questions.length ? Math.round((state.currentIdx / state.questions.length) * 100) : 0;
}

// Record an answer
export async function recordAnswer(answerIndex) {
  const q = currentQuestion();
  if (!q) return;

  const isCorrect = answerIndex === q.ans;
  const timeTaken = Math.round((Date.now() - (state.qStartTime || state.startTime)) / 1000);

  if (isCorrect) state.correctCount++;

  await responses.save({
    assessment_id: state.assessmentId,
    child_id:      state.childId,
    question_id:   q.id || `${state.category}_${state.difficulty}_${state.currentIdx}`,
    category:      state.category,
    difficulty:    state.difficulty,
    answer_index:  answerIndex,
    is_correct:    isCorrect,
    hint_used:     state.hintUsed,
    listen_used:   state.listenUsed,
    steps_used:    state.stepsUsed,
    time_seconds:  timeTaken,
  });

  // Reset per-question tracking
  state.hintUsed   = false;
  state.listenUsed = false;
  state.stepsUsed  = false;
  state.qStartTime = Date.now();

  return isCorrect;
}

// Move to next question
export function nextQuestion() {
  if (state.currentIdx < state.questions.length - 1) {
    state.currentIdx++;
    updateSession();
    return true;
  }
  return false; // exam complete
}

// Move to previous (review)
export function prevQuestion() {
  if (state.currentIdx > 0) { state.currentIdx--; updateSession(); return true; }
  return false;
}

// Mark support tools used
export function markHintUsed()   { state.hintUsed = true;   state.hintCount++;   }
export function markListenUsed() { state.listenUsed = true; state.listenCount++;  }
export function markStepsUsed()  { state.stepsUsed = true;  state.stepsCount++;  }

// Complete exam — write final result
export async function completeExam() {
  const totalTime = Math.round((Date.now() - state.startTime) / 1000);
  const scorePct  = state.questions.length
    ? Math.round((state.correctCount / state.questions.length) * 100)
    : 0;

  // Update assessment row
  await assessments.update(state.assessmentId, {
    status: 'completed', completed_at: new Date().toISOString(),
    correct_count: state.correctCount, hint_count: state.hintCount,
    listen_count:  state.listenCount,  steps_count: state.stepsCount,
    time_seconds:  totalTime,
  });

  // Compute and save result
  const result = computeResult({
    category:    state.category,
    difficulty:  state.difficulty,
    scorePct,
    hintCount:   state.hintCount,
    listenCount: state.listenCount,
    stepsCount:  state.stepsCount,
    totalQ:      state.questions.length,
    correctCount:state.correctCount,
  });

  const { data: savedResult } = await results.save({
    assessment_id: state.assessmentId,
    child_id:      state.childId,
    parent_id:     state.parentId,
    category:      state.category,
    difficulty:    state.difficulty,
    score_pct:     scorePct,
    level_reached: result.levelCode,
    level_name:    result.levelName,
    strengths:     result.strengths,
    growth_areas:  result.growthAreas,
    analysis:      result.analysis,
    supports_summary: result.supportsSummary,
  });

  sessionStorage.removeItem('re_exam');
  return savedResult?.id;
}

function updateSession() {
  const saved = JSON.parse(sessionStorage.getItem('re_exam') || '{}');
  saved.qIdx = state.currentIdx;
  sessionStorage.setItem('re_exam', JSON.stringify(saved));
}

export function getState() { return { ...state }; }
