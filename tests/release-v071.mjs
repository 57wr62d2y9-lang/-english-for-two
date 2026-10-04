import assert from 'node:assert/strict';
import {isAnswerCorrect,normaliseAnswer,sentenceForms} from '../src/answer-check.js';
import {sentenceFeedback} from '../src/sentence-feedback.js';
import {reviewItem,DAY,courseProgress,balanceOf} from '../src/learning.js';
import {isSecured} from '../src/mastery.js';
import {makeSession,reviewActionFor,phraseTask,applySessionEvidence} from '../src/lesson-engine.js';
import {vocabularyTask} from '../src/vocabulary-tasks.js';
import {lexiconForLevel} from '../src/lexicon.js';
import {pendingCheckpoint,makeCheckpoint,buildFinalCheck,resumeCheckpoint,finishCheckpoint} from '../src/checkpoint.js';
import {packItems,unpackItems} from '../src/storage-v3.js';
import {backupRecords,mergeBackup} from '../src/private-backup.js';
import {securedItem,readyItem} from './learning-fixtures.mjs';
import {lessonViewportHeight} from '../src/lesson-layout.js';
const now=Date.parse('2026-10-04T09:00:00Z'),pool=lexiconForLevel('B1');
const equal=[
  ['I have already sent the report.',"I've sent the report already."],
  ['She has already finished.',"She's finished already."],
  ['We had already left.',"We'd left already."],
  ['Could you please help me?','Could you help me, please?'],
  ['Please would you call me?','Would you please call me?'],
  ['Can I please leave early?','Can I leave early, please?'],
  ['I think that she is right.',"I think she's right."],
  ['We believe that they know.','We believe they know.'],
  ['He said that he was tired.','He said he was tired.'],
  ['I do not think that she has left.',"I don't think she's left."],
  ['Yesterday, I visited a café.','I visited a cafe yesterday.'],
  ['I will travel tomorrow.',"Tomorrow, I'll travel."],
  ['We are working today.',"Today we're working."],
  ['My favourite theatre cancelled the programme.','My favorite theater canceled the program.']
];
for(const [answer,value] of equal)for(const [a,b] of [[answer,value],[value,answer]])assert.equal(isAnswerCorrect({type:'write',answer:a},b),true,`${a} <> ${b}`);
const unequal=[
  ['I have already sent the report.','I sent the report already.'],
  ['I have already sent the report.','I have not sent the report already.'],
  ['I have already sent the report.','She has sent the report already.'],
  ['I have already sent the report.','I have sent already the report.'],
  ['I have already sent the report.','I have sent report already.'],
  ['I have just sent the report.','I have sent the report just.'],
  ['Could you please help me?','Could you help me?'],
  ['I think that she is right.','I think she are right.'],
  ['I know the book that won.','I know the book won.'],
  ['I have already sent the report so she can read it.','I have sent the report so she can read it already.'],
  ['I visited the cafe yesterday.','Tomorrow, I visited the cafe.']
];
for(const [answer,value] of unequal)assert.equal(isAnswerCorrect({type:'write',answer},value),false,value);
assert.equal(isAnswerCorrect({type:'context',answer:'I think that'},'I think'),false);
assert.equal(normaliseAnswer('ёж'),'ёж');assert.equal(normaliseAnswer('café'),'cafe');
assert.ok(sentenceForms("He's done.").length<=64);
assert.match(sentenceFeedback({answer:'I have sent it.'},'I have not sent it.').title,/отрицание/);
assert.match(sentenceFeedback({answer:'I have sent it.'},'She has sent it.').title,/кто/);
assert.match(sentenceFeedback({answer:'I have sent it.'},'I sent it yesterday.').title,/Present Perfect/);
console.log('✓ written variants accept documented alternatives, accents and spellings; tense, person, negation, articles and clause boundaries remain checked');

