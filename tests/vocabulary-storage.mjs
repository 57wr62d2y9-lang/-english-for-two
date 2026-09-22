import assert from 'node:assert/strict';
import {lexiconForLevel} from '../src/lexicon.js';
import {saveLevelProgress,loadLevelProgress,packItems,progressChunks} from '../src/storage-v3.js';
import {reviewItem} from '../src/learning.js';

// Entirely in-memory CloudStorage double; no real Telegram user or network.
const disk=new Map(),remote=new Map(),writes=[];
globalThis.localStorage={getItem:key=>disk.get(key)||null,setItem:(key,value)=>disk.set(key,value)};
let failOverflow=false;
globalThis.window={Telegram:{WebApp:{initData:'unit-test',initDataUnsafe:{user:{id:'vocab-unit-test'}},CloudStorage:{
  getKeys(callback){callback(null,[...remote.keys()]);},
  getItems(keys,callback){callback(null,Object.fromEntries(keys.map(key=>[key,remote.get(key)||''])));},
  getItem(key,callback){callback(null,remote.get(key)||'');},
  setItem(key,value,callback){
    assert.ok(value.length<=4096,key);writes.push(key);
    if(failOverflow && /^eft3_p_A2_\d+_\d+$/.test(key)){callback('test connection failure');return;}
    remote.set(key,value);callback(null,true);
  }
}}}};
const now=Date.parse('2026-09-22T06:00:00Z');
const progress=Object.fromEntries(lexiconForLevel('A2').map(item=>[item.id,{...reviewItem(undefined,'context',now,item.id).item,c:123,w:45,days:Array.from({length:8},(_,i)=>'2026-09-'+(10+i)),event:'lesson-00000000-0000-4000-8000-000000000000:123'}]));
const hash=id=>[...id].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0)%64;
const overflowBucket=Array.from({length:64},(_,i)=>i).find(bucket=>progressChunks(Object.fromEntries(Object.entries(progress).filter(([id])=>hash(id)===bucket))).length>1);
assert.notEqual(overflowBucket,undefined);
const oldId=Object.keys(progress).find(id=>hash(id)===overflowBucket);
const old={...progress[oldId],l:now-100,c:1};
const oldBase=JSON.stringify(packItems({[oldId]:old}));
remote.set('eft3_p_A2_'+overflowBucket,oldBase);
failOverflow=true;
assert.equal(await saveLevelProgress('A2',progress),false);
assert.equal(remote.get('eft3_p_A2_'+overflowBucket),oldBase,'base is not overwritten after failed overflow');
failOverflow=false;
assert.equal(await saveLevelProgress('A2',progress),true);
assert.ok(writes.indexOf('eft3_p_A2_'+overflowBucket+'_1')<writes.indexOf('eft3_p_A2_'+overflowBucket));
disk.clear(); // simulate a new device, not a production data deletion
const restored=await loadLevelProgress('A2');
assert.equal(Object.keys(restored).length,Object.keys(progress).length);
for(const [id,item] of Object.entries(progress)){assert.equal(restored[id].c,item.c,id);assert.equal(restored[id].n,item.n,id);}
assert.equal(restored[oldId].c,123,'newer progress wins over a legacy base copy');
const edited={...restored,[oldId]:{...restored[oldId],l:now+1000,c:124}};
assert.equal(await saveLevelProgress('A2',edited),true);
disk.clear();assert.equal((await loadLevelProgress('A2'))[oldId].c,124);
console.log('✓ storage: bounded overflow, failure-safe legacy preservation, retry, new-device restore and later edits');
