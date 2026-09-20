import assert from 'node:assert/strict';
import { AVAILABLE_BY_LEVEL, PHRASES } from '../src/catalog.js';
import {
  COURSE_SIZE,
  DAY,
  awardMilestone,
  balanceOf,
  checkpointCandidates,
  courseProgress,
  dayKey,
  redeem,
  reviewItem
} from '../src/learning.js';
import { packItems, unpackItems } from '../src/storage-v3.js';

let checks = 0;
function test(name, fn) {
  try { fn(); checks += 1; console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}`); throw error; }
}

test('published catalogue has stable IDs and the intended first route blocks', () => {
  assert.equal(new Set(PHRASES.map(item => item.id)).size, PHRASES.length);
  assert.equal(PHRASES[0].id, 'p001');
  assert.equal(PHRASES[99].id, 'p100');
  assert.deepEqual(AVAILABLE_BY_LEVEL, { A2: 100, B1: 100, B2: 25, C1: 20 });
  assert.equal(PHRASES.length, 245);
});

test('every published phrase has three real-life examples and complete metadata', () => {
  for (const item of PHRASES) {
    assert.ok(item.phrase && item.explanation && item.ru && item.level);
    assert.equal(item.examples.length, 3, item.id);
    assert.ok(item.examples.every(example => typeof example === 'string' && example.length > 12), item.id);
    assert.equal(item.cloze, true);
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

test('self-reported knowledge stays mastered but receives no instant course credit', () => {
  const start = Date.parse('2026-02-01T12:00:00Z');
  const known = reviewItem(undefined, 'known', start, 'known');
  assert.equal(known.item.s, 'MASTERED');
  assert.equal(known.item.v, false);
  assert.equal(known.xp, 0);
  const control = reviewItem(known.item, 'recall', start + 30 * DAY + 1000, 'control');
  assert.equal(control.item.s, 'MASTERED');
  assert.equal(control.item.v, false);
  assert.equal(control.xp, 5);
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

console.log(`\n${checks} checks passed.`);