const item=pool[0],original=reviewItem(securedItem(now,{n:now+30*DAY}),'intro',now-1000).item;
const write={type:'write',item,progressId:item.id,key:item.id+':write',category:'write',answer:'I have already sent the report.'};
assert.equal(reviewActionFor(write,false),'sentenceRetry');
const attempted=reviewItem(original,reviewActionFor(write,false),now,'writing-attempt').item;
assert.equal(isSecured(attempted),true);assert.deepEqual(attempted.proofDays,original.proofDays);assert.equal(attempted.checkAt,original.checkAt);
assert.equal(attempted.lastWrong,original.lastWrong);assert.equal(attempted.w,original.w);assert.equal(attempted.c,original.c);
assert.equal(attempted.sentenceRetries,1);assert.equal(attempted.sentenceRecallPending,true);assert.equal(attempted.n,now+DAY);
assert.deepEqual(reviewItem(attempted,'sentenceRetry',now,'writing-attempt').item,attempted);
const focused=phraseTask({item,type:'recall'},pool,{[item.id]:attempted},makeSession('B1',15,0,now+DAY));
assert.equal(focused.type,'recall');assert.equal(focused.typed,true);
const recovered=reviewItem(attempted,'recall',now+DAY,'focused-recall',{typed:true,unaided:true}).item;
assert.equal(recovered.sentenceRecallPending,false);assert.equal(isSecured(recovered),true);
const forgotten=reviewItem(attempted,'wrong',now+DAY,'focused-error',{typed:true,unaided:true}).item;
assert.equal(isSecured(forgotten),false);assert.deepEqual(forgotten.proofDays,[]);assert.equal(forgotten.w,original.w+1);
const evidence=applySessionEvidence(makeSession('B1'),write,false);
assert.equal(evidence.answers,1);assert.equal(evidence.recoveryQueue[0].nextType,'recall');
assert.equal(courseProgress(pool,{[item.id]:attempted}).verified,1);
console.log('✓ a free-translation mismatch preserves vocabulary proof and requests focused recall; an actual recall error still removes mastery');

assert.deepEqual(unpackItems(packItems({[item.id]:attempted}))[item.id],attempted);
const wallet={earned:{old:{at:now-DAY,amount:30}},spent:{},goals:{}};
const state={settings:{level:'B1',updatedAt:now},level:'B1',progress:{[item.id]:attempted},stats:{lessons:{},byDay:{}},wallet};
const restored=mergeBackup({...state,progress:{}},backupRecords(state));
assert.equal(restored.progress[item.id].sentenceRecallPending,true);assert.equal(balanceOf(restored.wallet),30);
const ready=Object.fromEntries(pool.slice(0,5).map(i=>[i.id,readyItem(now)]));
const descriptor=pendingCheckpoint(pool,ready,wallet,state.stats,'B1',now),check=makeCheckpoint(pool,ready,'B1',descriptor,now);
assert.equal(check.version,6);assert.ok(check.tasks.every(t=>t.typed&&['recall','context'].includes(t.type)));
const legacyWrite=vocabularyTask(item,'write',pool,0);
const paused={...check,version:5,index:1,score:1,selected:'submitted',tasks:check.tasks.map(()=>legacyWrite)};
const resumed=resumeCheckpoint(paused,pool);
assert.equal(resumed.id,paused.id);assert.equal(resumed.rewardId,paused.rewardId);assert.equal(resumed.score,1);
assert.deepEqual(resumed.tasks[0],paused.tasks[0]);assert.deepEqual(resumed.tasks[1],paused.tasks[1]);
assert.ok(resumed.tasks.slice(2).every(t=>t.type==='recall'));
const settled=finishCheckpoint(wallet,state.stats,{...check,score:4},pool,ready,now+120000);
assert.equal(settled.check.awarded,5);assert.equal(balanceOf(settled.wallet),35);
assert.equal(finishCheckpoint(settled.wallet,settled.stats,check,pool,ready,now+130000).duplicate,true);
const all=Object.fromEntries(pool.map(i=>[i.id,securedItem(now)]));
assert.equal(buildFinalCheck(pool,all,'B1').length,20);
assert.ok(buildFinalCheck(pool,all,'B1').every(t=>['recall','context'].includes(t.type)));
console.log('✓ writing state survives backups; paused checks preserve answered work and IDs; vocabulary-only checks retain payout and duplicate protection');
assert.equal(lessonViewportHeight({innerHeight:680,visualViewport:{height:350},Telegram:{WebApp:{viewportStableHeight:680}}}),350);
assert.equal(lessonViewportHeight({innerHeight:680,visualViewport:{height:680},Telegram:{WebApp:{viewportStableHeight:600}}}),600);
assert.equal(lessonViewportHeight({innerHeight:680,visualViewport:{height:0}}),680);
console.log('✓ keyboard height takes precedence over stale browser/Telegram heights without requesting new account or device access');
