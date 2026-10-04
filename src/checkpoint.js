import {checkpointCandidates,levelTarget,shuffle,courseProgress,COURSE_VERSION,dayKey,studySlot,routineRewardId,finalLevelReady,levelCompletionId,awardMilestone,awardLevelCompletion,balanceOf} from './learning.js';
import {finishStudySession} from './rewards.js';
import {progressFor} from './lexicon.js';
import {readyForCheck,isSecured,CHECK_BATCH_SIZE,CHECK_REVIEW_DAYS} from './mastery.js';
import {vocabularyTask as typedVocabularyTask} from './vocabulary-tasks.js';
const DAY=86400000;
const CHECK_VERSION='vocabulary-proof-1';

export function rewardedVocabulary(wallet,level) {
  return new Set(Object.values(wallet?.earned || {}).filter(r=>r.level===level && r.mastery===true).flatMap(r=>r.itemIds || []));
}
export function masteryCheckCandidates(items,progress,wallet,level,time=Date.now()) {
  const covered=rewardedVocabulary(wallet,level),pool=items.filter(i=>i.level===level);
  const ready=pool.filter(i=>readyForCheck(progressFor(i,progress),time));
  const fresh=ready.filter(i=>!covered.has(i.id));
  const remaining=pool.filter(i=>!covered.has(i.id)).length;
  const review=ready.filter(i=>covered.has(i.id) && !isSecured(progressFor(i,progress)) &&
    (!progressFor(i,progress).checkAt || time-progressFor(i,progress).checkAt>=CHECK_REVIEW_DAYS*DAY));
  const unresolved=pool.filter(i=>covered.has(i.id)&&!isSecured(progressFor(i,progress))).length;
  if(fresh.length>=Math.min(5,remaining || 5))return {items:shuffle(fresh).slice(0,CHECK_BATCH_SIZE),retest:false};
  if(review.length>=Math.min(5,unresolved || 5))return {items:shuffle(review).slice(0,CHECK_BATCH_SIZE),retest:true};
  return {items:[],retest:false};
}
const batchRewardId=(level,ids)=>{
  const text=[...ids].sort().join('|');let a=2166136261,b=5381;
  for(const c of text){a=Math.imul(a^c.charCodeAt(0),16777619);b=Math.imul(b,33)^c.charCodeAt(0);}
  return `${CHECK_VERSION}:${level}:${(a>>>0).toString(16)}${(b>>>0).toString(16)}`;
};

export function buildCheckpoint(items,progress,quarter) {
  const candidates=checkpointCandidates(items,progress,quarter);
  return candidates.length===10?candidates.map((item,index)=>typedVocabularyTask(item,index%2?'context':'recall',items,index)):[];
}
export function buildFinalCheck(items,progress,level=items[0]?.level) {
  // Old callers passed unrelated banks as the third argument.
  if(typeof level!=='string')level=items[0]?.level;
  const pool=items.filter(item=>item.level===level);
  const candidates=shuffle(pool.filter(item=>isSecured(progressFor(item,progress))));
  if(candidates.length<levelTarget(level))return [];
  return candidates.slice(0,20).map((item,index)=>typedVocabularyTask(item,index%2?'context':'recall',pool,index));
}

// A check replaces the next lesson, and an unsuccessful attempt leaves room
// for ordinary learning for the rest of that date. It can still be retried.
export function pendingCheckpoint(items,progress,wallet,stats,level,time=Date.now()) {
  if(Object.values(stats.lessons || {}).some(r=>r.kind==='checkpoint'&&r.level===level&&r.studyDay===dayKey(time)))return null;
  if(finalLevelReady(items,progress,wallet,level) && !wallet.earned?.[levelCompletionId(level)])return {quarter:0,level,amount:level==='A2'?100:0,count:20};
  const candidate=masteryCheckCandidates(items,progress,wallet,level,time);
  if(!candidate.items.length)return null;
  const ids=candidate.items.map(i=>i.id),quarter=1+Object.values(stats.lessons || {}).filter(r=>r.kind==='checkpoint'&&r.level===level&&r.mode==='mastery').length;
  return {mode:'mastery',quarter,level,itemIds:ids,count:ids.length,retest:candidate.retest,
    amount:candidate.retest?0:5,rewardId:batchRewardId(level,ids)};
}

