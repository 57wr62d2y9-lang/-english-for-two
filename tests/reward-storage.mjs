import assert from 'node:assert/strict';
import { loadWallet, saveWallet } from '../src/storage-v3.js';
import { balanceOf } from '../src/learning.js';

// In-memory doubles only: no production identity, requests or credits.
const disk=new Map(),remote=new Map(),batches=[];
globalThis.localStorage={getItem:key=>disk.get(key)||null,setItem:(key,value)=>disk.set(key,value)};
globalThis.window={Telegram:{WebApp:{initData:'reward-unit-test',initDataUnsafe:{user:{id:'reward-unit-test'}},CloudStorage:{
  getKeys(callback){callback(null,[...remote.keys()]);},
  getItems(keys,callback){batches.push(keys.length);callback(null,Object.fromEntries(keys.map(key=>[key,remote.get(key)||''])));},
  getItem(key,callback){callback(null,remote.get(key)||'');},
  setItem(key,value,callback){assert.ok(value.length<=4096);remote.set(key,value);callback(null,true);}
}}}};
const wallet={earned:Object.fromEntries(Array.from({length:150},(_,i)=>[`lesson-${i}`,{amount:1,at:i+1}])),spent:{gift:{cost:15,status:'approved',at:1000}},goals:{},incoming:{},partner:null};
wallet.earned['route-2026-1:A2:1']={amount:100,at:1};
wallet.earned['attendance30:2026-08-01:2026-08-30']={kind:'attendance-bonus',amount:10,at:2000,startDay:'2026-08-01',endDay:'2026-08-30'};
await saveWallet(wallet);
disk.clear(); // new-device simulation in test memory
const restored=await loadWallet();
assert.equal(Object.keys(restored.earned).length,152);assert.equal(balanceOf(restored),245);
assert.equal(restored.earned['route-2026-1:A2:1'].amount,100);
assert.equal(restored.earned['attendance30:2026-08-01:2026-08-30'].startDay,'2026-08-01');
assert.equal(restored.spent.gift.status,'approved');assert.ok(batches.length>=4);assert.ok(batches.every(n=>n<=50));
console.log('✓ complete wallet restore: 152 earnings, gifts, legacy amounts and claimed streak ranges survive a new device');
