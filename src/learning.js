import { lexiconForLevel, progressFor } from './lexicon.js';
export const DAY = 86400000;
export const LEVELS = ['A2', 'B1', 'B2', 'C1'];
export const COURSE_SIZE = 400;
export const COURSE_VERSION = 'route-2026-1';
export const INTERVALS = [1, 3, 5, 8, 12, 30, 60, 90];
export const KNOWN_VERIFY_AFTER_DAYS = 35;
export const KNOWN_RECHECK_DAYS = 90;
export const dayKey = (time = Date.now()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(time));
export const studySlot = (time = Date.now()) => {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', hour: '2-digit', hour12: false }).format(new Date(time)));
  return hour >= 4 && hour < 14 ? 'morning' : 'evening';
};
export function shuffle(items, random = Math.random) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
export function rotatingExample(item, seed = 0) {
  const examples = item?.examples?.filter(Boolean) || [];
  return examples.length ? examples[Math.abs(Number(seed) || 0) % examples.length] : item?.explanation || '';
}
export const isDue = (p, time = Date.now()) => Boolean(p && (!p.n || p.n <= time));
export const emptyItem = () => ({
  s: 'NEW', c: 0, w: 0, l: 0, n: 0, f: 0, step: 0,
  rec: 0, rcl: 0, ctx: 0, lis: 0, days: [], xp: 0, v: false,
  known: false, selfKnown: false, knownAt: 0, lastWrong: 0, lastCorrect: 0
});
export function normaliseItem(raw = {}) {
  const defined = Object.fromEntries(Object.entries(raw || {}).filter(([, value]) => value !== undefined));
  const item = { ...emptyItem(), ...defined, days: Array.isArray(raw?.days) ? raw.days.slice(-8) : [], v: raw?.v === true };
  // V4 used Number.MAX_SAFE_INTEGER for “known”, which removed a card forever.
  // Migrate those records into a delayed self-knowledge check without resetting data.
  if (item.known && (!Number.isFinite(item.n) || item.n > 200 * 365 * DAY)) {
    item.knownAt = item.knownAt || item.l || item.f || Date.now();
    item.n = item.knownAt + KNOWN_VERIFY_AFTER_DAYS * DAY;
    item.s = 'SELF_KNOWN';
    item.selfKnown = true;
    item.v = false;
  }
  return item;
}
// An intentionally transparent schedule, not an implementation of FSRS.
// Early reviews can expose a lapse but cannot advance a stage or earn repeat XP.
export function reviewItem(raw, action, time = Date.now(), event = '') {
  const old = normaliseItem(raw);
  if (event && old.event === event) return { item: old, xp: 0 };
  const p = { ...old, days: [...old.days], f: old.f || time, l: time, event };
  if (action === 'intro') { p.s = old.s === 'NEW' ? 'LEARNING' : old.s; p.n = old.n || time; return { item: p, xp: 0 }; }
  // Self-declared knowledge skips the short learning queue, but must be proven
  // in a delayed recall check before it contributes to verified course progress.
  if (action === 'known') {
    p.s = 'SELF_KNOWN'; p.n = time + KNOWN_VERIFY_AFTER_DAYS * DAY;
    p.known = true; p.selfKnown = true; p.knownAt = time; p.v = false;
    return { item: p, xp: 0 };
  }
  const correct = action !== 'wrong';
  p.c += correct ? 1 : 0; p.w += correct ? 0 : 1;
  const due = !old.n || old.n <= time;
  const today = dayKey(time);
  let xp = 0;
  if (!correct) {
    p.s = 'LEARNING'; p.step = Math.max(0, old.step - 2); p.n = time + DAY;
    p.v = false; p.known = false; p.selfKnown = false; p.lastWrong = time;
  } else if (action === 'recognition') {
    if (!old.rec) { p.rec = 1; xp = 2; }
    p.lastCorrect = time;
    // Recognition is not mastery, but a successful due review must leave the
    // due queue. Active recall remains necessary for verified knowledge.
    if (due) p.n = time + DAY;
    if (p.s === 'NEW') p.s = 'LEARNING';
  } else {
    // A scored contextual question and an honest self-recall are distinct evidence.
    if (action === 'context') p.ctx = Math.min(8, old.ctx + 1);
    if (action === 'recall') p.rcl = Math.min(8, old.rcl + 1);
    if (action === 'listening') p.lis = Math.min(8, old.lis + 1);
    p.lastCorrect = time;
    if (due && old.rewardDay !== today) {
      p.days = [...new Set([...old.days, today])].slice(-8);
      p.step = Math.min(INTERVALS.length - 1, old.step + 1);
      // Targets are measured from first exposure (day 1, 3, 5…), not added
      // together. If a learner returns late, the next review waits one day.
      const target = p.f + INTERVALS[p.step - 1] * DAY;
      p.n = Math.max(time + DAY, target);
      p.rewardDay = today; xp = action === 'context' || action === 'listening' ? 8 : 5;
      if (old.known) {
        // Passing the delayed test converts a claim into verified knowledge.
        p.v = true; p.s = 'MASTERED'; p.selfKnown = false; p.known = true;
        p.n = time + KNOWN_RECHECK_DAYS * DAY;
      } else {
        const distributedEvidence = p.days.length >= 4 && p.ctx >= 2 && (p.rcl >= 1 || p.lis >= 2) && time - p.f >= 30 * DAY;
        p.v = old.v || distributedEvidence;
        p.s = p.v ? 'MASTERED' : p.days.length >= 3 ? 'STABLE' : 'LEARNING';
        if (p.v) p.n = time + Math.max(30, INTERVALS[p.step]) * DAY;
      }
    }
  }
  p.xp = old.xp + xp;
  return { item: p, xp };
}

