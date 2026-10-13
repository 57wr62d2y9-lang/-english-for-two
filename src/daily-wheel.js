import {dayKey} from './learning.js';

// All eight sectors have the same weight. No paid spins or extra attempts.
export const WHEEL_PRIZES=[
  {id:'dollar',amount:1,label:'+$1',icon:'$1',color:'#ffd277'},
  {id:'star',amount:0,label:'Звезда',icon:'⭐',color:'#f5c0e2'},
  {id:'double',amount:2,label:'+$2',icon:'$2',color:'#ffe2a1'},
  {id:'lightning',amount:0,label:'Молния',icon:'⚡',color:'#bdb3f5'},
  {id:'triple',amount:3,label:'+$3',icon:'$3',color:'#ffc088'},
  {id:'crystal',amount:0,label:'Кристалл',icon:'💎',color:'#b7e5f2'},
  {id:'clover',amount:0,label:'Клевер',icon:'🍀',color:'#bfe5c6'},
  {id:'crown',amount:0,label:'Корона',icon:'👑',color:'#ead0ff'}
];
export const wheelRewardId=time=>'daily-wheel:'+dayKey(time);
export const dailyWheelReward=(wallet,time=Date.now())=>wallet?.earned?.[wheelRewardId(time)]||null;
export const wheelPrize=record=>WHEEL_PRIZES.find(p=>p.id===record?.prizeId);
export function shouldShowDailyWheel(stats,wallet,time=Date.now()) {
  return !stats?.byDay?.[dayKey(time)]?.wheelSeenAt&&!dailyWheelReward(wallet,time);
}
export function markDailyWheelSeen(stats,time=Date.now()) {
  const day=dayKey(time),old=stats.byDay?.[day]||{};
  if(old.wheelSeenAt)return stats;
  return {...stats,byDay:{...stats.byDay,[day]:{...old,wheelSeenAt:time,at:Math.max(old.at||0,time)}}};
}
export function claimDailyWheel(wallet,identity,time=Date.now()) {
  const id=wheelRewardId(time),existing=wallet.earned?.[id];
  if(existing)return {wallet,reward:existing,duplicate:true};
  // A stable daily draw plus a date-only ledger key makes reloads, profile
  // switches and backup merges unable to add another payment for that day.
  let hash=2166136261;
  for(const ch of 'daily-prize-v1:'+dayKey(time)+':'+identity)hash=Math.imul(hash^ch.charCodeAt(0),16777619);
  hash^=hash>>>16;hash=Math.imul(hash,0x7feb352d);hash^=hash>>>15;hash=Math.imul(hash,0x846ca68b);hash^=hash>>>16;
  const prize=WHEEL_PRIZES[hash>>>29];
  const reward={kind:'daily-wheel',version:1,day:dayKey(time),prizeId:prize.id,amount:prize.amount,at:time};
  return {wallet:{...wallet,earned:{...wallet.earned,[id]:reward}},reward,duplicate:false};
}
export function wheelCollection(wallet) {
  const records=Object.values(wallet?.earned||{}).filter(r=>r.kind==='daily-wheel'&&wheelPrize(r));
  return {records:records.sort((a,b)=>b.day.localeCompare(a.day)),
    total:records.reduce((sum,r)=>sum+(Number(r.amount)||0),0),
    badges:WHEEL_PRIZES.filter(p=>!p.amount).map(p=>({...p,count:records.filter(r=>r.prizeId===p.id).length}))};
}
