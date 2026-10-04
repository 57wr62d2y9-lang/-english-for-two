import assert from 'node:assert/strict';
import {DAY,dayKey,reviewItem,isDue,courseProgress,checkpointThreshold,awardMilestone,levelCompletionId,balanceOf,removeGoal,addGoal,routineRewardId} from '../src/learning.js';
import {lexiconForLevel,LEXICON,TOTAL_LEXICAL_UNITS,progressFor} from '../src/lexicon.js';
import {AUTUMN_VOCABULARY} from '../src/vocabulary-autumn.js';
import {scheduledReviewAt} from '../src/review-schedule.js';
import {registerDailyVisit,attendanceProgress,awardAttendanceBonus,finishStudySession,completedStudyDays} from '../src/rewards.js';
import {pendingCheckpoint,makeCheckpoint,finishCheckpoint} from '../src/checkpoint.js';
import {makeSession,resumeVocabularySession,nextLessonTask} from '../src/lesson-engine.js';
import {backupRecords,mergeBackup} from '../src/private-backup.js';
import {packItems,unpackItems,saveWallet,loadWallet} from '../src/storage-v3.js';
import {themeFor} from '../src/themes.js';
import {readyItem,securedItem} from './learning-fixtures.mjs';

let count=0;const test=(name,fn)=>{fn();count++;console.log('✓ '+name);};
const now=Date.parse('2026-10-03T08:00:00Z');
const wallet=()=>({earned:{},spent:{},goals:{},incoming:{},partner:null}),stats=()=>({byDay:{},lessons:{},legacy:{}});
const state=()=>({level:'A2',progress:{},wallet:wallet(),stats:stats(),draft:null});

