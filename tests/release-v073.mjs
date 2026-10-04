import assert from 'node:assert/strict';
import {reviewItem,courseProgress,DAY} from '../src/learning.js';
import {isSecured,readyForCheck,legacyRecallDays} from '../src/mastery.js';
import {lexiconForLevel} from '../src/lexicon.js';
import {packItems,unpackItems} from '../src/storage-v3.js';
import {masteryCheckCandidates,makeCheckpoint} from '../src/checkpoint.js';

const now=Date.parse('2026-10-04T09:00:00Z');
const legacy={s:'STABLE',c:8,w:0,rcl:3,ctx:2,days:['2026-09-15','2026-09-20','2026-09-28'],
  f:Date.parse('2026-09-15T09:00:00Z'),l:Date.parse('2026-09-28T09:00:00Z'),
  lastCorrect:Date.parse('2026-09-28T09:00:00Z'),n:now+10*DAY};
const original=structuredClone(legacy);
assert.equal(readyForCheck(legacy,now),true);
assert.equal(isSecured(legacy),false);
const ordinary=reviewItem(legacy,'recall',now,'ordinary',{typed:true,unaided:true}).item;
assert.equal(isSecured(ordinary),false);
assert.equal(readyForCheck(ordinary,now),true,'a first new lesson must not erase legacy check eligibility');
const checked=reviewItem(ordinary,'recall',now+1000,'legacy-check',{typed:true,unaided:true,checkpoint:true}).item;
assert.equal(isSecured(checked),true);
assert.ok(checked.proofDays.includes('2026-09-15'));
assert.equal(isSecured(unpackItems(packItems({sample:checked})).sample),true);
assert.deepEqual(legacy,original);
for(const evidence of [{typed:true,unaided:false,checkpoint:true},{typed:false,unaided:true,checkpoint:true}]) {
  assert.equal(isSecured(reviewItem(legacy,'recall',now,'hinted',evidence).item),false);
}
const failed=reviewItem(checked,'wrong',now+2000,'failed',{typed:true,checkpoint:true}).item;
assert.equal(isSecured(failed),false);
assert.equal(readyForCheck(failed,now+2000),false);
assert.deepEqual(legacyRecallDays({...legacy,lastWrong:Date.parse('2026-09-25T09:00:00Z')},now),[]);
assert.equal(readyForCheck({...legacy,days:['2026-09-15','2026-09-28']},now),false);
const future=now+20*DAY;
const newHistory={...legacy,f:now,days:['2026-10-04','2026-10-10','2026-10-20'],l:future,lastCorrect:future};
assert.equal(readyForCheck(newHistory,future),false,'post-release ambiguous repetitions cannot use migration');
assert.equal(isSecured(reviewItem(newHistory,'recall',future,'new-check',{typed:true,checkpoint:true}).item),false);
const retained=reviewItem(checked,'recall',now+90*DAY,'later-check',{typed:true,checkpoint:true}).item;
assert.deepEqual(retained.proofDays,checked.proofDays);
assert.equal(isSecured(retained),true);
const pool=lexiconForLevel('B1'),progress=Object.fromEntries(pool.slice(0,5).map(item=>[item.id,structuredClone(legacy)]));
assert.equal(courseProgress(pool,progress,'B1').verified,0);
assert.equal(courseProgress(pool,progress,'B1').ready,5);
const candidates=masteryCheckCandidates(pool,progress,{earned:{}},'B1',now);
assert.equal(candidates.items.length,5);
const descriptor={mode:'mastery',itemIds:candidates.items.map(i=>i.id),count:5};
const check=makeCheckpoint(pool,progress,'B1',descriptor,now);
assert.equal(check.tasks.length,5);
for(const task of check.tasks)progress[task.item.id]=reviewItem(progress[task.item.id],task.type==='recall'?'recall':'context',now+1000,task.item.id,{typed:true,checkpoint:true}).item;
assert.equal(courseProgress(pool,progress,'B1').verified,5);
console.log('✓ preserved pre-release spaced repetitions become secured only after an unaided new check; ordinary answers, hints, failures and recent history cannot grant migration mastery');
