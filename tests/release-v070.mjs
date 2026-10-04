import assert from 'node:assert/strict';
import {LEXICON,lexiconForLevel,progressFor} from '../src/lexicon.js';
import {DAY,reviewItem,courseProgress,balanceOf,levelCompletionId} from '../src/learning.js';
import {isSecured,readyForCheck} from '../src/mastery.js';
import {vocabularyTask} from '../src/vocabulary-tasks.js';
import {optionsFor,makeSession,resumeVocabularySession} from '../src/lesson-engine.js';
import {isAnswerCorrect} from '../src/answer-check.js';
import {sentenceRule} from '../src/sentence-rules.js';
import {pendingCheckpoint,makeCheckpoint,finishCheckpoint,masteryCheckCandidates} from '../src/checkpoint.js';
import {packItems,unpackItems} from '../src/storage-v3.js';
import {backupRecords,mergeBackup} from '../src/private-backup.js';
import {mergeCoupleSnapshot} from '../src/couple-sync.js';
import {readyItem,securedItem} from './learning-fixtures.mjs';
const now=Date.parse('2026-10-04T06:00:00Z'),pool=lexiconForLevel('B1');
const wallet=()=>({earned:{old:{amount:30,at:now-DAY}},spent:{},goals:{},incoming:{}}),stats=()=>({lessons:{},byDay:{}});
let checked=0,types=new Set();
for(const item of LEXICON)for(const type of ['recognition','recall','context','write'])for(let index=0;index<3;index++) {
  const task=vocabularyTask(item,type,lexiconForLevel(item.level),index,{optionsFor});types.add(task.type);
  assert.ok(task.prompt && task.answer,item.id);assert.ok(isAnswerCorrect(task,task.answer),item.id);
  assert.ok(!['meaning','order'].includes(task.type));
  if(task.type==='context') {assert.ok(task.typed);assert.ok(task.prompt.includes('_____'));assert.equal(task.prompt.replace('_____',task.answer),task.example.en);assert.equal(task.options,undefined);}
  if(task.type==='write') {assert.ok(task.typed && task.rule);assert.equal(task.prompt,task.example.ru);assert.equal(task.tokens,undefined);assert.ok(!JSON.stringify(task.rule).includes(task.answer),item.id);}
  if(task.type==='recognition') {assert.equal(task.prompt,item.phrase);assert.equal(task.answer,item.ru);assert.equal(task.options.filter(o=>o===task.answer).length,1);assert.equal(new Set(task.options).size,task.options.length);}
  checked++;
}
assert.deepEqual(types,new Set(['recognition','recall','context','write']));
console.log(`✓ audited ${checked} generated vocabulary variants across all ${LEXICON.length} level cards`);
const ended=LEXICON.find(i=>i.phrase==='I ended up...');assert.ok(ended);
const t=vocabularyTask(ended,'context',pool,1,{optionsFor});
assert.notEqual(t.type,'meaning');assert.ok(!t.options);assert.ok(!t.promptRu);
assert.equal(sentenceRule('I have already sent the report.').title,'Present Perfect');
assert.equal(sentenceRule('I sent the report yesterday.').title,'Past Simple');
assert.equal(sentenceRule('We missed the bus and ended up walking home.').title,'Past Simple');
assert.equal(sentenceRule("I'm working from home.").title,'Present Continuous');
console.log('✓ the reported ended-up situation is not paired with a first-person meaning choice; tense rules contain no full answer');

const unproven=Object.fromEntries(pool.map(i=>[i.id,{s:'LEARNING',c:1,w:1,known:true,v:true}]));
assert.equal(courseProgress(pool,unproven).percent,0);assert.equal(pendingCheckpoint(pool,unproven,wallet(),stats(),'B1',now),null);
let p=reviewItem(undefined,'intro',now-8*DAY).item;
for(const offset of [-8,-4,0])p=reviewItem(p,'recall',now+offset*DAY,`recall-${offset}`,{typed:true,unaided:true}).item;
assert.equal(isSecured(p),false);assert.equal(readyForCheck(p,now),true);
p=reviewItem(p,'recall',now+1000,'check',{typed:true,unaided:true,checkpoint:true}).item;
assert.equal(isSecured(p),true);assert.equal(p.s,'MASTERED');
const before=p.proofDays.length;
p=reviewItem(p,'recall',now+2000,'repeat',{typed:true,unaided:true}).item;
assert.equal(p.proofDays.length,before);
let retained=p;
for(let day=10;day<=100;day+=10) {
  retained=reviewItem(retained,'recall',now+day*DAY,`retained-${day}`,{typed:true,unaided:true}).item;
  assert.equal(isSecured(retained),true);
  assert.equal(retained.proofDays.length,before);
}
const lapsed=reviewItem(p,'wrong',now+3000,'lapse').item;
assert.equal(isSecured(lapsed),false);assert.deepEqual(lapsed.proofDays,[]);
let aided=reviewItem(undefined,'intro',now-8*DAY).item;
for(const offset of [-8,-4,0])aided=reviewItem(aided,'recall',now+offset*DAY,`aided-${offset}`,{typed:true,unaided:false}).item;
assert.equal(readyForCheck(aided,now),false);assert.equal(isSecured(aided),false);
const known=reviewItem(p,'known',now).item;assert.equal(isSecured(known),false);assert.equal(known.n,now+35*DAY);
console.log('✓ route needs spaced unaided production plus a check; choice, hint, repeated taps, error and self-claim cannot create mastery');