export function weaknessScore(raw, time = Date.now()) {
  const p = normaliseItem(raw);
  const recentFailure = p.lastWrong && time - p.lastWrong < 7 * DAY ? 8 : 0;
  const unresolved = Math.max(0, p.w - p.c) * 2;
  const recallGap = p.rec && !p.rcl ? 4 : 0;
  return p.w * 3 + recentFailure + unresolved + recallGap - Math.min(8, p.ctx + p.rcl + p.lis);
}

const recoveryType = type => type === 'recognition' ? 'recall'
  : type === 'recall' ? 'context'
    : ['grammar','irregular','listening'].includes(type) ? type : 'recall';
export function queueRecovery(queue = [], itemId, failedType, step) {
  if (!itemId) return queue;
  const old = queue.find(entry => entry.id === itemId);
  const entry = {
    id: itemId,
    failedType,
    nextType: recoveryType(failedType),
    dueStep: step + (old ? 3 : 3),
    attempts: (old?.attempts || 0) + 1
  };
  return [...queue.filter(candidate => candidate.id !== itemId), entry];
}
export function settleRecovery(queue = [], itemId, correct, failedType, step) {
  if (correct) return queue.filter(entry => entry.id !== itemId);
  return queueRecovery(queue, itemId, failedType, step);
}