test('the reported exhausted A2 batch earns $1 despite ending 22 seconds before the former time threshold',()=>{
  const draft={...makeSession('A2',15,0,now),remainingMs:900000-698000,exhausted:true,answers:78,scoredAnswers:78,correct:76,scoredCorrect:76};
  const result=finishStudySession(wallet(),stats(),draft,now+698000);
  assert.equal(result.session.routineReward,1);assert.equal(result.stats.lessons[draft.id].completed,true);assert.equal(result.session.climb,1);
  assert.equal(completedStudyDays(result.stats,now+698000)[dayKey(now)].morning,true);
  assert.equal(finishStudySession(result.wallet,result.stats,draft,now+700000).duplicate,true);
  const noWork=finishStudySession(wallet(),stats(),{...draft,answers:0,scoredAnswers:0},now);
  assert.equal(noWork.session.routineReward,0);
});
test('partial attempts combine once across levels and cannot keep granting ascent from old work',()=>{
  const first={...makeSession('A2'),id:'partial-a',remainingMs:600000,answers:2,scoredAnswers:2};
  const a=finishStudySession(wallet(),stats(),first,now);
  const second={...makeSession('B1'),id:'partial-b',remainingMs:480000,answers:3,scoredAnswers:3};
  const b=finishStudySession(a.wallet,a.stats,second,now+1000);
  assert.equal(b.session.routineReward,1);assert.equal(b.stats.lessons[first.id].contributedTo,second.id);
  const c=finishStudySession(b.wallet,b.stats,{...first,id:'partial-c'},now+2000);
  assert.equal(c.session.routineReward,0);assert.equal(c.session.climb,0);assert.equal(balanceOf(c.wallet),1);
  const tomorrow=finishStudySession(a.wallet,a.stats,second,now+DAY);
  assert.equal(tomorrow.session.routineReward,0,'partial work does not backfill or transfer across dates');
});
test('the old I’m down schedule is corrected without changing recorded dates or answer evidence',()=>{
  const p={s:'STABLE',c:13,w:5,f:now-13*DAY,l:now,n:now+DAY,step:2,rec:1,ctx:3,rcl:5,lastCorrect:now,lastWrong:now-3*DAY};
  const before=JSON.stringify(p);
  assert.equal(scheduledReviewAt(p),now+5*DAY);assert.equal(isDue(p,now+DAY),false);assert.equal(isDue(p,now+5*DAY),true);
  assert.equal(JSON.stringify(p),before);
  const reviewed=reviewItem(p,'recall',now+5*DAY,'due-review').item;
  assert.ok(reviewed.n>=now+13*DAY);assert.equal(reviewed.sv,2);
  assert.equal(isDue(reviewed,now+6*DAY),false);
});
test('35-day postponement is exact, persists through both backups and compact storage, and failures still return',()=>{
  const item=lexiconForLevel('B1').find(i=>i.id==='p030');
  const p=reviewItem({s:'LEARNING',c:2,w:1,n:now-DAY},'known',now,'known-35').item;
  assert.equal(p.n,now+35*DAY);assert.equal(p.v,false);assert.equal(isDue(p,now+34*DAY),false);assert.equal(isDue(p,now+35*DAY),true);
  assert.deepEqual(unpackItems(packItems({[item.id]:p}))[item.id],p);
  const input={...state(),level:'B1',progress:{[item.id]:p}};
  assert.equal(mergeBackup({...input,progress:{}},backupRecords(input)).progress[item.id].n,p.n);
  const failed=reviewItem(p,'wrong',now+35*DAY).item;
  assert.equal(failed.known,false);assert.equal(failed.n,now+36*DAY);
});
test('30 app visits without any lessons pay $10 once; a gap and Istanbul midnight are respected',()=>{
  let s=stats(),w=wallet();
  for(let d=0;d<29;d++)s=registerDailyVisit(s,now+d*DAY);
  assert.equal(awardAttendanceBonus(w,s,now+28*DAY).awarded,0);
  s=registerDailyVisit(s,now+29*DAY);assert.equal(Object.keys(s.lessons).length,0);
  const paid=awardAttendanceBonus(w,s,now+29*DAY);assert.equal(paid.awarded,10);
  assert.equal(awardAttendanceBonus(paid.wallet,s,now+29*DAY).awarded,0);
  assert.equal(registerDailyVisit(s,now+29*DAY+1000),s);
  assert.equal(attendanceProgress(s,paid.wallet,now+29*DAY).today,true);
  assert.equal(attendanceProgress(s,paid.wallet,now+32*DAY).days,0);
  const localMidnight=Date.parse('2026-10-03T21:01:00Z');
  assert.ok(registerDailyVisit(stats(),localMidnight).byDay['2026-10-04'].visitedAt);
  const input={...state(),stats:s,wallet:paid.wallet};
  const restored=mergeBackup(state(),backupRecords(input));
  assert.equal(awardAttendanceBonus(restored.wallet,restored.stats,now+29*DAY).awarded,0);
  assert.deepEqual(restored.stats.byDay,s.byDay);
});
test('ready vocabulary automatically offers a shorter check and pays $5 total for the replacement lesson',()=>{
  const pool=lexiconForLevel('A2'),limit=5;
  let progress=Object.fromEntries(pool.slice(0,limit-1).map(i=>[i.id,{s:'LEARNING',c:1}]));
  assert.equal(pendingCheckpoint(pool,progress,wallet(),stats(),'A2',now),null);
  pool.slice(0,10).forEach(i=>{progress[i.id]=readyItem(now);});
  assert.equal(pendingCheckpoint(pool,progress,wallet(),stats(),'A2',now).quarter,1);
  const check=makeCheckpoint(pool,progress,'A2',pendingCheckpoint(pool,progress,wallet(),stats(),'A2',now),now);
  assert.equal(check.tasks.length,10);assert.ok(check.tasks.every(t=>t.typed && ['recall','write','context'].includes(t.type)));
  const input={...state(),progress,draft:{at:now,data:{...check,index:4,score:3}}};
  const restored=mergeBackup({...input,draft:null},backupRecords(input));
  assert.equal(restored.draft.data.index,4);assert.equal(restored.draft.data.score,3);assert.equal(restored.draft.data.id,check.id);
  const result=finishCheckpoint(wallet(),stats(),{...check,score:8},pool,progress,now+180000);
  assert.equal(balanceOf(result.wallet),5);assert.equal(result.check.awarded,5);
  assert.equal(result.wallet.earned[routineRewardId(now)].amount,0);assert.equal(result.wallet.earned[routineRewardId(now)].completed,true);
  assert.equal(completedStudyDays(result.stats,now+180000)[dayKey(now)].morning,true);
  const extra={...makeSession('A2'),id:'extra',remainingMs:0,answers:10,scoredAnswers:10};
  assert.equal(finishStudySession(result.wallet,result.stats,extra,now+200000).session.routineReward,0);
  assert.equal(finishCheckpoint(result.wallet,result.stats,check,pool,progress,now+200000).duplicate,true);
});
test('a failed completed check pays an ordinary $1, schedules errors, and leaves today for new vocabulary',()=>{
  const pool=lexiconForLevel('B1'),progress=Object.fromEntries(pool.slice(0,10).map(i=>[i.id,readyItem(now)]));
  const check=makeCheckpoint(pool,progress,'B1',pendingCheckpoint(pool,progress,wallet(),stats(),'B1',now),now);
  const result=finishCheckpoint(wallet(),stats(),{...check,score:7},pool,progress,now+180000);
  assert.equal(result.check.passed,false);assert.equal(result.check.checkReward,0);assert.equal(balanceOf(result.wallet),1);
  assert.equal(pendingCheckpoint(pool,progress,result.wallet,result.stats,'B1',now+180000),null);
  assert.ok(pendingCheckpoint(pool,progress,result.wallet,result.stats,'B1',now+DAY));
});
test('A2 final remains $100 once after every card has independent secured evidence',()=>{
  const pool=lexiconForLevel('A2'),progress=Object.fromEntries(pool.map(i=>[i.id,securedItem(now)]));
  let w=wallet();for(const q of [1,2,3])w=awardMilestone(w,'A2',q,8,pool.length,now-DAY);
  assert.equal(pendingCheckpoint(pool,progress,w,stats(),'A2',now).quarter,0);
  const check=makeCheckpoint(pool,progress,'A2',0,now);
  const result=finishCheckpoint(w,stats(),{...check,score:16},pool,progress,now+300000);
  assert.equal(result.wallet.earned[levelCompletionId('A2')].amount,100);assert.equal(balanceOf(result.wallet),115);
  assert.equal(pendingCheckpoint(pool,progress,result.wallet,result.stats,'A2',now),null);
  assert.equal(courseProgress(pool,progress).percent,100);
});
test('expanded content has 300 distinct new units, bilingual usage and two translated situations each',()=>{
  assert.equal(AUTUMN_VOCABULARY.length,300);assert.equal(new Set(AUTUMN_VOCABULARY.map(i=>i.id)).size,300);
  assert.equal(LEXICON.filter(i=>i.pack==='2026-10').length,300);assert.equal(TOTAL_LEXICAL_UNITS,1330);
  for(const i of AUTUMN_VOCABULARY){assert.ok(/[а-яё]/i.test(i.ru),i.id);assert.ok(/[а-яё]/i.test(i.usageRu),i.id);assert.equal(i.examples.length,2);assert.equal(i.exampleRu.length,2);assert.equal(new Set(i.examples).size,2);assert.ok(i.exampleRu.every(x=>/[а-яё]/i.test(x)),i.id);}
  for(const level of ['A2','B1','B2','C1']){const a=nextLessonTask(makeSession(level),{});const p={[a.task.item.id]:reviewItem(undefined,'intro',now).item};const b=nextLessonTask({...a,step:3},p,now);assert.notEqual(a.task.item.kind,b.task.item.kind);}
});
test('legacy IELTS drafts migrate without losing lesson identity, checked answers or time',()=>{
  const old={...makeSession('B1'),programmeVersion:'vocabulary-1',remainingMs:250000,answers:40,scoredAnswers:40,task:{type:'ielts'},recoveryQueue:[{id:'ielts-old',dueStep:0,attempts:1}]};
  const upgraded=resumeVocabularySession(old,{},{});
  assert.equal(upgraded.id,old.id);assert.equal(upgraded.remainingMs,250000);assert.equal(upgraded.answers,40);
  assert.notEqual(upgraded.task.type,'ielts');assert.deepEqual(upgraded.recoveryQueue,[]);
});
test('deleting a personal gift does not change money and cannot be undone by an old backup',()=>{
  let w={...wallet(),earned:{old:{amount:10,at:1}}};w=addGoal(w,'Наушники',100,'goal',now-DAY);
  const before=w.goals.goal;w=removeGoal(w,'goal',now);
  assert.equal(w.goals.goal.active,false);assert.equal(balanceOf(w),10);
  const input={...state(),wallet:w};
  const restored=mergeBackup(input,[{key:'wallet:goals:goal',data:before,at:now-DAY}]);
  assert.equal(restored.wallet.goals.goal.active,false);
  const remote=mergeBackup(state(),backupRecords(input));assert.equal(remote.wallet.goals.goal.deletedAt,now);
  for(let i=0;i<12;i++)w=addGoal(w,'Новый '+i,10,'new-'+i,now+i);
  assert.equal(Object.values(w.goals).filter(g=>g.active!==false).length,12);
});
test('season and holiday weeks use Istanbul dates, including New Year across the year boundary',()=>{
  for(const [date,season] of [['2026-01-15','winter'],['2026-04-15','spring'],['2026-07-15','summer'],['2026-10-15','autumn']])assert.equal(themeFor(Date.parse(date+'T06:00:00Z')).season,season);
  for(const d of ['2026-12-29','2026-12-31','2027-01-04'])assert.equal(themeFor(Date.parse(d+'T06:00:00Z')).holiday,'new-year');
  assert.equal(themeFor(Date.parse('2027-01-05T06:00:00Z')).holiday,'');
  for(const d of ['2026-10-28','2026-11-03'])assert.equal(themeFor(Date.parse(d+'T06:00:00Z')).holiday,'halloween');
  assert.equal(themeFor(Date.parse('2026-11-04T06:00:00Z')).holiday,'');
  assert.equal(themeFor(Date.parse('2026-03-07T21:00:00Z')).holiday,'march-8');
});

