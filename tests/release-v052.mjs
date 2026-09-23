import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isAnswerCorrect,makeSession,applySessionEvidence,normaliseAnswer} from '../src/lesson-engine.js';
import {answerForms} from '../src/answer-check.js';
import {lexiconForLevel} from '../src/lexicon.js';
import {balanceOf,dayKey,routineRewardId} from '../src/learning.js';
import {finishStudySession,completedStudyDays,attendanceProgress} from '../src/rewards.js';
import {backupRecords,mergeBackup} from '../src/private-backup.js';

let count=0;const test=(name,fn)=>{fn();count++;console.log('✓ '+name);};
test('the reported room-booking answer is correct with straight/curly apostrophes, full words and capitals',()=>{
  const item=lexiconForLevel('A2').find(item=>item.id==='a2_012');
  for(const value of ["I would like to book a room","I'd like to book a room.",'I’d like to book a room.','Iʼd like to book a room.','  I WOULD LIKE TO BOOK A ROOM!  '])assert.equal(isAnswerCorrect({answer:item.phrase},value),true,value);
  assert.equal(isAnswerCorrect({answer:'I would like to book a room.'},item.phrase),true);
});
test('common contractions work in both directions without requiring an exact spelling',()=>{
  const pairs=[['I’m ready.','I am ready.'],['You’re welcome.','You are welcome.'],['We’ve already eaten.','We have already eaten.'],['I’ll call you.','I will call you.'],['He’s ready.','He is ready.'],['She’s been here.','She has been here.'],['That’s useful.','That is useful.'],['It’s been a long day.','It has been a long day.'],['I can’t go.','I cannot go.'],['I can’t go.','I can not go.'],['I won’t go.','I will not go.'],['I don’t know.','I do not know.'],['We shouldn’t’ve left.','We should not have left.'],['Let’s go.','Let us go.']];
  for(const [short,full] of pairs){assert.equal(isAnswerCorrect({answer:short},full),true,short);assert.equal(isAnswerCorrect({answer:full},short),true,full);}
});
test('would/had ambiguity follows the construction instead of accepting the wrong tense',()=>{
  const good=[['I’d like to leave.','I would like to leave.'],['I’d better get going.','I had better get going.'],['I’d rather not.','I would rather not.'],['I’d already finished.','I had already finished.'],['We’d never seen it.','We had never seen it.'],['She’d have helped.','She would have helped.'],["I'd've helped.",'I would have helped.'],['I’d need help.','I would need help.'],['They’d feed the cat.','They would feed the cat.']];
  for(const [short,full] of good){assert.equal(isAnswerCorrect({answer:short},full),true,short);assert.equal(isAnswerCorrect({answer:full},short),true,full);}
  const bad=[['I’d like to leave.','I had like to leave.'],['I’d better get going.','I would better get going.'],['I’d rather not.','I had rather not.'],['I’d already finished.','I would already finished.'],['I would walk.','I will walk.'],['I had left.','I would left.']];
  for(const [answer,value] of bad)assert.equal(isAnswerCorrect({answer},value),false,value);
});
test('negative meaning, possessives, missing words and spelling errors are still checked',()=>{
  for(const [answer,value] of [["I'd like to book a room.",'I like to book a room.'],["I'd like to book a room.",'I would not like to book a room.'],["I'd like to book a room.","l'd like to book a room."],["I'm ready.",'I ready.'],["It's useful.",'It has useful.'],["John's book",'John is book'],['She has been here.','She is been here.'],['I can go.','I cannot go.']])assert.equal(isAnswerCorrect({answer},value),false,value);
  assert.equal(isAnswerCorrect({answer:'I am ready.',accepted:['I’m prepared.']},'I am prepared.'),true);
  assert.equal(isAnswerCorrect({answer:'hello'},''),false);assert.equal(isAnswerCorrect({},''),false);
  assert.equal(normaliseAnswer('I’d like a room.'),'i would like a room');
  assert.ok(answerForms(Array(40).fill("He's done.").join(' ')).length<=64);
});
test('all published I’d phrases accept their intended full form, including had better',()=>{
  let checked=0;
  for(const level of ['A2','B1','B2','C1'])for(const item of lexiconForLevel(level))if(/[’']d\b/.test(item.phrase)) {
    const expanded=item.phrase.replace(/([A-Za-z]+)[’']d\b(?=\s+better)/g,'$1 had').replace(/([A-Za-z]+)[’']d\b/g,'$1 would');
    assert.equal(isAnswerCorrect({answer:item.phrase},expanded),true,item.id);checked++;
  }
  assert.ok(checked>=12);
});
test('a correct expanded answer counts as correct evidence, never a mistake to repeat',()=>{
  const item=lexiconForLevel('A2').find(item=>item.id==='a2_012');
  const task={item,answer:item.phrase,type:'recall',category:'recall',key:'room:recall',progressId:item.id};
  const session=makeSession('A2'),next=applySessionEvidence(session,task,isAnswerCorrect(task,'I would like to book a room'));
  assert.equal(next.scoredAnswers,1);assert.equal(next.scoredCorrect,1);assert.equal(next.correct,1);assert.deepEqual(next.recoveryQueue,[]);
});

const morning=Date.parse('2026-09-23T05:09:00Z'),evening=Date.parse('2026-09-23T16:09:10Z');
const empty=()=>({wallet:{earned:{},spent:{},goals:{}},stats:{lessons:{},byDay:{},legacy:{}}});
const complete=(id,start,patch={})=>({...makeSession('B1',15,0,start),id,remainingMs:0,answers:35,correct:27,scoredAnswers:35,scoredCorrect:27,...patch});
test('a morning-created draft finished in the evening earns the evening $1 after the paid morning lesson',()=>{
  const state=empty();
  const first=finishStudySession(state.wallet,state.stats,complete('morning-lesson',morning),morning+900000);
  const draft=complete('saved-morning-draft',morning+1000000);
  const second=finishStudySession(first.wallet,first.stats,draft,evening);
  assert.equal(second.session.routineReward,1);assert.equal(second.session.rewardAlready,false);
  assert.equal(second.stats.lessons[draft.id].slot,'evening');assert.equal(second.stats.lessons[draft.id].rewardId,'routine:2026-09-23:evening');
  assert.equal(balanceOf(second.wallet),2);assert.deepEqual(completedStudyDays(second.stats,evening)['2026-09-23'],{morning:true,evening:true});
  assert.equal(attendanceProgress(second.stats,second.wallet,evening).days,1);
  const repeated=finishStudySession(second.wallet,second.stats,draft,evening+5000);assert.equal(repeated.duplicate,true);assert.equal(balanceOf(repeated.wallet),2);
  const extra=finishStudySession(second.wallet,second.stats,complete('extra-evening',evening),evening+900000);
  assert.equal(extra.session.routineReward,0);assert.equal(extra.session.rewardAlready,true);assert.equal(balanceOf(extra.wallet),2);
});
test('completion date wins at midnight, regardless of saved slot or starting date',()=>{
  const state=empty(),finish=Date.parse('2026-09-23T21:05:00Z');
  const result=finishStudySession(state.wallet,state.stats,complete('old-draft',morning,{slot:'morning'}),finish);
  assert.equal(result.stats.lessons['old-draft'].studyDay,'2026-09-24');assert.ok(result.wallet.earned[routineRewardId(finish)]);
  assert.equal(result.wallet.earned['routine:2026-09-23:evening'],undefined);assert.equal(dayKey(finish),'2026-09-24');
});
test('a restored $1 correction updates the lesson, wallet and streak, and stale backups cannot undo it',()=>{
  const state=empty(),id='evening-record',key='routine:2026-09-23:evening';
  state.level='B1';state.progress={};state.wallet.earned.legacy={amount:7,at:1};
  state.wallet.earned['routine:2026-09-23:morning']={amount:1,at:morning};
  state.stats.lessons.morning={id:'morning',at:morning,studyDay:'2026-09-23',slot:'morning',completed:true,climb:1,reward:1};
  const old={id,level:'B1',at:evening,studyDay:'2026-09-23',slot:'morning',completed:true,climb:1,seconds:900,answers:35,correct:27,reward:0};
  state.stats.lessons[id]=old;
  const correctedAt=evening+300000,record={...old,slot:'evening',reward:1,rewardId:key,updatedAt:correctedAt};
  const credit={at:correctedAt,amount:1,kind:'routine',completed:true,slot:'evening',day:'2026-09-23',level:'B1',sessionId:id,restored:true};
  const records=[{record_key:'lesson:'+id,payload:record,updated_ms:correctedAt},{record_key:'wallet:earned:'+key,payload:credit,updated_ms:correctedAt}];
  const restored=mergeBackup(state,records);assert.equal(balanceOf(restored.wallet),9);assert.equal(restored.stats.lessons[id].slot,'evening');
  assert.equal(attendanceProgress(restored.stats,restored.wallet,correctedAt).days,1);
  assert.equal(backupRecords(restored).find(r=>r.key==='lesson:'+id).at,correctedAt);
  const stale=mergeBackup(restored,[{key:'lesson:'+id,data:old,at:evening}]);
  assert.equal(stale.stats.lessons[id].slot,'evening');assert.equal(balanceOf(stale.wallet),9);
  assert.equal(balanceOf(mergeBackup(stale,records).wallet),9);
  assert.equal(finishStudySession(stale.wallet,stale.stats,complete(id,morning),correctedAt).duplicate,true);
});
test('the active app has no bus/aloud selector and no conditional aloud instruction',()=>{
  const source=readFileSync(new URL('../src/AppV5.jsx',import.meta.url),'utf8');
  assert.doesNotMatch(source,/SpeakingModeChoice|changeSpeakingMode|speakingMode===.aloud|Дома · вслух|В автобусе · без голоса/);
  assert.match(source,/DailyLessonCard/);
});
console.log(count+' release 0.5.2 checks passed.');
