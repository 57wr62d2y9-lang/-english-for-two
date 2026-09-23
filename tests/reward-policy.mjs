import assert from 'node:assert/strict';
import { DAY, COURSE_VERSION, awardLevelCompletion, awardMilestone, awardRoutine, balanceOf, checkpointQuarters, courseProgress, dayKey, evaluateSessionReward, finalLevelReady, lessonRecord, levelCompletionId, levelTarget, routineRewardId, studySlot } from '../src/learning.js';
import { attendanceProgress, awardAttendanceBonus, completedStudyDays, finishStudySession } from '../src/rewards.js';
import { buildFinalCheck } from '../src/checkpoint.js';
import { lexiconForLevel } from '../src/lexicon.js';
import { backupRecords, mergeBackup } from '../src/private-backup.js';

let count=0;
const test=(name,fn)=>{fn();count++;console.log('✓ '+name);};
const origin=Date.parse('2026-08-01T00:00:00Z');
const date=offset=>new Date(origin+offset*DAY).toISOString().slice(0,10);
const at=(offset,slot='evening')=>Date.parse(date(offset)+(slot==='morning'?'T06:00:00Z':'T17:00:00Z'));
const wallet=()=>({earned:{},spent:{},goals:{},incoming:{}});
const stats=()=>({lessons:{},byDay:{},legacy:{}});
const session=(offset,slot='evening',patch={})=>({id:`lesson-${offset}-${slot}`,level:'A2',startedAt:at(offset,slot),slot,plannedMs:900000,remainingMs:0,spentSeconds:900,answers:5,scoredAnswers:5,correct:0,scoredCorrect:0,...patch});
function history(days,{offset=0,missing=[]}={}) {
  const s=stats();
  for(let n=offset;n<days+offset;n++)for(const slot of ['morning','evening']) {
    if(missing.includes(`${n}:${slot}`))continue;
    const record=lessonRecord(session(n,slot),n%2?'B1':'A2',at(n,slot)+900000);
    s.lessons[record.id]=record;
  }
  return s;
}
const end=n=>at(n)+900000;