const progress=Object.fromEntries(pool.slice(0,5).map(i=>[i.id,readyItem(now)]));
let w=wallet(),s=stats();const descriptor=pendingCheckpoint(pool,progress,w,s,'B1',now);
assert.equal(descriptor.count,5);assert.equal(descriptor.amount,5);
const check=makeCheckpoint(pool,progress,'B1',descriptor,now);assert.equal(check.tasks.length,5);assert.ok(check.tasks.every(t=>t.typed));
for(const task of check.tasks)progress[task.item.id]=reviewItem(progress[task.item.id],'recall',now+1000,task.item.id,{typed:true,checkpoint:true}).item;
const settled=finishCheckpoint(w,s,{...check,score:5},pool,progress,now+120000);
assert.equal(balanceOf(settled.wallet),35);assert.equal(settled.check.awarded,5);assert.equal(courseProgress(pool,progress).verified,5);
assert.equal(finishCheckpoint(settled.wallet,settled.stats,check,pool,progress,now+120001).duplicate,true);
assert.equal(pendingCheckpoint(pool,progress,settled.wallet,settled.stats,'B1',now+120001),null);
assert.equal(masteryCheckCandidates(pool,progress,settled.wallet,'B1',now+DAY).items.length,0);
const recheckProgress=Object.fromEntries(pool.slice(0,5).map(i=>[i.id,readyItem(now+8*DAY)]));
const review=pendingCheckpoint(pool,recheckProgress,settled.wallet,settled.stats,'B1',now+8*DAY);
assert.ok(review.retest);assert.equal(review.amount,0);
const reviewCheck=makeCheckpoint(pool,recheckProgress,'B1',review,now+8*DAY);
const reviewed=finishCheckpoint(settled.wallet,settled.stats,{...reviewCheck,score:5},pool,recheckProgress,now+8*DAY+120000);
assert.equal(reviewed.check.checkReward,0);assert.equal(balanceOf(reviewed.wallet),36);
assert.equal(settled.wallet.earned.old.amount,30);
console.log('✓ 5-card mastery check replaces a lesson, pays $5 once, preserves old earnings and prevents repeat-batch farming');

assert.deepEqual(unpackItems(packItems({card:p})).card,p);
const input={settings:{level:'B1'},level:'B1',progress:{card:p},wallet:settled.wallet,stats:settled.stats,draft:{at:now,data:check}};
const restored=mergeBackup({...input,progress:{},draft:null},backupRecords(input));
assert.deepEqual(restored.progress.card,p);assert.equal(restored.draft.data.id,check.id);assert.deepEqual(restored.wallet.earned,settled.wallet.earned);
const legacy={...makeSession('B1',15,0,now),programmeVersion:'vocabulary-2',remainingMs:123000,answers:12,task:{type:'order'}};
const resumed=resumeVocabularySession(legacy,{});
assert.equal(resumed.id,legacy.id);assert.equal(resumed.remainingMs,123000);assert.equal(resumed.answers,12);assert.notEqual(resumed.task.type,'order');
const oldPartner=mergeCoupleSnapshot(wallet(),{partner:{displayName:'Anna',level:'A2',percent:74,balance:39}});
assert.equal(oldPartner.partner.vocabulary,null);
const freshPartner=mergeCoupleSnapshot(wallet(),{partner:{displayName:'Anna',level:'A2',vocabulary:{version:1,total:426,introduced:320,verified:9,ready:11},balance:39}});
assert.equal(freshPartner.partner.vocabulary.verified,9);assert.equal(freshPartner.partner.balance,39);
const all=Object.fromEntries(lexiconForLevel('A2').map(i=>[i.id,securedItem(now)]));
const final=makeCheckpoint(lexiconForLevel('A2'),all,'A2',0,now);assert.equal(final.tasks.length,20);
const graduated=finishCheckpoint(wallet(),stats(),{...final,score:16},lexiconForLevel('A2'),all,now+300000);
assert.equal(graduated.wallet.earned[levelCompletionId('A2')].amount,100);
console.log('✓ proof, accounts, money and drafts survive backups; stale partner percentages are not called mastery; final still pays once');
