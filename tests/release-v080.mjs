import assert from 'node:assert/strict';
import {lexiconForLevel,progressFor} from '../src/lexicon.js';
import {vocabularyTask} from '../src/vocabulary-tasks.js';
import {optionsFor,makeSession,nextLessonTask,applySessionEvidence,reviewActionFor} from '../src/lesson-engine.js';
import {isAnswerCorrect} from '../src/answer-check.js';
import {dayKey,reviewItem,balanceOf,courseProgress} from '../src/learning.js';
import {dailyAdventure,createSpeedRound,answerSpeedRound,finishSpeedRound,arcadeSummary,championship,weekKey} from '../src/arcade.js';
import {weeklyCheckpoint,makeCheckpoint,finishCheckpoint} from '../src/checkpoint.js';
import {registerDailyVisit,attendanceProgress,awardAttendanceBonus,finishStudySession} from '../src/rewards.js';
import {cleanArenaRecord,mergeArcadeSummary,ARENA_DECK} from '../supabase/functions/english-for-two-sync/arcade-summary.js';
import {backupRecords,mergeBackup} from '../src/private-backup.js';
import {mergeStudyDay} from '../src/storage-v3.js';
const time=Date.parse('2026-10-13T16:00:00Z'),DAY=86400000;
const wallet=()=>({earned:{},spent:{},goals:{}}),stats=()=>({lessons:{},byDay:{}});
const a2=lexiconForLevel('A2'),b1=lexiconForLevel('B1');
for(const id of ['a2_149','lex-a2-can-i-get-this-to-go-']) {
  const item=a2.find(i=>i.id===id);assert.ok(item);
  for(const type of ['recall','context'])for(let example=0;example<3;example++) {
    const task=vocabularyTask(item,type,a2,example,{optionsFor});
    for(const variant of ['Can I get this to go?','Could I get this to go?','Can I get this to take away?','Could I get this to take away?'])assert.ok(isAnswerCorrect(task,variant),id+':'+type+':'+variant);
    assert.equal(isAnswerCorrect(task,'Could she get this to go?'),false);
    assert.equal(isAnswerCorrect(task,"I cannot get this to go"),false);
  }
  const task=vocabularyTask(item,'write',a2,0,{optionsFor});
  const variant=task.answer.replace(/^(can|could)/i,'Can').replace(/to take away/i,'to go');assert.ok(isAnswerCorrect(task,variant));
  if(task.answer.length>30)assert.equal(isAnswerCorrect(task,'Can I get this to go?'),false);
}
const request=vocabularyTask(a2.find(i=>i.id==='a2_001'),'recall',a2,0,{optionsFor});
assert.ok(isAnswerCorrect(request,'Can you say that again?'));
assert.equal(isAnswerCorrect({...request,requiredModal:'could'},'Can you say that again?'),false);
const hearing=vocabularyTask(a2.find(i=>i.id==='a2_057'),'recall',a2,0,{optionsFor});assert.equal(isAnswerCorrect(hearing,'Could you hear me?'),false);
assert.equal(isAnswerCorrect({type:'recall',answer:'I can swim.',item:{id:'ability'}},'I could swim.'),false);
assert.equal(isAnswerCorrect({type:'write',answer:'Could you help yesterday?',item:{id:'a2_053'}},'Can you help yesterday?'),false);
console.log('✓ equivalent requests and US/UK takeaway accepted; hearing, ability, past time, person and negation remain distinct');

assert.equal(weekKey(Date.parse('2026-10-11T20:59:59Z')),'2026-10-05');assert.equal(weekKey(Date.parse('2026-10-11T21:00:00Z')),'2026-10-12');
assert.deepEqual(dailyAdventure('Anna',time),dailyAdventure('Anna',time+1000));
let s=stats();for(let i=0;i<30;i++)s=registerDailyVisit(s,time-i*2*DAY);
assert.equal(awardAttendanceBonus(wallet(),s,time).awarded,10);
const paid=awardAttendanceBonus(wallet(),s,time).wallet;assert.equal(awardAttendanceBonus(paid,s,time).awarded,0);
assert.equal(Object.values(paid.earned)[0].paidDays.length,30);
const twice=registerDailyVisit(s,time+1000);assert.equal(twice,s);
const late=registerDailyVisit(s,time-DAY);assert.equal(attendanceProgress(late,paid,time).days,1);
assert.equal(attendanceProgress(registerDailyVisit(stats(),time),wallet(),time+40*DAY).days,1);

