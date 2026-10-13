export const ARENA_DECK='personal-v2';
export const arenaDay=(time=Date.now())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(time));
export function weekKey(time=Date.now()) {
  const day=new Date(arenaDay(time)+'T12:00:00Z');
  day.setUTCDate(day.getUTCDate()-(day.getUTCDay()+6)%7);
  return day.toISOString().slice(0,10);
}
export const arenaScore=(correct,wrong)=>Math.max(0,correct*10-wrong*8);
export function cleanArenaRecord(raw,time=Date.now()) {
  if(!raw||![ARENA_DECK,'a2-common-v1'].includes(raw.deck)||raw.completed!==true)return null;
  const {correct,wrong,startedAt,at,bestStreak}=raw;
  if(![correct,wrong,bestStreak].every(n=>Number.isSafeInteger(n)&&n>=0&&n<=180)||correct+wrong<1||correct+wrong>180||bestStreak>correct)return null;
  if(!Number.isSafeInteger(at)||!Number.isSafeInteger(startedAt)||startedAt<1||at>time+60000||at-startedAt<60000||at-startedAt>90000)return null;
  if(!/^[\w-]{1,100}$/.test(String(raw.id||'')))return null;
  return {id:raw.id,deck:raw.deck,level:['A2','B1','B2','C1'].includes(raw.level)?raw.level:'A2',completed:true,week:weekKey(startedAt),startedAt,at,correct,wrong,bestStreak,score:arenaScore(correct,wrong)};
}
export function compareArena(a,b) {
  if(!a)return b?-1:0;if(!b)return 1;
  return a.score-b.score || (a.correct/(a.correct+a.wrong)-b.correct/(b.correct+b.wrong)) || a.bestStreak-b.bestStreak || (b.at||0)-(a.at||0);
}
export function cleanArcadeSummary(raw,time=Date.now()) {
  const byWeek={};
  if(raw?.version===1)for(const value of (Array.isArray(raw.records)?raw.records:[]).slice(0,32)) {
    const record=cleanArenaRecord(value,time);if(!record)continue;
    if(compareArena(record,byWeek[record.week])>0)byWeek[record.week]=record;
  }
  return {version:1,records:Object.values(byWeek).sort((a,b)=>b.week.localeCompare(a.week)).slice(0,8)};
}
export const mergeArcadeSummary=(a,b,time=Date.now())=>cleanArcadeSummary({version:1,records:[...(a?.records||[]),...(b?.records||[])]},time);
