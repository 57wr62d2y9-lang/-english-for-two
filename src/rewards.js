import { DAY, ascentProgress, awardRoutine, dayKey, lessonRecord, lessonStudyTime, routineRewardId, studySlot } from './learning.js';

export const STREAK_DAYS=30;
export const STREAK_REWARD=10;
const validDay=value=>typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10)===value;
const dayNumber=day=>Date.parse(day)/DAY;

export function completedStudyDays(stats,time=Date.now()) {
  const days={},today=dayKey(time);
  for(const record of Object.values(stats?.lessons || {})) {
    // Old $1 payments could represent unfinished practice. Do not invent
    // attendance from those imports. New payments explicitly prove completion.
    if(record.completed!==true || (record.imported && record.completionVerified!==true))continue;
    const legacy=/^routine:(\d{4}-\d{2}-\d{2}):(morning|evening)$/.exec(record.rewardId || '');
    const at=Number(record.at);
    const day=record.studyDay || legacy?.[1] || (Number.isFinite(at) && at>0 ? dayKey(at) : null);
    const slot=record.slot || legacy?.[2] || (Number.isFinite(at) && at>0 ? studySlot(at) : null);
    if(!validDay(day) || day>today || !['morning','evening'].includes(slot))continue;
    days[day]={...days[day],[slot]:true};
  }
  return days;
}

function streakBlocks(stats,wallet,time) {
  const days=completedStudyDays(stats,time);
  const fullDays=Object.keys(days).filter(day=>days[day].morning && days[day].evening).sort();
  const claimed=Object.values(wallet?.earned || {}).filter(entry=>entry.kind==='attendance-bonus' && validDay(entry.startDay) && validDay(entry.endDay));
  const blocks=[];let pending=[],previous=null,consecutive=0;
  for(const day of fullDays) {
    if(previous===null || dayNumber(day)-dayNumber(previous)!==1){pending=[];consecutive=0;}
    consecutive++;
    // Claim ranges, not just end dates: late backup merges must never create
    // a second overlapping 30-day payment by shifting a block's starting date.
    if(claimed.some(entry=>day>=entry.startDay && day<=entry.endDay))pending=[];
    else pending.push(day);
    if(pending.length===STREAK_DAYS){blocks.push({startDay:pending[0],endDay:day});pending=[];}
    previous=day;
  }
  const alive=previous!==null && dayNumber(dayKey(time))-dayNumber(previous)<=1;
  return {days,blocks,pending:alive?pending:[],consecutive:alive?consecutive:0};
}

export function attendanceProgress(stats,wallet,time=Date.now()) {
  const state=streakBlocks(stats,wallet,time),today=dayKey(time);
  return {days:state.pending.length,total:STREAK_DAYS,consecutive:state.consecutive,today:state.days[today] || {},
    rewardedToday:Object.values(wallet?.earned || {}).some(entry=>entry.kind==='attendance-bonus' && entry.endDay===today)};
}

export function awardAttendanceBonus(wallet,stats,time=Date.now()) {
  let next=wallet,awarded=0;
  for(const block of streakBlocks(stats,wallet,time).blocks) {
    const id=`attendance30:${block.startDay}:${block.endDay}`;
    if(next.earned?.[id])continue;
    next={...next,earned:{...next.earned,[id]:{...block,at:time,amount:STREAK_REWARD,kind:'attendance-bonus'}}};
    awarded+=STREAK_REWARD;
  }
  return {wallet:next,awarded};
}

// One pure settlement for the finish button, reload safety and regression tests.
export function finishStudySession(wallet,stats,snapshot,time=Date.now()) {
  if(!snapshot || !snapshot.id || snapshot.done || stats.lessons?.[snapshot.id])return {wallet,stats,session:snapshot,duplicate:true};
  const spentSeconds=Math.max(0,Math.round((snapshot.plannedMs-snapshot.remainingMs)/1000));
  const studiedAt=lessonStudyTime(snapshot,time),rewardId=routineRewardId(studiedAt);
  const routine=awardRoutine(wallet,{...snapshot,spentSeconds},studiedAt);
  const session={...snapshot,done:true,spentSeconds,routineReward:routine.awarded,rewardReasons:routine.evaluation.reasons,
    rewardAlready:Boolean(wallet.earned?.[rewardId]) && !routine.awarded && routine.evaluation.amount>0};
  const record=lessonRecord(session,snapshot.level,time);
  if(routine.awarded)record.rewardId=rewardId;
  let nextWallet=routine.wallet;
  if(routine.awarded)nextWallet={...nextWallet,earned:{...nextWallet.earned,[rewardId]:{...nextWallet.earned[rewardId],level:snapshot.level,sessionId:snapshot.id}}};
  const key=record.studyDay,day=stats.byDay?.[key] || {};
  const nextStats={...stats,lessons:{...stats.lessons,[snapshot.id]:record},byDay:{...stats.byDay,[key]:{...day,seconds:(day.seconds||0)+spentSeconds,sessions:(day.sessions||0)+1,at:time}}};
  const bonus=awardAttendanceBonus(nextWallet,nextStats,time);
  if(bonus.awarded)record.bonusReward=bonus.awarded;
  return {wallet:bonus.wallet,stats:nextStats,session:{...session,attendanceReward:bonus.awarded,climb:record.climb,ascentBefore:ascentProgress(stats,snapshot.level).steps},duplicate:false};
}
