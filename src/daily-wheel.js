import {dayKey} from './learning.js';
import {cleanDateCollection} from '../supabase/functions/english-for-two-sync/date-collection.js';

// All eight sectors have the same weight. No paid spins or extra attempts.
export const WHEEL_PRIZES=[
  {id:'dollar',amount:1,label:'+$1',icon:'$1',color:'#ffd277'},
  {id:'bouquet',amount:0,label:'Букет «Muse»',shortLabel:'Muse',description:'Скульптурный букет с антуриумами и лентой',color:'#f5c0e2'},
  {id:'double',amount:2,label:'+$2',icon:'$2',color:'#ffe2a1'},
  {id:'coffee',amount:0,label:'Cloud Latte ×2',shortLabel:'Latte ×2',description:'Два айс-латте с облачком нежной пенки',color:'#d9cff3'},
  {id:'triple',amount:3,label:'+$3',icon:'$3',color:'#ffc088'},
  {id:'ticket',amount:0,label:'Билет в путешествие',shortLabel:'Билет',description:'Boarding pass на приключение вдвоём',color:'#b7e5f2'},
  {id:'bag',amount:0,label:'Hermès с деньгами',shortLabel:'Hermès',description:'Оранжевая сумка, полная купюр',color:'#ffd3b4'},
  {id:'keys',amount:0,label:'Ключи от суперкара',shortLabel:'Ключи',description:'Ключи от машины мечты',color:'#d6d8ed'}
];
// Resolve old awards instead of rewriting the ledger: backup restores and
// an older client cannot duplicate an item or lose the original payment.
const LEGACY_PRIZES={star:'bouquet',lightning:'coffee',crystal:'ticket',clover:'bag',crown:'keys'};
export const wheelRewardId=time=>'daily-wheel:'+dayKey(time);
export const dailyWheelReward=(wallet,time=Date.now())=>wallet?.earned?.[wheelRewardId(time)]||null;
export const wheelPrize=record=>WHEEL_PRIZES.find(p=>p.id===(LEGACY_PRIZES[record?.prizeId]||record?.prizeId));
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
  const reward={kind:'daily-wheel',version:2,day:dayKey(time),prizeId:prize.id,amount:prize.amount,at:time};
  return {wallet:{...wallet,earned:{...wallet.earned,[id]:reward}},reward,duplicate:false};
}
export function wheelCollection(wallet) {
  const records=Object.values(wallet?.earned||{}).filter(r=>r.kind==='daily-wheel'&&wheelPrize(r));
  const items=WHEEL_PRIZES.filter(p=>!p.amount).map(p=>({...p,count:records.filter(r=>wheelPrize(r).id===p.id).length}));
  const completed=Math.min(...items.map(p=>p.count));
  return {records:records.sort((a,b)=>b.day.localeCompare(a.day)),items,completed,
    nextProgress:items.filter(p=>p.count>completed).length,
    total:records.reduce((sum,r)=>sum+(Number(r.amount)||0),0),
  };
}
export function dateCollectionSummary(wallet) {
  return cleanDateCollection({version:1,counts:Object.fromEntries(wheelCollection(wallet).items.map(p=>[p.id,p.count]))});
}