// All CloudStorage checks below use isolated in-memory doubles, never accounts.
const disk=new Map(),cloud=new Map(),writes=[];
globalThis.localStorage={getItem:k=>disk.get(k)||null,setItem:(k,v)=>disk.set(k,v)};
globalThis.window={Telegram:{WebApp:{initData:'isolated-v060',initDataUnsafe:{user:{id:'isolated-v060'}},CloudStorage:{getKeys(cb){cb(null,[...cloud.keys()]);},getItems(keys,cb){cb(null,Object.fromEntries(keys.map(k=>[k,cloud.get(k)||''])));},getItem(k,cb){cb(null,cloud.get(k)||'');},setItem(k,v,cb){assert.ok(v.length<=4096);writes.push(k);cloud.set(k,v);cb(null,true);}}}}};
let w=wallet();for(let i=0;i<45;i++){w=addGoal(w,'Старый подарок '+i,10,'old-'+i,now-DAY);w=removeGoal(w,'old-'+i,now);}
w=addGoal(w,'Текущий подарок',20,'current',now+1000);
await saveWallet(w);disk.clear();
cloud.set('eft3_wallet_meta',JSON.stringify({goals:{'old-0':{title:'Старый подарок',cost:10,at:now-DAY,active:true}}}));
const restored=await loadWallet();assert.equal(restored.goals['old-0'].active,false);assert.equal(restored.goals.current.active,true);assert.equal(Object.keys(restored.goals).length,46);
assert.equal(writes.filter(k=>k.startsWith('eft3_goals_')).length,46);
console.log('✓ deleted and active gifts restore in bounded individual cloud records without resurrection');count++;
console.log(count+' release 0.6.0 checks passed.');
