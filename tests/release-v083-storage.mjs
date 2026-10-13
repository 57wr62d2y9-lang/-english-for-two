import assert from 'node:assert/strict';
import {saveStats,loadStats,emptyStats} from '../src/storage-v3.js';
import {speedMemoryChunks} from '../src/speed-memory.js';
const disk=new Map(),remote=new Map(),writes=[];let fail=true;
globalThis.localStorage={getItem:k=>disk.get(k)||null,setItem:(k,v)=>disk.set(k,v)};
globalThis.window={Telegram:{WebApp:{initData:'isolated',initDataUnsafe:{user:{id:'speed-test'}},CloudStorage:{
  getKeys:cb=>cb(null,[...remote.keys()]),getItems:(ks,cb)=>cb(null,Object.fromEntries(ks.map(k=>[k,remote.get(k)||'']))),getItem:(k,cb)=>cb(null,remote.get(k)||''),
  setItem(k,v,cb){assert.ok(v.length<=4096,k);writes.push(k);if(fail&&/^eft5_speed_0_/.test(k))return cb('offline');remote.set(k,v);cb(null,true);}
}}}};
const hash=id=>[...id].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0)%64,at=Date.parse('2026-10-13T09:00:00Z');
const memory={};for(let i=0;Object.keys(memory).length<150;i++){const key='B1:test-'+i;if(hash(key)===0)memory[key]={at:at+i,correct:i%2===0,ms:1000};}
assert.ok(speedMemoryChunks(memory).length>1);
remote.set('eft5_speed_0',JSON.stringify({}));
const stats={...emptyStats(),speedMemory:memory};
await saveStats(stats);assert.equal(remote.get('eft5_speed_0'),'{}');
assert.ok(JSON.parse(disk.get('eft3:speed-test:pendingSpeed')).includes(0));
fail=false;await saveStats(stats);
assert.equal(JSON.parse(disk.get('eft3:speed-test:pendingSpeed')).length,0);
assert.ok(writes.indexOf('eft5_speed_0_1')<writes.indexOf('eft5_speed_0'));
disk.clear();const restored=await loadStats();assert.deepEqual(restored.speedMemory,memory);
const key=Object.keys(memory)[0],newer={...memory[key],at:at+99999,correct:false};
await saveStats({...restored,speedMemory:{...restored.speedMemory,[key]:newer}});
await saveStats(stats);disk.clear();assert.deepEqual((await loadStats()).speedMemory[key],newer);
console.log('✓ speed history: 4KB-safe chunking, failed overflow leaves old data, durable retry, new-device recovery and stale-write protection');
