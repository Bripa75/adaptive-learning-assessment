// js/results.js — compute result object from raw scores
export function computeResult({ category, difficulty, scorePct, hintCount, listenCount, stepsCount, totalQ, correctCount }) {
  // Level determination
  let levelCode, levelName;
  if (scorePct >= 85)      { levelCode = 'L4'; levelName = 'Advanced'; }
  else if (scorePct >= 70) { levelCode = 'L3'; levelName = 'Independent'; }
  else if (scorePct >= 50) { levelCode = 'L2'; levelName = 'Developing'; }
  else                     { levelCode = 'L1'; levelName = 'Supported'; }

  const supportsUsed = hintCount + listenCount + stepsCount;
  const catLabel = {
    math:'Mathematics', reading:'Reading Comprehension', money:'Financial Literacy',
    social:'Social Reasoning', safety:'Safety Awareness', time:'Time & Planning', decision:'Decision-Making'
  }[category] || category;

  // Strengths and growth areas based on score
  const strengths   = getStrengths(category, scorePct);
  const growthAreas = getGrowthAreas(category, scorePct);

  // Plain-language analysis
  const analysis = buildAnalysis({ catLabel, levelName, levelCode, scorePct, supportsUsed, hintCount, listenCount, correctCount, totalQ, difficulty });

  const supportsSummary = buildSupportsSummary(hintCount, listenCount, stepsCount);

  return { levelCode, levelName, strengths, growthAreas, analysis, supportsSummary };
}

function getStrengths(cat, pct) {
  const allStrengths = {
    math:     ['Number operations','Pattern recognition','Problem setup','Arithmetic accuracy','Logical sequencing'],
    reading:  ['Literal comprehension','Vocabulary in context','Main idea identification','Inference skills','Critical analysis'],
    money:    ['Counting currency','Basic transactions','Comparison shopping','Budgeting concepts','Percentage calculations'],
    social:   ['Empathy recognition','Conflict awareness','Peer communication','Perspective-taking','Ethical reasoning'],
    safety:   ['Hazard recognition','Emergency response','Digital safety awareness','Personal boundary setting','Risk evaluation'],
    time:     ['Schedule reading','Deadline awareness','Task sequencing','Prioritization','Multi-step planning'],
    decision: ['Option identification','Consequence awareness','Value alignment','Trade-off analysis','Independent judgment'],
  };
  const list = allStrengths[cat] || [];
  const count = pct >= 80 ? 3 : pct >= 60 ? 2 : 1;
  return list.slice(0, count);
}

function getGrowthAreas(cat, pct) {
  const allGrowth = {
    math:     ['Multi-step word problems','Fraction and decimal operations','Percent calculations','Equation solving','Applied geometry'],
    reading:  ['Implicit meaning','Author bias detection','Cross-text synthesis','Figurative language','Academic vocabulary'],
    money:    ['Budget planning','Interest concepts','Comparing value','Saving strategies','Expense tracking'],
    social:   ['Reading subtle cues','Group dynamics','Assertive communication','Conflict resolution','Bystander responsibility'],
    safety:   ['Online privacy practices','Stranger safety protocol','Emergency planning','Medication safety','Cyberbullying response'],
    time:     ['Long-term project planning','Buffer time estimation','Overlapping deadlines','Prioritization under pressure','Self-scheduling'],
    decision: ['Ethical trade-offs','Long-term vs short-term thinking','Information gathering','Resisting peer pressure','Values clarification'],
  };
  const list = allGrowth[cat] || [];
  const count = pct < 60 ? 3 : pct < 80 ? 2 : 1;
  return list.slice(0, count);
}

function buildAnalysis({ catLabel, levelName, levelCode, scorePct, supportsUsed, hintCount, listenCount, correctCount, totalQ, difficulty }) {
  const diffLabel = { L1:'Level 1 (Supported)', L2:'Level 2 (Developing)', L3:'Level 3 (Independent)', L4:'Level 4 (Advanced)' }[difficulty] || difficulty;
  let text = `${catLabel} assessment completed at ${diffLabel}. `;

  if (levelCode === 'L4')
    text += `Your child demonstrated advanced understanding, answering ${correctCount} of ${totalQ} questions correctly (${scorePct}%). This is an excellent result that shows strong independent mastery of this skill area.`;
  else if (levelCode === 'L3')
    text += `Your child showed independent-level performance, getting ${correctCount} of ${totalQ} correct (${scorePct}%). They are working confidently through this material with solid understanding.`;
  else if (levelCode === 'L2')
    text += `Your child is in the developing range, answering ${correctCount} of ${totalQ} correctly (${scorePct}%). This is a normal and positive stage — targeted practice in this area will support continued growth.`;
  else
    text += `Your child answered ${correctCount} of ${totalQ} correctly (${scorePct}%), indicating they benefit from structured support in this area. This is valuable information — it helps identify exactly where to focus attention and support.`;

  if (supportsUsed > 0) {
    text += ` During the assessment, `;
    const parts = [];
    if (hintCount > 0)   parts.push(`the hint tool was used ${hintCount} time${hintCount>1?'s':''}`);
    if (listenCount > 0) parts.push(`questions were read aloud ${listenCount} time${listenCount>1?'s':''}`);
    parts.push('');
    text += parts.filter(Boolean).join(' and ') + '. Using supports is not a weakness — it shows your child is engaged and looking for ways to understand the material.';
  }

  return text;
}

function buildSupportsSummary(hints, listen, steps) {
  const parts = [];
  if (hints  > 0) parts.push(`${hints} hint${hints>1?'s':''} used`);
  if (listen > 0) parts.push(`read aloud ${listen} time${listen>1?'s':''}`);
  if (steps  > 0) parts.push(`step-by-step ${steps} time${steps>1?'s':''}`);
  return parts.length ? parts.join(' · ') : 'No supports used — completed independently';
}
