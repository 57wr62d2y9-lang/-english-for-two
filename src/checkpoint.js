import {checkpointCandidates,levelTarget,shuffle,hasPractised,checkpointQuarters,checkpointThreshold,courseProgress,COURSE_VERSION,dayKey,studySlot,routineRewardId,finalLevelReady,levelCompletionId,awardMilestone,awardLevelCompletion,balanceOf} from './learning.js';
import {finishStudySession} from './rewards.js';
import {examplesFor} from './lesson-notes.js';
import {progressFor} from './lexicon.js';

function optionsFor(item,pool,field) {
  const alternatives=shuffle([...new Set(pool.filter(other=>other.id!==item.id).map(other=>other[field]))]).filter(value=>value && value!==item[field]).slice(0,3);
  return shuffle([item[field],...alternatives]);
}
function vocabularyTask(item,pool,index) {
  const example=examplesFor(item)[index%Math.max(1,examplesFor(item).length)];
  if(index%3===0)return {type:'recognition',item,prompt:item.phrase,answer:item.ru,options:optionsFor(item,pool,'ru')};
  if(index%3===1)return {type:'meaning',item,prompt:example?.en || item.phrase,promptRu:example?.ru,answer:item.ru,options:optionsFor(item,pool,'ru')};
  return {type:'recall',item,prompt:item.ru,answer:item.phrase};
}
export function buildCheckpoint(items,progress,quarter) {
  const candidates=checkpointCandidates(items,progress,quarter);
  return candidates.length===10?candidates.map((item,index)=>vocabularyTask(item,items,index)):[];
}
export function buildFinalCheck(items,progress,level=items[0]?.level) {
  // Old callers passed unrelated banks as the third argument.
  if(typeof level!=='string')level=items[0]?.level;
  const pool=items.filter(item=>item.level===level);
  const candidates=shuffle(pool.filter(item=>hasPractised(progressFor(item,progress)) && item.cloze));
  if(candidates.length<levelTarget(level))return [];
  return candidates.slice(0,20).map((item,index)=>vocabularyTask(item,pool,index));
}

// A check replaces the next lesson, and an unsuccessful attempt leaves room
// for ordinary learning for the rest of that date. It can still be retried.
export function pendingCheckpoint(items,progress,wallet,stats,level,time=Date.now()) {
  const path=courseProgress(items,progress,level);
  const quarter=checkpointQuarters(level).find(q=>path.practised>=checkpointThreshold(level,q) && !wallet.earned?.[`${COURSE_VERSION}:${level}:${q}`]);
  const final=quarter===undefined && finalLevelReady(items,progress,wallet,level) && !wallet.earned?.[levelCompletionId(level)];
  if(quarter===undefined&&!final)return null;
  const q=quarter??0;
  if(Object.values(stats.lessons || {}).some(r=>r.kind==='checkpoint'&&r.level===level&&r.quarter===q&&r.studyDay===dayKey(time)))return null;
  return {quarter:q,level,amount:q?5:level==='A2'?100:0};
}

export function makeCheckpoint(items,progress,level,quarter,time=Date.now()) {
  const tasks=quarter?buildCheckpoint(items,progress,quarter):buildFinalCheck(items,progress,level);
  if(tasks.length!==(quarter?10:20))return null;
  return {version:4,kind:'checkpoint',id:globalThis.crypto?.randomUUID?.() || `check-${time}-${Math.random().toString(36).slice(2)}`,quarter,level,tasks,index:0,score:0,startedAt:time};
}

export function finishCheckpoint(wallet,stats,check,items,progress,time=Date.now()) {
  if(!check || check.done || stats.lessons?.[check.id])return {wallet,stats,check,duplicate:true};
  const total=check.tasks.length,path=courseProgress(items,progress,check.level);
  const passed=total===(check.quarter?10:20) && check.score>=Math.ceil(total*.8);
  const rewardId=check.quarter?`${COURSE_VERSION}:${check.level}:${check.quarter}`:levelCompletionId(check.level);
  const rewarded=check.quarter?awardMilestone(wallet,check.level,check.quarter,check.score,path.practised,time):
    finalLevelReady(items,progress,wallet,check.level)?awardLevelCompletion(wallet,check.level,check.score,total,time,path.practised):wallet;
  const checkReward=balanceOf(rewarded)-balanceOf(wallet);
  const routineId=routineRewardId(time);
  // The $5 / $100 award is the payment for this scheduled lesson. The zero
  // marker proves completion and prevents a second $1 in the same time slot.
  const next=passed&&rewarded.earned?.[rewardId]&&!rewarded.earned?.[routineId]?{...rewarded,earned:{...rewarded.earned,
    [routineId]:{at:time,amount:0,kind:'routine',completed:true,day:dayKey(time),slot:studySlot(time),level:check.level,sessionId:check.id,replacedByCheckpoint:true,checkpointRewardId:rewardId}}}:rewarded;
  const seconds=Math.max(0,Math.min(900,Math.round((time-check.startedAt)/1000)));
  const snapshot={id:check.id,level:check.level,plannedMs:900000,remainingMs:900000-seconds*1000,exhausted:true,
    answers:total,scoredAnswers:total,correct:check.score,scoredCorrect:check.score,taskCounts:{checkpoint:total}};
  const settled=finishStudySession(next,stats,snapshot,time);
  const record={...settled.stats.lessons[check.id],kind:'checkpoint',quarter:check.quarter,checkReward,passed};
  return {wallet:settled.wallet,stats:{...settled.stats,lessons:{...settled.stats.lessons,[check.id]:record}},
    check:{...check,done:true,passed,awarded:checkReward+(settled.session.routineReward||0)+(settled.session.attendanceReward||0),checkReward,routineReward:settled.session.routineReward||0},duplicate:false};
}