export function chooseTask(items, progress, session, time = Date.now()) {
  progress = Object.fromEntries(items.map(item => [item.id, progressFor(item, progress)]));
  const seen = session.recent || [];
  const visits = session.visits || {};
  const gap=Math.min(5,Math.max(1,newItemLimit(session)-1));
  const allowed = item => !seen.slice(-gap).includes(item.id) && (visits[item.id] || 0) < 3;
  const fresh = items.filter(item => !progress[item.id] || progress[item.id].s === 'NEW');
  const canIntroduce = fresh.length && Number(session.newCount || 0) < newItemLimit(session)+Number(session.extraNew || 0);
  // Both morning and evening reserve one in three tasks for new learning.
  if (canIntroduce && session.step % 3 === 0) return {item:fresh[0],type:'intro',reason:'new'};
  const recovery = (session.recoveryQueue || []).find(entry => entry.dueStep <= session.step && !seen.slice(-5).includes(entry.id) && entry.attempts <= 2);
  if (recovery) {
    const item = items.find(candidate => candidate.id === recovery.id);
    if (item) return { item, type: recovery.nextType, early: true, recovery: true, reason:'mistake' };
  }
  const introduced = new Set(session.introducedIds || []);
  const consolidation = items.filter(item => allowed(item) && progress[item.id] && !progress[item.id].known && introduced.has(item.id))
    .sort((a,b) => (visits[a.id] || 0) - (visits[b.id] || 0));
  // Do not pull future reviews forward just to fill the timer.
  const due = items.filter(x => isDue(progress[x.id], time) && allowed(x) && !visits[x.id]).sort((a, b) => {
    const weak = weaknessScore(progress[b.id], time) - weaknessScore(progress[a.id], time);
    return weak || (progress[a.id].n || 0) - (progress[b.id].n || 0);
  });
  let item, reason;
  if (consolidation.length && (session.step % 3 === 2 || !due.length)) {item=consolidation[0];reason='practice';}
  else if (due.length) {item=due[0];reason='due';}
  else if (canIntroduce) {item=fresh[0];reason='new';}
  else if (consolidation.length) {item=consolidation[0];reason='practice';}
  if (!item) return null;
  const p = progress[item.id];
  const type = reason === 'new' ? 'intro' : p.known ? 'recall' : !p.rec && !p.c ? 'recognition' : 'recall';
  return { item, type, reason, early: Boolean(p && !isDue(p, time)) };
}
export function newItemLimit(session = {}) {
  if (Number(session.minutes) <= 5) return 4;
  return ({gentle:8,normal:12,more:16})[session.vocabPace] || 12;
}
// A2 graduation covers the entire published programme, not unavailable cards.
export const levelTarget = level => level === 'A2' ? lexiconForLevel('A2').length : COURSE_SIZE;
export const checkpointQuarters = level => Array.from({length:Math.floor(levelTarget(level)/100)},(_,index)=>index+1);
export function courseProgress(items, progress, level = items[0]?.level) {
  const current = items.filter(x => {const p=progressFor(x,progress);return p?.v && p.s === 'MASTERED';});
  const learned = items.filter(x => {const p=progressFor(x,progress);return p && p.s !== 'NEW';});
  const total=levelTarget(level);
  return { verified: current.length, introduced: learned.length, available: items.length, total, points: current.length * 10, targetPoints: total * 10, percent: Math.min(100,Math.floor(current.length / total * 100)) };
}
export function checkpointCandidates(items, progress, quarter) {
  if (!Number.isInteger(quarter) || quarter < 1 || quarter > 4) return [];
  const eligible = items.filter(x => {const p=progressFor(x,progress);return p?.v && p.s === 'MASTERED' && x.cloze;});
  return eligible.length >= quarter * 100 ? shuffle(eligible).slice(0, 10) : [];
}
export function awardMilestone(wallet, level, quarter, score, verified, time = Date.now()) {
  const id = `${COURSE_VERSION}:${level}:${quarter}`;
  if (!LEVELS.includes(level) || !checkpointQuarters(level).includes(quarter) || !Number.isInteger(score) || score < 8 || score > 10 || !Number.isFinite(verified) || verified < quarter * 100 || wallet.earned?.[id]) return wallet;
  return { ...wallet, earned: { ...wallet.earned, [id]: { at: time, level, quarter, amount: 5, kind:'checkpoint', score } } };
}
export function levelCompletionId(level) {
  return `${COURSE_VERSION}:${level}:complete`;
}
export function finalLevelReady(items, progress, wallet, level) {
  const pool=items.filter(item=>item.level===level),route = courseProgress(pool, progress, level);
  const milestones = checkpointQuarters(level).every(quarter => Boolean(wallet?.earned?.[`${COURSE_VERSION}:${level}:${quarter}`]));
  return LEVELS.includes(level) && pool.length >= route.total && route.verified >= route.total && milestones;
}
export function awardLevelCompletion(wallet, level, score, total = 20, time = Date.now(), verified = 0) {
  const id = levelCompletionId(level);
  const milestones=checkpointQuarters(level).every(quarter=>Boolean(wallet.earned?.[`${COURSE_VERSION}:${level}:${quarter}`]));
  if (!LEVELS.includes(level) || total !== 20 || !Number.isInteger(score) || score < 16 || score > total || !Number.isFinite(verified) || verified < levelTarget(level) || !milestones || wallet.earned?.[id]) return wallet;
  return {
    ...wallet,
    earned: { ...wallet.earned, [id]: { at: time, level, amount: level === 'A2' ? 100 : 0, kind: 'level-completion', score, total } }
  };
}
export function routineRewardId(time = Date.now()) {
  return `routine:${dayKey(time)}:${studySlot(time)}`;
}
export function lessonStudyTime(session, finishedAt = Date.now()) {
  // A lesson saved after the morning session may be resumed in the evening.
  // Reward the actual completion slot, never the draft's creation timestamp.
  return finishedAt;
}
export function sessionCompletion(session = {}) {
  const plannedSeconds = Math.max(60, Number(session.plannedMs || 900000) / 1000);
  const answers = Math.max(0, Number(session.scoredAnswers ?? session.answers ?? 0));
  const minAnswers = plannedSeconds <= 330 ? 3 : 5;
  const spent=Number(session.spentSeconds || 0);
  return { completed:Number.isFinite(plannedSeconds) && Number.isFinite(spent) && Number.isFinite(answers) && spent >= plannedSeconds * .8 && answers >= minAnswers, plannedSeconds, minAnswers };
}
export function evaluateSessionReward(session = {}) {
  const {completed,plannedSeconds,minAnswers}=sessionCompletion(session);
  const answers = Math.max(0, Number(session.scoredAnswers ?? session.answers ?? 0));
  const correct = Math.max(0, Number(session.scoredCorrect ?? session.correct ?? 0));
  const accuracy = answers ? correct / answers : 0;
  const counts = session.taskCounts || {};
  const diversity = Object.values(counts).filter(value => Number(value) > 0).length;
  if (!completed) return { amount:0, accuracy, diversity, reasons:[`Для завершения урока нужно ${Math.ceil(plannedSeconds*.8/60)} минут практики и ${minAnswers} проверяемых ответа. Ошибки и подсказки разрешены.`] };
  return { amount:1, accuracy, diversity, reasons:['$1 за завершённый урок. Ошибки, подсказки и скорость ответов не уменьшают награду.'] };
}
export function awardRoutine(wallet, session, time = Date.now()) {
  const id = routineRewardId(time);
  const evaluation = evaluateSessionReward(session);
  if (!evaluation.amount || wallet.earned?.[id]) return { wallet, awarded: 0, slot: studySlot(time), evaluation };
  const next = {
    ...wallet,
    earned: {
      ...wallet.earned,
      [id]: { at: time, amount: evaluation.amount, kind: 'routine', completed:true, slot: studySlot(time), day: dayKey(time), reasons: evaluation.reasons }
    }
  };
  return { wallet: next, awarded: evaluation.amount, slot: studySlot(time), evaluation };
}