export function makeCheckpoint(items,progress,level,quarter,time=Date.now()) {
  const descriptor=typeof quarter==='object'?quarter:null,q=descriptor?.quarter??quarter;
  const tasks=descriptor?.mode==='mastery'?descriptor.itemIds.map(id=>items.find(i=>i.id===id))
    .filter(i=>i&&i.level===level&&readyForCheck(progressFor(i,progress),time))
    .map((item,index)=>typedVocabularyTask(item,index%2?'context':'recall',items,index)):
    q?buildCheckpoint(items,progress,q):buildFinalCheck(items,progress,level);
  if(descriptor?.mode==='mastery'?(tasks.length!==descriptor.count || tasks.length<1 || tasks.length>CHECK_BATCH_SIZE):tasks.length!==(q?10:20))return null;
  return {...descriptor,version:6,kind:'checkpoint',id:globalThis.crypto?.randomUUID?.() || `check-${time}-${Math.random().toString(36).slice(2)}`,quarter:q,level,tasks,index:0,score:0,startedAt:time,
    verifiedAtStart:courseProgress(items,progress,level).verified};
}

export function resumeCheckpoint(draft,items) {
  if(draft.version===6)return draft;
  // Do not discard an already answered question, saved score or payment ID.
  return {...draft,version:6,tasks:draft.tasks.map((task,index)=>index<draft.index ||
    (index===draft.index&&draft.selected!==undefined)?task:typedVocabularyTask(task.item,'recall',items,index))};
}

export function finishCheckpoint(wallet,stats,check,items,progress,time=Date.now()) {
  if(!check || check.done || stats.lessons?.[check.id])return {wallet,stats,check,duplicate:true};
  const total=check.tasks.length,path=courseProgress(items,progress,check.level);
  const passed=(check.mode==='mastery'?total>=1&&total<=CHECK_BATCH_SIZE:total===(check.quarter?10:20)) &&
    Number.isInteger(check.score) && check.score>=Math.ceil(total*.8) && check.score<=total;
  const rewardId=check.mode==='mastery'?check.rewardId:check.quarter?`${COURSE_VERSION}:${check.level}:${check.quarter}`:levelCompletionId(check.level);
  const covered=rewardedVocabulary(wallet,check.level);
  const newReward=check.mode==='mastery' && passed && !check.retest && !wallet.earned?.[rewardId] &&
    Array.isArray(check.itemIds) && check.itemIds.length===total && new Set(check.itemIds).size===total && check.itemIds.every(id=>!covered.has(id));
  const rewarded=check.mode==='mastery'?(newReward?{...wallet,earned:{...wallet.earned,[rewardId]:{at:time,level:check.level,quarter:check.quarter,amount:5,kind:'checkpoint',mastery:true,itemIds:check.itemIds,score:check.score,total}}}:wallet):
    check.quarter?awardMilestone(wallet,check.level,check.quarter,check.score,path.practised,time):
    check.verifiedAtStart>=path.total || finalLevelReady(items,progress,wallet,check.level)?awardLevelCompletion(wallet,check.level,check.score,total,time,Math.max(path.verified,check.verifiedAtStart||0)):wallet;
  const checkReward=balanceOf(rewarded)-balanceOf(wallet);
  const routineId=routineRewardId(time);
  // The $5 / $100 award is the payment for this scheduled lesson. The zero
  // marker proves completion and prevents a second $1 in the same time slot.
  const next=passed&&checkReward>0&&!rewarded.earned?.[routineId]?{...rewarded,earned:{...rewarded.earned,
    [routineId]:{at:time,amount:0,kind:'routine',completed:true,day:dayKey(time),slot:studySlot(time),level:check.level,sessionId:check.id,replacedByCheckpoint:true,checkpointRewardId:rewardId}}}:rewarded;
  const seconds=Math.max(0,Math.min(900,Math.round((time-check.startedAt)/1000)));
  const snapshot={id:check.id,level:check.level,plannedMs:900000,remainingMs:900000-seconds*1000,exhausted:true,
    answers:total,scoredAnswers:total,correct:check.score,scoredCorrect:check.score,taskCounts:{checkpoint:total}};
  const settled=finishStudySession(next,stats,snapshot,time);
  const record={...settled.stats.lessons[check.id],kind:'checkpoint',quarter:check.quarter,checkReward,passed,mode:check.mode,retest:check.retest};
  return {wallet:settled.wallet,stats:{...settled.stats,lessons:{...settled.stats.lessons,[check.id]:record}},
    check:{...check,done:true,passed,awarded:checkReward+(settled.session.routineReward||0)+(settled.session.attendanceReward||0),checkReward,routineReward:settled.session.routineReward||0},duplicate:false};
}
