import assert from 'node:assert/strict';
import {WHEEL_PRIZES,claimDailyWheel,dailyWheelReward,shouldShowDailyWheel,markDailyWheelSeen,wheelCollection,wheelRewardId} from '../src/daily-wheel.js';
import {balanceOf,dayKey} from '../src/learning.js';
import {registerDailyVisit,attendanceProgress} from '../src/rewards.js';
import {mergeStudyDay,saveStats,loadStats,saveWallet,loadWallet} from '../src/storage-v3.js';
import {backupRecords,mergeBackup} from '../src/private-backup.js';
const now=Date.parse('2026-10-13T08:00:00Z'),wallet={earned:{old:{amount:30,at:1}},spent:{gift:{cost:5,status:'approved',at:1}},goals:{}},stats={byDay:{},lessons:{},legacy:{}};
assert.equal(shouldShowDailyWheel(stats,wallet,now),true);
const visited=registerDailyVisit(stats,now),seen=markDailyWheelSeen(visited,now);
assert.equal(shouldShowDailyWheel(seen,wallet,now),false);
assert.equal(markDailyWheelSeen(seen,now+1),seen);
assert.equal(shouldShowDailyWheel(seen,wallet,now+86400000),true);
assert.equal(attendanceProgress(seen,wallet,now).days,1);
const newerDay={seconds:60,at:now+10000};
for(const pair of [[seen.byDay[dayKey(now)],newerDay],[newerDay,seen.byDay[dayKey(now)]]])assert.equal(mergeStudyDay(...pair).wheelSeenAt,now);

const draws=new Map();
for(let i=0;i<200&&draws.size<WHEEL_PRIZES.length;i++){
  const r=claimDailyWheel(wallet,'test-account-'+i,now);draws.set(r.reward.prizeId,r);
}
assert.equal(draws.size,8);
for(const prize of WHEEL_PRIZES){
  const result=draws.get(prize.id);assert.equal(result.reward.amount,prize.amount);
  assert.equal(balanceOf(result.wallet),25+prize.amount);assert.equal(balanceOf(wallet),25);
  const duplicate=claimDailyWheel(result.wallet,'changed-name',now+1000);
  assert.equal(duplicate.duplicate,true);assert.equal(duplicate.wallet,result.wallet);
  assert.equal(dailyWheelReward(result.wallet,now).prizeId,prize.id);
  assert.equal(shouldShowDailyWheel(stats,result.wallet,now),false);
  const state={level:'B1',progress:{},stats:seen,wallet:result.wallet};
  const records=backupRecords(state),restored=mergeBackup({level:'B1',progress:{},stats,wallet},records);
  assert.equal(balanceOf(restored.wallet),25+prize.amount);
  assert.equal(claimDailyWheel(restored.wallet,'changed-name',now).duplicate,true);
  const twice=mergeBackup(restored,records);
  assert.equal(balanceOf(twice.wallet),25+prize.amount);
  assert.equal(wheelCollection(twice.wallet).records.length,1);
  assert.equal(shouldShowDailyWheel(twice.stats,twice.wallet,now),false);
}
const replay=claimDailyWheel(wallet,'Artur',now);
assert.deepEqual(replay.reward,claimDailyWheel(wallet,'Artur',now).reward);
assert.equal(wheelRewardId(Date.parse('2026-10-13T20:59:59Z')),'daily-wheel:2026-10-13');
assert.equal(wheelRewardId(Date.parse('2026-10-13T21:00:00Z')),'daily-wheel:2026-10-14');
assert.equal(claimDailyWheel(replay.wallet,'Artur',now+86400000).duplicate,false);
assert.equal(attendanceProgress(registerDailyVisit(seen,now+5000),replay.wallet,now+5000).days,1);
console.log('✓ one daily popup and prize; all 8 outcomes, original money, profile changes, replay, Istanbul midnight, backup merges and visit count');

const disk=new Map(),cloud=new Map();
globalThis.localStorage={getItem:k=>disk.get(k)||null,setItem:(k,v)=>disk.set(k,v)};
globalThis.window={Telegram:{WebApp:{initData:'offline-fixture',initDataUnsafe:{user:{id:8181}},CloudStorage:{
  getKeys:cb=>cb(null,[...cloud.keys()]),getItem:(key,cb)=>cb(null,cloud.get(key)||''),
  getItems:(keys,cb)=>cb(null,Object.fromEntries(keys.map(k=>[k,cloud.get(k)||'']))),
  setItem:(key,value,cb)=>{assert.ok(value.length<=4096);cloud.set(key,value);cb(null,true);}
}}}};
const badge=draws.get('bouquet');
await saveStats(seen);await saveWallet(badge.wallet);disk.clear();
const restoredStats=await loadStats(),restoredWallet=await loadWallet();
assert.equal(shouldShowDailyWheel(restoredStats,restoredWallet,now),false);
assert.equal(balanceOf(restoredWallet),25);
assert.equal(wheelCollection(restoredWallet).items.find(p=>p.id==='bouquet').count,1);
assert.equal(claimDailyWheel(restoredWallet,'Artur',now).duplicate,true);
console.log('✓ cloud restore keeps dismissed status and zero-dollar badges; a new device cannot add another payment');
