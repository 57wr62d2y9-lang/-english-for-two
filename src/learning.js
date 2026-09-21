export const DAY = 86400000;
export const LEVELS = ['A2', 'B1', 'B2', 'C1'];
export const COURSE_SIZE = 400;
export const COURSE_VERSION = 'route-2026-1';
export const INTERVALS = [1, 3, 5, 8, 12, 30, 60, 90];
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
export const isDue = (p, time = Date.now()) => Boolean(p && !p.known && (!p.n || p.n <= time));
export const emptyItem = () => ({ s: 'NEW', c: 0, w: 0, l: 0, n: 0, f: 0, step: 0, rec: 0, ctx: 0, days: [], xp: 0, v: false });
export function normaliseItem(raw = {}) {
  const defined = Object.fromEntries(Object.entries(raw || {}).filter(([, value]) => value !== undefined));
  return { ...emptyItem(), ...defined, days: Array.isArray(raw?.days) ? raw.days.slice(-8) : [], v: raw?.v === true };
}
// An intentionally transparent schedule, not an implementation of FSRS.
// Early reviews can expose a lapse but cannot advance a stage or earn repeat XP.
export function reviewItem(raw, action, time = Date.now(), event = '') {
  const old = normaliseItem(raw);
  if (event && old.event === event) return { item: old, xp: 0 };
  const p = { ...old, days: [...old.days], f: old.f || time, l: time, event };
  if (action === 'intro') { p.s = old.s === 'NEW' ? 'LEARNING' : old.s; p.n = old.n || time; return { item: p, xp: 0 }; }
  // The learner explicitly asked to remove this item from practice forever.
  // It stays in history, but does not count as verified course knowledge.
  if (action === 'known') { p.s = 'MASTERED'; p.n = Number.MAX_SAFE_INTEGER; p.known = true; return { item: p, xp: 0 }; }
  const correct = action !== 'wrong';
  p.c += correct ? 1 : 0; p.w += correct ? 0 : 1;
  const due = !old.n || old.n <= time;
  const today = dayKey(time);
  let xp = 0;
  if (!correct) {
    p.s = 'LEARNING'; p.step = Math.max(0, old.step - 2); p.n = time + DAY; p.v = false; p.known = false;
  } else if (action === 'recognition') {
    if (!old.rec) { p.rec = 1; xp = 2; }
    if (!old.n) p.n = time;
    if (p.s === 'NEW') p.s = 'LEARNING';
  } else {
    // A scored contextual question and an honest self-recall are distinct evidence.
    if (action === 'context') p.ctx = Math.min(8, old.ctx + 1);
    if (due && old.rewardDay !== today) {
      p.days = [...new Set([...old.days, today])].slice(-8);
      p.step = Math.min(INTERVALS.length - 1, old.step + 1);
      // Targets are measured from first exposure (day 1, 3, 5…), not added
      // together. If a learner returns late, the next review waits one day.
      const target = p.f + INTERVALS[p.step - 1] * DAY;
      p.n = Math.max(time + DAY, target);
      p.rewardDay = today; xp = action === 'context' ? 8 : 5;
      p.v = p.days.length >= 4 && p.ctx >= 2 && time - p.f >= 30 * DAY;
      p.s = p.v || old.known ? 'MASTERED' : p.days.length >= 3 ? 'STABLE' : 'LEARNING';
      if (p.v) p.n = time + Math.max(30, INTERVALS[p.step]) * DAY;
      else if (old.known) p.n = time + 30 * DAY;
    }
  }
  p.xp = old.xp + xp;
  return { item: p, xp };
}
export function chooseTask(items, progress, session, time = Date.now()) {
  const seen = session.recent || [];
  const due = items.filter(x => isDue(progress[x.id], time)).sort((a, b) => (progress[a.id].n || 0) - (progress[b.id].n || 0));
  const fresh = items.filter(x => !progress[x.id] || (progress[x.id].s === 'NEW' && !progress[x.id].known));
  const recentNew = items.filter(x => progress[x.id] && !progress[x.id].rec && !progress[x.id].known);
  const recentRecall = items.filter(x => progress[x.id]?.rec && !progress[x.id]?.days?.length && !progress[x.id]?.known);
  let pool;
  if (recentNew.length && session.step % 3 === 1) pool = recentNew;
  else if (recentRecall.length && session.step % 3 === 2) pool = recentRecall;
  else if (due.length) pool = due;
  // Two new units per 15-minute session is deliberately conservative: with
  // two commutes a day it produces about 80–120 new units a month while
  // leaving enough time for the growing review queue.
  else if (fresh.length && session.newCount < (session.minutes === 5 ? 1 : 2)) pool = fresh;
  else pool = items.filter(x => progress[x.id] && !progress[x.id].known).sort((a,b) => (progress[a.id].l || 0) - (progress[b.id].l || 0));
  if (!pool.length) pool = fresh;
  const item = pool.find(x => !seen.slice(-3).includes(x.id)) || pool[0];
  if (!item) return null;
  const p = progress[item.id];
  const type = !p || p.s === 'NEW' ? 'intro' : !p.rec && !p.known ? 'recognition' : session.step % 2 === 0 && item.cloze ? 'context' : 'recall';
  return { item, type, early: p && !isDue(p, time) };
}
export function courseProgress(items, progress) {
  const current = items.filter(x => progress[x.id]?.v && progress[x.id]?.s === 'MASTERED');
  const learned = items.filter(x => progress[x.id] && progress[x.id].s !== 'NEW');
  return { verified: current.length, introduced: learned.length, available: items.length, total: COURSE_SIZE, points: current.length * 10, targetPoints: COURSE_SIZE * 10, percent: Math.floor(current.length / COURSE_SIZE * 100) };
}
export function checkpointCandidates(items, progress, quarter) {
  const eligible = items.filter(x => progress[x.id]?.v && progress[x.id].s === 'MASTERED' && x.cloze);
  return eligible.length >= quarter * 100 ? shuffle(eligible).slice(0, 10) : [];
}
export function awardMilestone(wallet, level, quarter, score, verified, time = Date.now()) {
  const id = `${COURSE_VERSION}:${level}:${quarter}`;
  if (quarter < 1 || quarter > 4 || score < 8 || verified < quarter * 100 || wallet.earned?.[id]) return wallet;
  return { ...wallet, earned: { ...wallet.earned, [id]: { at: time, level, quarter, amount: 100, score } } };
}
export function routineRewardId(time = Date.now()) {
  return `routine:${dayKey(time)}:${studySlot(time)}`;
}
export function awardRoutine(wallet, session, time = Date.now()) {
  const id = routineRewardId(time);
  const plannedSeconds = Math.max(1, Number(session?.plannedMs || 0) / 1000);
  const spentSeconds = Math.max(0, Number(session?.spentSeconds || 0));
  const completed = spentSeconds >= plannedSeconds * 0.8 && Number(session?.answers || 0) >= 5;
  if (!completed || wallet.earned?.[id]) return { wallet, awarded: 0, slot: studySlot(time) };
  const next = {
    ...wallet,
    earned: {
      ...wallet.earned,
      [id]: { at: time, amount: 1, kind: 'routine', slot: studySlot(time), day: dayKey(time) }
    }
  };
  return { wallet: next, awarded: 1, slot: studySlot(time) };
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
