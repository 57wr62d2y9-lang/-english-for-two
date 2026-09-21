import assert from 'node:assert/strict';
import { AVAILABLE_BY_LEVEL, COLLOCATIONS, LISTENING_LESSONS, PHRASES } from '../src/catalog.js';
import {
  COURSE_SIZE,
  DAY,
  addGoal,
  awardMilestone,
  awardRoutine,
  balanceOf,
  checkpointCandidates,
  chooseTask,
  courseProgress,
  dayKey,
  evaluateSessionReward,
  isDue,
  queueRecovery,
  redeem,
  reviewItem,
  rotatingExample
} from '../src/learning.js';
import { packItems, unpackItems } from '../src/storage-v3.js';
import { mergeCoupleSnapshot, normalisePairCode } from '../src/couple-sync.js';
import { IELTS_TASKS, tasksForMode } from '../src/ielts.js';
import { chooseListeningLesson } from '../src/scheduler.js';
import { buildCheckpoint } from '../src/checkpoint.js';

let checks = 0;
function test(name, fn) {
  try { fn(); checks += 1; console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}`); throw error; }
}

test('published catalogue has stable IDs and two complete route blocks', () => {
  assert.equal(new Set(PHRASES.map(item => item.id)).size, PHRASES.length);
  assert.equal(PHRASES[0].id, 'p001');
  assert.equal(PHRASES[99].id, 'p100');
  assert.ok(PHRASES.some(item => item.id === 'a2_200'));
  assert.ok(PHRASES.some(item => item.id === 'b1_200'));
  assert.deepEqual(AVAILABLE_BY_LEVEL, { A2: 200, B1: 200, B2: 25, C1: 20 });
  assert.equal(PHRASES.length, 445);
});

test('every published phrase has three real-life examples and complete metadata', () => {
  for (const item of PHRASES) {
    assert.ok(item.phrase && item.explanation && item.ru && item.level);
    assert.equal(item.examples.length, 3, item.id);
    assert.ok(item.examples.every(example => typeof example === 'string' && example.length > 12), item.id);
    assert.equal(item.cloze, true);
  }
});

test('route blocks do not repeat the same learning phrase', () => {
  const normalise = value => value.toLocaleLowerCase('en').replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  for (const level of ['A2', 'B1']) {
    const phrases = PHRASES.filter(item => item.level === level).map(item => normalise(item.phrase));
    assert.equal(new Set(phrases).size, phrases.length, level);
  }
});

test('repeat taps on the same day cannot farm review XP', () => {
  const start = Date.parse('2026-01-01T12:00:00Z');
  const introduced = reviewItem(undefined, 'intro', start, 'intro').item;
  const first = reviewItem(introduced, 'context', start + 1000, 'one');
  const repeat = reviewItem(first.item, 'context', start + 2000, 'two');
  assert.equal(first.xp, 8);
  assert.equal(repeat.xp, 0);
  assert.equal(repeat.item.days.length, 1);
});

test('verified mastery requires distinct days, context evidence and long retention', () => {
  const start = Date.parse('2026-01-01T12:00:00Z');
  let state = reviewItem(undefined, 'intro', start, 'intro').item;
  const reviewDays = [0, 1, 3, 5, 8, 12, 30];
  reviewDays.forEach((offset, index) => {
    state = reviewItem(state, index % 2 ? 'recall' : 'context', start + offset * DAY + 2000, `r${index}`).item;
  });
  assert.equal(state.v, true);
  assert.equal(state.s, 'MASTERED');
  assert.ok(state.days.length >= 4);
  assert.ok(state.ctx >= 2);
});

test('very well known items wait for delayed verification and receive no early course credit', () => {
  const start = Date.parse('2026-02-01T12:00:00Z');
  const known = reviewItem(undefined, 'known', start, 'known');
  assert.equal(known.item.s, 'SELF_KNOWN');
  assert.equal(known.item.v, false);
  assert.equal(known.xp, 0);
  assert.equal(isDue(known.item, start + 34 * DAY), false);
  assert.equal(isDue(known.item, start + 35 * DAY), true);
  const control = reviewItem(known.item, 'recall', start + 35 * DAY + 1000, 'control');
  assert.equal(control.item.s, 'MASTERED');
  assert.equal(control.item.v, true);
  assert.equal(control.item.known, true);
  assert.equal(isDue(control.item, start + 100 * DAY), false);
});

test('failing delayed known verification returns an item to learning', () => {
  const start = Date.parse('2026-02-01T12:00:00Z');
  const known = reviewItem(undefined, 'known', start, 'known').item;
  const failed = reviewItem(known, 'wrong', start + 35 * DAY, 'failed').item;
  assert.equal(failed.s, 'LEARNING');
  assert.equal(failed.known, false);
  assert.equal(failed.v, false);
});

test('failed items return only after other tasks and with another task type', () => {
  const items = PHRASES.filter(item => item.level === 'B1').slice(0, 5);
  const queue = queueRecovery([], items[0].id, 'recognition', 2);
  assert.equal(queue[0].dueStep, 5);
  const tooEarly = chooseTask(items, {}, {step:3,recent:[],recoveryQueue:queue,newCount:0,minutes:15});
  assert.notEqual(tooEarly.recovery, true);
  const recovered = chooseTask(items, {}, {step:5,recent:[items[2].id,items[3].id],recoveryQueue:queue,newCount:0,minutes:15});
  assert.equal(recovered.item.id, items[0].id);
  assert.equal(recovered.type, 'recall');
  assert.equal(recovered.recovery, true);
});

test('recognition alone cannot create verified mastery', () => {
  const start = Date.parse('2026-01-01T12:00:00Z');
  let state = reviewItem(undefined, 'intro', start, 'intro').item;
  for (let day = 1; day <= 60; day += 5) state = reviewItem(state, 'recognition', start + day * DAY, `r-${day}`).item;
  assert.equal(state.v, false);
});

test('examples rotate instead of always showing the first sentence', () => {
  const item = PHRASES.find(entry => entry.id === 'p030');
  assert.notEqual(rotatingExample(item, 0), rotatingExample(item, 1));
  assert.equal(rotatingExample(item, 3), rotatingExample(item, 0));
});

test('edited phrase families contain distinct natural variations', () => {
  const enriched = PHRASES.filter(item => item.variations?.length);
  assert.ok(enriched.length >= 20);
  for (const item of enriched) {
    assert.ok(item.variations.length >= 4, item.id);
    assert.equal(new Set(item.variations).size, item.variations.length, item.id);
  }
});

test('course points count verified knowledge, not clicks or practice XP', () => {
  const items = PHRASES.filter(item => item.level === 'B1').slice(0, 3);
  const progress = {
    [items[0].id]: { s: 'MASTERED', v: true, xp: 20 },
    [items[1].id]: { s: 'MASTERED', v: false, known: true, xp: 50 },
    [items[2].id]: { s: 'LEARNING', v: false, xp: 100 }
  };
  const result = courseProgress(items, progress);
  assert.equal(result.verified, 1);
  assert.equal(result.points, 10);
  assert.equal(result.targetPoints, COURSE_SIZE * 10);
});

test('a milestone needs 100 verified units and an 8/10 checkpoint', () => {
  const items = PHRASES.filter(item => item.level === 'B1');
  const progress = Object.fromEntries(items.map(item => [item.id, { s: 'MASTERED', v: true }]));
  assert.equal(checkpointCandidates(items, progress, 1).length, 10);
  let wallet = { earned: {}, spent: {} };
  assert.equal(awardMilestone(wallet, 'B1', 1, 7, 100), wallet);
  wallet = awardMilestone(wallet, 'B1', 1, 8, 100, 1000);
  assert.equal(balanceOf(wallet), 100);
  const duplicate = awardMilestone(wallet, 'B1', 1, 10, 100, 2000);
  assert.deepEqual(duplicate, wallet);
});

test('the second 100-unit checkpoint is available only after 200 verified units', () => {
  const items = PHRASES.filter(item => item.level === 'B1');
  const first199 = Object.fromEntries(items.slice(0, 199).map(item => [item.id, { s: 'MASTERED', v: true }]));
  assert.equal(checkpointCandidates(items, first199, 2).length, 0);
  const all200 = Object.fromEntries(items.map(item => [item.id, { s: 'MASTERED', v: true }]));
  assert.equal(checkpointCandidates(items, all200, 2).length, 10);
});

test('checkpoint measures several skills rather than one repeated choice format', () => {
  const items = PHRASES.filter(item => item.level === 'B1');
  const progress = Object.fromEntries(items.map(item => [item.id,{s:'MASTERED',v:true}]));
  const tasks = buildCheckpoint(items, progress, 1, COLLOCATIONS, LISTENING_LESSONS, 'B1');
  assert.equal(tasks.length, 10);
  assert.ok(new Set(tasks.map(task => task.type)).size >= 5);
  assert.equal(tasks.filter(task => task.type === 'recall').length, 2);
  assert.equal(tasks.filter(task => task.type === 'listening').length, 2);
});

test('gift requests spend only earned virtual credit and are idempotent', () => {
  let wallet = awardMilestone({ earned: {}, spent: {} }, 'B1', 1, 10, 100, 1000);
  const gift = { title: 'A date together', cost: 50 };
  wallet = redeem(wallet, gift, 'request-1', 2000);
  assert.equal(balanceOf(wallet), 50);
  const same = redeem(wallet, gift, 'request-1', 3000);
  assert.deepEqual(same, wallet);
  const tooExpensive = redeem(wallet, { title: 'Trip', cost: 400 }, 'request-2', 4000);
  assert.deepEqual(tooExpensive, wallet);
});

test('one completed morning and evening session can each earn a one-time reward', () => {
  const morning = Date.parse('2026-09-20T05:15:00Z');
  const evening = Date.parse('2026-09-20T16:15:00Z');
  const session = { plannedMs: 15 * 60000, spentSeconds: 12 * 60, answers: 8, correct:6, taskCounts:{recognition:8}, successByType:{recognition:6} };
  let wallet = { earned:{}, spent:{}, goals:{}, incoming:{} };
  wallet = awardRoutine(wallet, session, morning).wallet;
  wallet = awardRoutine(wallet, session, morning + 1000).wallet;
  wallet = awardRoutine(wallet, session, evening).wallet;
  assert.equal(balanceOf(wallet), 2);
  assert.equal(Object.keys(wallet.earned).length, 2);
  assert.equal(awardRoutine(wallet, { ...session, spentSeconds: 60 }, evening + 1000).awarded, 0);
});

test('$1/$2/$3 rewards measure quality and recognition farming cannot earn more', () => {
  const base = { plannedMs:15*60000, spentSeconds:12*60, answers:10 };
  const farming = evaluateSessionReward({ ...base, correct:10, taskCounts:{recognition:10}, successByType:{recognition:10}, dueSuccess:0 });
  assert.equal(farming.amount, 1);
  const strong = evaluateSessionReward({ ...base, correct:8, taskCounts:{recognition:2,context:3,recall:3}, successByType:{recognition:2,context:2,recall:2}, dueSuccess:2 });
  assert.equal(strong.amount, 2);
  const excellent = evaluateSessionReward({ ...base, correct:9, taskCounts:{recognition:2,context:3,recall:3,listening:2}, successByType:{recognition:2,context:3,recall:2,listening:2}, recovered:1, dueSuccess:3 });
  assert.equal(excellent.amount, 3);
  const short = evaluateSessionReward({ ...excellent, plannedMs:5*60000, spentSeconds:4*60 });
  assert.ok(short.amount <= 2);
});

test('collocations are level-aware and keep independent SRS records', () => {
  assert.ok(COLLOCATIONS.some(item => item.level === 'A2'));
  assert.ok(COLLOCATIONS.some(item => item.level === 'B1'));
  assert.ok(COLLOCATIONS.some(item => item.level === 'B2'));
  assert.ok(COLLOCATIONS.some(item => item.level === 'C1'));
  const phrase = reviewItem(undefined, 'context', 1000, 'phrase').item;
  const collocation = reviewItem(undefined, 'wrong', 1000, 'collocation').item;
  assert.notDeepEqual(phrase, collocation);
});

test('B1 listening rotates across B1 lessons instead of falling back to A2', () => {
  const first = chooseListeningLesson(LISTENING_LESSONS, 'B1', {}, []);
  const second = chooseListeningLesson(LISTENING_LESSONS, 'B1', {}, [first.id]);
  assert.equal(first.level, 'B1');
  assert.equal(second.level, 'B1');
  assert.notEqual(first.id, second.id);
});

test('IELTS data is original app content, mode-safe and separate from CEFR cards', () => {
  assert.ok(IELTS_TASKS.length >= 10);
  assert.ok(IELTS_TASKS.every(task => ['Both','Academic','General'].includes(task.mode)));
  assert.ok(tasksForMode('Academic','Writing').every(task => task.mode !== 'General'));
  assert.ok(tasksForMode('General','Writing').every(task => task.mode !== 'Academic'));
  assert.ok(IELTS_TASKS.every(task => !PHRASES.some(item => item.id === task.id)));
});

test('a learner can add a bounded personal reward goal', () => {
  const wallet = addGoal({ earned:{}, spent:{}, goals:{}, incoming:{} }, 'Наушники', 40, 'goal-1', 1000);
  assert.equal(wallet.goals['goal-1'].title, 'Наушники');
  assert.equal(wallet.goals['goal-1'].cost, 40);
  assert.equal(addGoal(wallet, '', 0, 'bad'), wallet);
});

test('compact cloud format round-trips defaults without undefined corruption', () => {
  const packed = packItems({ p001: { s: 'LEARNING', l: 10, days: ['2026-01-01'] } });
  const unpacked = unpackItems(packed);
  assert.equal(unpacked.p001.s, 'LEARNING');
  assert.equal(unpacked.p001.c, 0);
  assert.equal(unpacked.p001.w, 0);
  assert.deepEqual(unpacked.p001.days, ['2026-01-01']);
});

test('400 progress records stay below the Telegram limit in 64 buckets', () => {
  const records = Object.fromEntries(Array.from({ length: 400 }, (_, index) => [`unit-${index + 1}`, { s:'STABLE', c:4, w:1, l:123456789, n:223456789, f:100000000, step:4, rec:1, ctx:2, days:['2026-01-01','2026-01-02','2026-01-05','2026-02-01'], xp:31, v:false, known:false, rewardDay:'2026-02-01', event:`session-123456789-step-${index}` }]));
  const hash = id => [...id].reduce((number, char) => (number * 31 + char.charCodeAt(0)) >>> 0, 0) % 64;
  for (let bucket = 0; bucket < 64; bucket += 1) {
    const subset = Object.fromEntries(Object.entries(records).filter(([id]) => hash(id) === bucket));
    assert.ok(JSON.stringify(packItems(subset)).length <= 4096, `bucket ${bucket}`);
  }
});

test('study dates use the learner timezone rather than UTC day boundaries', () => {
  assert.equal(dayKey(Date.parse('2026-09-19T22:30:00Z')), '2026-09-20');
});

test('pair codes are short, uppercase and safe to type on a phone', () => {
  assert.equal(normalisePairCode(' ab-12z!9 '), 'AB12Z9');
  assert.equal(normalisePairCode('abcdefgh'), 'ABCDEF');
});

test('automatic couple sync merges partner progress and gift decisions', () => {
  const wallet = {
    earned: { routine: { amount: 2 } },
    spent: { 'request-1': { title: 'Наушники', cost: 40, status: 'pending', at: 1000 } },
    goals: {}, incoming: {}
  };
  const merged = mergeCoupleSnapshot(wallet, {
    partner: { displayName: 'Anna', level: 'A2', percent: 18, balance: 12, todayMinutes:30, morningDone:true, goals:[{id:'goal-anna',title:'AirPods',cost:180,active:true,at:1000}], updatedAt: '2026-09-21T10:00:00Z' },
    incoming: [{ id: 'request-2', title: 'Свидание', cost: 30, from: 'Anna', status: 'pending', createdAt: '2026-09-21T09:00:00Z', updatedAt: '2026-09-21T09:00:00Z' }],
    outgoing: [{ id: 'request-1', status: 'approved', createdAt: '2026-09-21T08:00:00Z', updatedAt: '2026-09-21T11:00:00Z', resolvedAt: '2026-09-21T11:00:00Z' }]
  });
  assert.equal(merged.partner.name, 'Anna');
  assert.equal(merged.partner.percent, 18);
  assert.equal(merged.partner.todayMinutes, 30);
  assert.equal(merged.partner.goals[0].title, 'AirPods');
  assert.equal(merged.incoming['request-2'].automatic, true);
  assert.equal(merged.spent['request-1'].status, 'approved');
  assert.equal(merged.spent['request-1'].automatic, true);
});

console.log(`\n${checks} checks passed.`);
