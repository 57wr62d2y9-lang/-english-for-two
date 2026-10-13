import {lexiconForLevel,progressFor} from './lexicon.js';
import {dayKey} from './learning.js';
import {ARENA_DECK,weekKey,arenaScore,compareArena,cleanArcadeSummary} from '../supabase/functions/english-for-two-sync/arcade-summary.js';
export {ARENA_DECK,weekKey,arenaScore,compareArena};
export function seededShuffle(values,seed) {
  let state=2166136261;for(const c of String(seed))state=Math.imul(state^c.charCodeAt(0),16777619)>>>0;
  const out=[...values];
  for(let i=out.length-1;i>0;i--){state=(Math.imul(state,1664525)+1013904223)>>>0;const j=state%(i+1);[out[i],out[j]]=[out[j],out[i]];}
  return out;
}
export const dailyThemes=[
  {id:'mix',icon:'✦',title:'Лексический микс',description:'Вспомни → выбери → примени',pattern:['recall','recognition','context','recall']},
  {id:'context',icon:'◆',title:'Фразы в ситуации',description:'Больше живых контекстов',pattern:['context','recall','recognition','context']},
  {id:'recall',icon:'ϟ',title:'Память на старте',description:'Больше самостоятельных ответов',pattern:['recall','context','recall','recognition']}
];
export function dailyAdventure(name,time=Date.now()) {
  const day=dayKey(time),theme=seededShuffle(dailyThemes,day+':'+name)[0];
  return {...theme,day,target:12};
}
export function speedPool(mode,level,progress) {
  const pool=mode==='arena'?lexiconForLevel('A2').filter(i=>i.kind==='word'&&i.phrase.split(/\s+/).length<=2):
    lexiconForLevel(level).filter(i=>{const p=progressFor(i,progress);return p&&p.s!=='NEW';});
  // Equivalent translations never occur together among the four options.
  return pool.filter((i,n)=>pool.findIndex(other=>other.ru.trim().toLowerCase()===i.ru.trim().toLowerCase())===n);
}
export function speedQuestions(pool,seed) {
  return seededShuffle(pool,seed).map((item,index)=>({item,prompt:item.phrase,answer:item.ru,
    options:seededShuffle([item.ru,...seededShuffle(pool.filter(i=>i.id!==item.id&&i.ru!==item.ru),seed+':'+item.id).slice(0,3).map(i=>i.ru)],seed+':options:'+index)}));
}
export function createSpeedRound(mode,level,progress,time=Date.now()) {
  const pool=speedPool(mode,level,progress);if(pool.length<4)return null;
  // Same deck, order and distractors all week for both people and all attempts.
  const seed=mode==='arena'?ARENA_DECK+':'+weekKey(time):'review:'+dayKey(time)+':'+time;
  return {id:globalThis.crypto?.randomUUID?.()||'speed-'+time,mode,level,questions:speedQuestions(pool,seed),index:0,
    correct:0,wrong:0,streak:0,bestStreak:0,score:0,startedAt:time,deadline:time+60000,lastAnswerAt:time,answers:[],done:false};
}
export function answerSpeedRound(round,value,time=Date.now()) {
  if(round.done||time>=round.deadline||time-round.lastAnswerAt<250)return round;
  const task=round.questions[round.index%round.questions.length];
  if(!task.options.includes(value))return round;
  const ok=value===task.answer,correct=round.correct+Number(ok),wrong=round.wrong+Number(!ok),streak=ok?round.streak+1:0;
  return {...round,index:round.index+1,correct,wrong,streak,bestStreak:Math.max(round.bestStreak,streak),score:arenaScore(correct,wrong),lastAnswerAt:time,
    answers:[...round.answers,{id:task.item.id,en:task.item.phrase,ru:task.answer,value,correct:ok}]};
}
export function finishSpeedRound(round,stats,time=Date.now(),{aborted=false}={}) {
  if(round.done)return {round,stats};
  const completed=!aborted&&time>=round.deadline&&time-round.startedAt<=90000&&round.index>0;
  const result={...round,done:true,completed,at:time,deck:ARENA_DECK,week:weekKey(round.startedAt)};
  if(!completed)return {round:result,stats};
  const day=dayKey(round.startedAt),old=stats.byDay?.[day]||{},field=round.mode==='arena'?'arenaBest':'speedBest';
  if((old.speedRoundIds||[]).includes(round.id))return {round:result,stats};
  const record={id:round.id,deck:ARENA_DECK,completed:true,startedAt:round.startedAt,at:time,week:result.week,correct:round.correct,wrong:round.wrong,bestStreak:round.bestStreak,score:round.score};
  const best=compareArena(record,old[field])>0?record:old[field];
  return {round:{...result,newBest:best===record},stats:{...stats,byDay:{...stats.byDay,[day]:{...old,[field]:best,speedRounds:(old.speedRounds||0)+1,speedRoundIds:[...(old.speedRoundIds||[]),round.id].slice(-20),
    seconds:(old.seconds||0)+60,answers:(old.answers||0)+round.index,correct:(old.correct||0)+round.correct,visitedAt:old.visitedAt||round.startedAt,at:time}}}};
}
export function arcadeSummary(stats,time=Date.now()) {
  const byWeek={};
  for(const day of Object.values(stats.byDay||{}))if(day.arenaBest){const r=day.arenaBest,w=weekKey(r.startedAt);if(compareArena(r,byWeek[w])>0)byWeek[w]=r;}
  return cleanArcadeSummary({version:1,records:Object.entries(byWeek).sort(([a],[b])=>b.localeCompare(a)).slice(0,8).map(([,r])=>r)},time);
}
export function championship(stats,partner,time=Date.now()) {
  const week=weekKey(time),previous=weekKey(Date.parse(week+'T12:00:00Z')-7*86400000);
  const own=arcadeSummary(stats,time).records,other=cleanArcadeSummary(partner?.arcade,time).records;
  const current={own:own.find(r=>r.week===week),other:other.find(r=>r.week===week)};
  const a=own.find(r=>r.week===previous),b=other.find(r=>r.week===previous);
  // No invented opponent score: wait for a partner update from the new week.
  const fresh=Boolean(partner&&weekKey(partner.at||1)>=week);
  const winner=!fresh?'pending':!a&&!b?'none':compareArena(a,b)>0?'self':compareArena(a,b)<0?'partner':'tie';
  return {week,previous,current,winner,last:{own:a,other:b}};
}