const progress=Object.fromEntries(b1.slice(0,24).map(i=>[i.id,{s:'LEARNING',c:3,rec:1,rcl:1,l:time-3*DAY}]));
const desc=weeklyCheckpoint(b1,progress,wallet(),stats(),'B1',time);assert.equal(desc.mode,'weekly');assert.equal(desc.count,10);
assert.ok(desc.itemIds.every(id=>progress[id]));
const check=makeCheckpoint(b1,progress,'B1',desc,time);assert.equal(check.tasks.length,10);assert.ok(check.tasks.every(t=>t.typed&&!t.options));
const success=finishCheckpoint(wallet(),stats(),{...check,score:8},b1,progress,time+60000);
assert.equal(balanceOf(success.wallet),5);assert.equal(courseProgress(b1,progress).verified,0);
assert.equal(weeklyCheckpoint(a2,{},success.wallet,success.stats,'A2',time+120000),null);
assert.ok(weeklyCheckpoint(b1,progress,success.wallet,success.stats,'B1',time+7*DAY));
assert.equal(finishCheckpoint(success.wallet,success.stats,{...check,id:'other-id',score:10},b1,progress,time+120000).check.checkReward,0);
const failed=finishCheckpoint(wallet(),stats(),{...check,score:7},b1,progress,time+60000);assert.equal(failed.check.checkReward,0);
assert.equal(weeklyCheckpoint(b1,progress,failed.wallet,failed.stats,'B1',time+120000).retest,true);
assert.equal(weeklyCheckpoint(a2,{},wallet(),stats(),'A2',time).count,5);
console.log('✓ weekly check exists without mastery, prioritises studied cards, pays once across levels, retries safely; 30 distinct visits accumulate and do not double pay');

let round=createSpeedRound('arena','B1',{},time),other=createSpeedRound('arena','A2',{},time+DAY);
assert.deepEqual(round.questions,other.questions);assert.ok(round.questions.length>50);
assert.ok(round.questions.every(t=>t.options.length===4&&new Set(t.options).size===4));
assert.equal(answerSpeedRound(round,round.questions[0].answer,time+100),round);
for(let i=0;i<12;i++){const task=round.questions[round.index];round=answerSpeedRound(round,i===4?task.options.find(x=>x!==task.answer):task.answer,time+(i+1)*1000);}
assert.equal(round.correct,11);assert.equal(round.wrong,1);assert.equal(round.score,102);assert.equal(round.bestStreak,7);
assert.equal(answerSpeedRound(round,round.questions[round.index].answer,time+60000),round);
assert.equal(finishSpeedRound(round,stats(),time+59000).round.completed,false);
assert.equal(finishSpeedRound(round,stats(),time+60000,{aborted:true}).round.completed,false);
const finished=finishSpeedRound(round,stats(),time+60000);assert.equal(finished.round.completed,true);assert.equal(finished.stats.byDay[dayKey(time)].seconds,60);
assert.equal(finishSpeedRound(round,finished.stats,time+60000).stats,finished.stats);
const summary=arcadeSummary(finished.stats,time+60000);assert.equal(summary.records[0].score,102);
assert.equal(cleanArenaRecord({...summary.records[0],score:99999},time+60000).score,102);
assert.equal(cleanArenaRecord({...summary.records[0],at:time+30000},time+60000),null);
assert.equal(cleanArenaRecord({...summary.records[0],correct:99999},time+60000),null);
assert.equal(mergeArcadeSummary(summary,{version:1,records:[]},time+60000).records[0].score,102);
const older=finished.stats.byDay[dayKey(time)],newer={...older,at:time+70000,arenaBest:{...older.arenaBest,correct:1,score:10}};
assert.equal(mergeStudyDay(older,newer).arenaBest.score,102);
assert.equal(championship(finished.stats,{arcade:summary,at:time},time+7*DAY).winner,'pending');
assert.equal(championship(finished.stats,{arcade:summary,at:time+7*DAY},time+7*DAY).winner,'tie');
assert.equal(championship(finished.stats,{arcade:{version:1,records:[]},at:time+7*DAY},time+7*DAY).winner,'self');
const state={level:'B1',progress,stats:finished.stats,wallet:paid,settings:{level:'B1'}};
const restored=mergeBackup({...state,stats:stats(),wallet:wallet()},backupRecords(state));assert.equal(arcadeSummary(restored.stats,time+60000).records[0].score,102);assert.equal(balanceOf(restored.wallet),10);
const personal=createSpeedRound('review','B1',progress,time);assert.ok(personal.questions.every(t=>progress[t.item.id]));assert.equal(createSpeedRound('review','B1',{},time),null);
console.log('✓ fair shared arena deck, timed cutoff, interruption, spam guard, scoring, ties, stale partner, bounded sanitisation, backup and record merge');

for(const theme of ['mix','context','recall','fresh']) {
  let session={...makeSession('B1',5,0,time),adventure:{target:12,theme}},p=theme==='fresh'?{}:{...progress};
  for(let i=0;i<50&&session.answers<12;i++) {
    session=nextLessonTask(session,p,time+i*2000);
    if(!session.task)break;
    const task=session.task,action=task.type==='intro'?'intro':reviewActionFor(task,true);
    p={...p,[task.item.id]:reviewItem(progressFor(task.item,p),action,time+i*2000,session.id+':'+i,{typed:task.typed,unaided:true}).item};
    if(task.type!=='intro')session=applySessionEvidence(session,task,true);
  }
  assert.equal(session.answers,12,theme);session=nextLessonTask(session,p,time+150000);assert.equal(session.exhausted,true);assert.equal(session.task,null);
  const done=finishStudySession(wallet(),stats(),session,time+150000);assert.equal(done.session.routineReward,1);
  assert.equal(finishStudySession(done.wallet,done.stats,{...session,id:'extra'},time+151000).session.routineReward,0);
}
console.log('✓ three daily themes reach 12 scored answers and preserve once-per-slot lesson payment');