export const ROUTE_LESSONS = 80;
export function lessonRecord(session, level, time = Date.now()) {
  const seconds = Math.max(0, Number(session.spentSeconds || 0));
  const {completed,plannedSeconds} = sessionCompletion(session);
  const studiedAt=lessonStudyTime(session,time);
  return { id:session.id, level, at:time, studyDay:dayKey(studiedAt), slot:studySlot(studiedAt), seconds, answers:session.answers || 0, correct:session.correct || 0, completed, climb:completed ? Math.min(1, plannedSeconds / 900) : 0, reward:session.routineReward || 0 };
}
export function ascentProgress(stats, level) {
  const lessons = Object.values(stats?.lessons || {}).filter(record => record.level === level && record.completed);
  const steps = lessons.reduce((sum, record) => sum + Number(record.climb || 0), 0);
  return { lessons:lessons.length, steps, total:ROUTE_LESSONS, percent:Math.min(100, steps / ROUTE_LESSONS * 100) };
}
export function balanceOf(wallet) {
  return Object.values(wallet.earned || {}).reduce((n,x) => n + Number(x.amount || 0), 0)
    - Object.values(wallet.spent || {}).filter(x => x.status !== 'rejected').reduce((n,x) => n + Number(x.cost || 0), 0);
}
export function redeem(wallet, gift, id, time = Date.now()) {
  if (!gift || !Number.isInteger(gift.cost) || gift.cost <= 0 || wallet.spent?.[id] || balanceOf(wallet) < gift.cost || Object.keys(wallet.spent || {}).length >= 64) return wallet;
  return { ...wallet, spent: { ...wallet.spent, [id]: { title: String(gift.title || '').slice(0, 60), cost: gift.cost, at: time, status: 'pending' } } };
}
export function addGoal(wallet, title, cost, id, time = Date.now()) {
  const cleanTitle = String(title || '').trim().slice(0, 60);
  const cleanCost = Math.round(Number(cost));
  if (!cleanTitle || !Number.isInteger(cleanCost) || cleanCost < 1 || cleanCost > 10000 || wallet.goals?.[id] || Object.keys(wallet.goals || {}).length >= 12) return wallet;
  return { ...wallet, goals: { ...wallet.goals, [id]: { title: cleanTitle, cost: cleanCost, at: time, active: true } } };
}
export function resolveRequest(wallet, id, status, time = Date.now()) {
  if (!['approved', 'rejected'].includes(status) || !wallet.spent?.[id]) return wallet;
  return { ...wallet, spent: { ...wallet.spent, [id]: { ...wallet.spent[id], status, resolvedAt: time } } };
}