test('exactly $1 for completed lessons at 0%, 50% and 100%, with all hints or no speed',()=>{
  for(const correct of [0,3,5])assert.equal(evaluateSessionReward(session(0,'morning',{correct,scoredCorrect:correct,unaidedCorrect:0,fastCorrect:0})).amount,1);
  assert.equal(evaluateSessionReward({...session(0),answers:99,scoredAnswers:99,correct:99,scoredCorrect:99}).amount,1);
});
test('completion boundaries agree for pay and progress, including short lessons',()=>{
  assert.equal(evaluateSessionReward({...session(0),spentSeconds:720}).amount,1);
  for(const patch of [{spentSeconds:719},{scoredAnswers:4},{scoredAnswers:0,answers:20},{spentSeconds:Infinity},{scoredAnswers:Infinity}])assert.equal(evaluateSessionReward({...session(0),...patch}).amount,0);
  const short={...session(0),plannedMs:300000,spentSeconds:240,answers:3,scoredAnswers:3};
  assert.equal(evaluateSessionReward(short).amount,1);assert.equal(lessonRecord(short,'A2',end(0)).completed,true);
  assert.equal(evaluateSessionReward({...short,spentSeconds:239}).amount,0);
});
test('one payment per day and slot, even across levels and repeated session IDs',()=>{
  let w=wallet();
  for(const slot of ['morning','morning','evening','evening'])w=awardRoutine(w,session(0,slot),at(0,slot)).wallet;
  assert.equal(balanceOf(w),2);assert.equal(Object.keys(w.earned).length,2);
  assert.equal(awardRoutine(w,{...session(0),level:'B1'},at(0)).awarded,0);
  w=awardRoutine(w,session(1,'morning'),at(1,'morning')).wallet;assert.equal(balanceOf(w),3);
});
test('old $3 lesson and $100 checkpoint remain untouched and cannot be paid twice',()=>{
  const id=routineRewardId(at(0)),milestone=`${COURSE_VERSION}:A2:1`;
  const w={...wallet(),earned:{[id]:{amount:3,at:1},[milestone]:{amount:100,at:2}},spent:{gift:{cost:20,status:'approved'}}};
  const copy=JSON.stringify(w);
  assert.equal(awardRoutine(w,session(0),at(0)).wallet,w);
  assert.equal(awardMilestone(w,'A2',1,10,306),w);
  assert.equal(balanceOf(w),83);assert.equal(JSON.stringify(w),copy);
});
test('checkpoints award $5 once, with score and verified-unit guards',()=>{
  let w=wallet();
  for(const [quarter,score,verified] of [[1,7,100],[1,8,99],[1,NaN,100],[1,11,100],[1.5,8,200],[4,8,400]])assert.equal(awardMilestone(w,'A2',quarter,score,verified),w);
  for(const q of [1,2,3])w=awardMilestone(w,'A2',q,8,q*100,end(q));
  assert.equal(balanceOf(w),15);
  assert.equal(awardMilestone(w,'A2',3,10,306),w);
});
test('A2 graduation is reachable only after all 306 published units and three checkpoints',()=>{
  const items=lexiconForLevel('A2'),progress=Object.fromEntries(items.map(i=>[i.id,{v:true,s:'MASTERED'}]));
  let w=wallet();
  assert.equal(items.length,306);assert.equal(levelTarget('A2'),items.length);assert.deepEqual(checkpointQuarters('A2'),[1,2,3]);
  assert.equal(finalLevelReady(items,progress,w,'A2'),false);
  for(const q of [1,2,3])w=awardMilestone(w,'A2',q,8,306,end(q));
  assert.equal(finalLevelReady(items,progress,w,'A2'),true);
  assert.equal(courseProgress(items,progress).percent,100);
  const incomplete={...progress,[items[0].id]:{v:false,s:'LEARNING'}};
  assert.equal(finalLevelReady(items,incomplete,w,'A2'),false);assert.equal(buildFinalCheck(items,incomplete).length,0);
  const tasks=buildFinalCheck(items,progress);assert.equal(tasks.length,20);assert.ok(tasks.every(t=>t.item.level==='A2'));
  assert.equal(finalLevelReady(items.slice(1),progress,w,'A2'),false);
  for(const score of [15,NaN,21])assert.equal(awardLevelCompletion(w,'A2',score,20,end(4),306),w);
  assert.equal(awardLevelCompletion(w,'A2',16,20,end(4),305),w);
  const paid=awardLevelCompletion(w,'A2',16,20,end(4),306);
  assert.equal(paid.earned[levelCompletionId('A2')].amount,100);assert.equal(balanceOf(paid),115);
  assert.equal(awardLevelCompletion(paid,'A2',20,20,end(5),306),paid);
});
test('other level finals do not accidentally receive the A2-specific $100',()=>{
  let w=wallet();for(const q of [1,2,3,4])w=awardMilestone(w,'B1',q,10,400,end(q));
  const next=awardLevelCompletion(w,'B1',20,20,end(5),400);
  assert.equal(balanceOf(next),20);assert.equal(next.earned[levelCompletionId('B1')].amount,0);
});
test('29 full days or 59 lessons never earn the 30-day bonus',()=>{
  const w=wallet(),s=history(30,{missing:['29:evening']});
  assert.equal(awardAttendanceBonus(w,history(29),end(28)).awarded,0);
  assert.equal(awardAttendanceBonus(w,s,end(29)).awarded,0);
  const p=attendanceProgress(s,w,end(29));assert.equal(p.days,29);assert.deepEqual(p.today,{morning:true});
});
test('30 days with both lessons earn $10 once, unaffected by retries or reloads',()=>{
  const s=history(30),w=wallet(),before=JSON.stringify(s);
  const paid=awardAttendanceBonus(w,s,end(29));assert.equal(paid.awarded,10);assert.equal(balanceOf(paid.wallet),10);
  assert.equal(awardAttendanceBonus(paid.wallet,s,end(29)).wallet,paid.wallet);
  const reloaded=JSON.parse(JSON.stringify(paid.wallet));assert.equal(awardAttendanceBonus(reloaded,s,end(30)).awarded,0);
  assert.equal(attendanceProgress(s,paid.wallet,end(29)).rewardedToday,true);
  assert.equal(attendanceProgress(s,paid.wallet,end(29)).days,0);
  assert.equal(JSON.stringify(s),before);assert.equal(Object.keys(w.earned).length,0);
});
test('60 consecutive days pay two non-overlapping bonuses, not 31 sliding bonuses',()=>{
  const first=awardAttendanceBonus(wallet(),history(30),end(29)).wallet;
  for(let n=31;n<60;n++)assert.equal(awardAttendanceBonus(first,history(n),end(n-1)).awarded,0);
  const sixty=awardAttendanceBonus(first,history(60),end(59));assert.equal(sixty.awarded,10);assert.equal(balanceOf(sixty.wallet),20);
  assert.equal(awardAttendanceBonus(wallet(),history(60),end(59)).awarded,20);
});
test('one missed morning or evening resets the pending streak and a new 30-day block can earn',()=>{
  for(const slot of ['morning','evening']) {
    assert.equal(awardAttendanceBonus(wallet(),history(30,{missing:[`15:${slot}`]}),end(29)).awarded,0);
    assert.equal(attendanceProgress(history(30,{missing:[`15:${slot}`]}),wallet(),end(29)).days,14);
    const result=awardAttendanceBonus(wallet(),history(46,{missing:[`15:${slot}`]}),end(45));assert.equal(result.awarded,10);
    assert.equal(Object.values(result.wallet.earned)[0].startDay,date(16));
  }
});
test('partial today preserves yesterday streak; a missed whole date clears it without clawback',()=>{
  const s=history(10);assert.equal(attendanceProgress(s,wallet(),end(10)).days,10);
  assert.equal(attendanceProgress(s,wallet(),end(11)).days,0);
  const paid=awardAttendanceBonus(wallet(),history(30),end(29)).wallet;
  assert.equal(awardAttendanceBonus(paid,history(30),end(40)).wallet,paid);assert.equal(balanceOf(paid),10);
});
test('repeat lessons in one slot, unfinished lessons, and future dates cannot fake attendance',()=>{
  const s=history(30,{missing:['29:evening']});
  s.lessons.repeat={...s.lessons['lesson-29-morning'],id:'repeat'};
  s.lessons.unfinished={...lessonRecord(session(29), 'A2',end(29)),completed:false};
  assert.equal(awardAttendanceBonus(wallet(),s,end(29)).awarded,0);
  assert.equal(awardAttendanceBonus(wallet(),history(60),end(28)).awarded,0);
  assert.equal(Object.keys(completedStudyDays({lessons:{bad:{completed:true,studyDay:'2026-02-30',slot:'morning'}}},end(29))).length,0);
});
test('legacy paid-only imports do not invent completed days; explicit new completion proof restores them',()=>{
  const s=history(30);
  for(const r of Object.values(s.lessons)){r.imported=true;r.reward=3;}
  assert.equal(awardAttendanceBonus(wallet(),s,end(29)).awarded,0);
  for(const r of Object.values(s.lessons))r.completionVerified=true;
  assert.equal(awardAttendanceBonus(wallet(),s,end(29)).awarded,10);
});
test('actual legacy completed lessons retain their recorded date and slot',()=>{
  const s=history(30);
  for(const r of Object.values(s.lessons)){r.rewardId=`routine:${r.studyDay}:${r.slot}`;delete r.studyDay;delete r.slot;}
  assert.equal(awardAttendanceBonus(wallet(),s,end(29)).awarded,10);
});
test('late restored earlier history cannot overlap an already paid 30-day interval',()=>{
  const w=awardAttendanceBonus(wallet(),history(30,{offset:1}),end(30)).wallet;
  assert.equal(awardAttendanceBonus(w,history(31),end(30)).awarded,0);
  assert.equal(awardAttendanceBonus(w,history(60),end(59)).awarded,0);
  assert.equal(awardAttendanceBonus(w,history(61),end(60)).awarded,10);
});
test('finishing the 60th lesson settles $1 + $10 and preserves one ledger record on repeat',()=>{
  const s=history(30,{missing:['29:evening']}),w=wallet(),draft=session(29);
  const result=finishStudySession(w,s,draft,end(29));
  assert.equal(result.session.routineReward,1);assert.equal(result.session.attendanceReward,10);assert.equal(balanceOf(result.wallet),11);
  assert.equal(result.stats.lessons[draft.id].bonusReward,10);assert.equal(Object.keys(result.stats.lessons).length,60);
  const again=finishStudySession(result.wallet,result.stats,draft,end(29));
  assert.equal(again.duplicate,true);assert.equal(again.wallet,result.wallet);assert.equal(again.stats,result.stats);
  assert.equal(w.earned[routineRewardId(at(29))],undefined);assert.equal(s.lessons[draft.id],undefined);
});
test('real consecutive finish events produce $70 for 30 days; no accuracy requirement',()=>{
  let w=wallet(),s=stats();
  for(let n=0;n<30;n++)for(const slot of ['morning','evening']) {
    const result=finishStudySession(w,s,session(n,slot),at(n,slot)+900000);w=result.wallet;s=result.stats;
  }
  assert.equal(balanceOf(w),70);assert.equal(Object.keys(w.earned).length,61);
});
test('completion time determines the slot; multi-day drafts cannot backfill a missed date',()=>{
  const morning=Date.parse('2026-08-01T10:59:00Z'),finish=morning+900000;
  assert.equal(studySlot(morning),'morning');assert.equal(studySlot(finish),'evening');
  const first=finishStudySession(wallet(),stats(),session(0,'morning',{startedAt:morning}),finish);
  assert.equal(first.stats.lessons['lesson-0-morning'].slot,'evening');assert.ok(first.wallet.earned[routineRewardId(finish)]);
  const old=finishStudySession(wallet(),stats(),session(0,'morning'),end(2));
  const r=old.stats.lessons['lesson-0-morning'];assert.equal(r.studyDay,date(2));assert.equal(r.slot,'evening');
  assert.ok(old.wallet.earned[routineRewardId(at(2))]);assert.equal(completedStudyDays(old.stats,end(2))[date(0)],undefined);
});
test('backup roundtrip retains rewards, claimed date ranges and attendance without duplicate payouts',()=>{
  const s=history(30),w=awardAttendanceBonus(wallet(),s,end(29)).wallet;
  w.earned.old={amount:100,at:1};
  const state={settings:{level:'A2'},level:'A2',progress:{},stats:s,wallet:w,draft:null};
  const restored=mergeBackup({...state,stats:stats(),wallet:wallet()},backupRecords(state));
  assert.equal(balanceOf(restored.wallet),110);assert.equal(awardAttendanceBonus(restored.wallet,restored.stats,end(29)).awarded,0);
  assert.deepEqual(completedStudyDays(restored.stats,end(29)),completedStudyDays(s,end(29)));
});
console.log(count+' reward policy checks passed.');
