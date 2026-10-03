import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {transform} from 'esbuild';
import {lexiconForLevel} from '../src/lexicon.js';
import {DAY,awardMilestone,balanceOf,checkpointThreshold,dayKey} from '../src/learning.js';
import {makeSession} from '../src/lesson-engine.js';
import {makeCheckpoint,finishCheckpoint} from '../src/checkpoint.js';
import {finishStudySession,lessonRewardTotal} from '../src/rewards.js';

// Execute the actual endpoint with an isolated database and no outgoing network.
// No production accounts, secrets, payments or Telegram messages are involved.
const now=Date.parse('2026-10-03T08:00:00Z');
const wallet=()=>({earned:{},spent:{},goals:{},incoming:{}});
const stats=()=>({lessons:{},byDay:{}});
const identity='00000000-0000-4000-8000-000000000001',secret='a'.repeat(43);
const secretHash=Buffer.from(await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(secret))).toString('hex');
const notices=new Map();let handler,inserts=0,network=0;
const db={from(table){
  let selected='',id;
  return {
    select(value){selected=value;return this;},
    eq(key,value){if(key==='id')id=value;return this;},
    async maybeSingle(){
      if(table==='eft_users'&&selected==='secret_hash')return {data:{secret_hash:secretHash},error:null};
      if(table==='eft_pairs')return {data:{partner_id:'00000000-0000-4000-8000-000000000002'},error:null};
      if(table==='eft_notifications')return {data:notices.has(id)?{id}:null,error:null};
      throw Error(`Unexpected query: ${table} ${selected}`);
    },
    async single(){assert.equal(table,'eft_users');assert.equal(selected,'display_name');return {data:{display_name:'Anna'},error:null};},
    async insert(row){assert.equal(table,'eft_notifications');inserts++;notices.set(row.id,row);return {error:null};}
  };
}};
const context=vm.createContext({
  console,TextEncoder,Uint8Array,Request,Response,URLSearchParams,crypto:webcrypto,
  setTimeout,clearTimeout,mockCreateClient:()=>db,
  fetch:async()=>{network++;throw Error('Notification tests must stay offline');},
  Deno:{env:{get:key=>({SUPABASE_URL:'https://example.invalid',SUPABASE_SERVICE_ROLE_KEY:'isolated-test'})[key]},serve:fn=>{handler=fn;}}
});
const source=await readFile(new URL('../supabase/functions/english-for-two-sync/index.ts',import.meta.url),'utf8');
const compiled=await transform(source,{loader:'ts',format:'esm',target:'es2022'});
const module=new vm.SourceTextModule(compiled.code,{context});
await module.link(async specifier=>{
  if(specifier.startsWith('npm:@supabase/supabase-js@'))return new vm.SourceTextModule('export const createClient=globalThis.mockCreateClient;',{context});
  assert.equal(specifier,'./lesson-reward.js');
  return new vm.SourceTextModule(await readFile(new URL('../supabase/functions/english-for-two-sync/lesson-reward.js',import.meta.url),'utf8'),{context});
});
await module.evaluate();
const request=(lesson,headers={'x-pair-id':identity,'x-pair-secret':secret})=>new Request('https://example.invalid/sync',{
  method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify({action:'publish_lesson',payload:{lesson}})
});
const post=async lesson=>{
  const response=await handler(request({...lesson,accuracy:80,steps:1}));
  assert.equal(response.status,200,await response.clone().text());
  assert.equal((await response.json()).published,true);
  return notices.get(`${identity}:${lesson.id}`).payload;
};
const recentVisits=()=>({lessons:{},byDay:Object.fromEntries(Array.from({length:29},(_,i)=>[dayKey(now-(i+1)*DAY),{visitedAt:now-(i+1)*DAY}]))});

const ordinary={...makeSession('B1',15,0,now),remainingMs:0,answers:20,scoredAnswers:20,correct:16};
const plain=finishStudySession(wallet(),stats(),ordinary,now);
const plainRecord=plain.stats.lessons[ordinary.id];
assert.equal(lessonRewardTotal(plainRecord),1);
assert.equal((await post(plainRecord)).reward,1);
const withAttendance=finishStudySession(wallet(),recentVisits(),{...ordinary,id:'ordinary-attendance'},now);
assert.equal(balanceOf(withAttendance.wallet),11);
assert.equal((await post(withAttendance.stats.lessons['ordinary-attendance'])).reward,11);

const pool=lexiconForLevel('A2'),progress=Object.fromEntries(pool.map(i=>[i.id,{s:'LEARNING',c:1}]));
assert.ok(pool.length>=checkpointThreshold('A2',1));
for(const [id,score,initialStats,expected] of [['passed-check',8,stats(),5],['failed-check',7,stats(),1],['check-attendance',8,recentVisits(),15]]){
  const check={...makeCheckpoint(pool,progress,'A2',1,now),id,score};
  const settled=finishCheckpoint(wallet(),initialStats,check,pool,progress,now+180000);
  const record=settled.stats.lessons[id],notice=await post(record);
  assert.equal(lessonRewardTotal(record),balanceOf(settled.wallet));
  assert.equal(notice.reward,expected);assert.equal(notice.kind,'checkpoint');assert.equal(notice.quarter,1);
  assert.equal(notice.passed,score>=8);
  const previous=inserts;await post(record);assert.equal(inserts,previous);
}
let beforeFinal=wallet();for(const q of [1,2,3])beforeFinal=awardMilestone(beforeFinal,'A2',q,8,pool.length,now-DAY);
const final={...makeCheckpoint(pool,progress,'A2',0,now),id:'passed-final',score:16};
const graduated=finishCheckpoint(beforeFinal,stats(),final,pool,progress,now+300000);
const finalRecord=graduated.stats.lessons[final.id],finalNotice=await post(finalRecord);
assert.equal(balanceOf(graduated.wallet)-balanceOf(beforeFinal),100);
assert.equal(lessonRewardTotal(finalRecord),100);assert.equal(finalNotice.reward,100);assert.equal(finalNotice.quarter,0);
assert.equal((await post({...plainRecord,id:'legacy-three',reward:3})).reward,3);
assert.equal(lessonRewardTotal({reward:-1,checkReward:Infinity,bonusReward:NaN}),0);
const previous=inserts;
assert.equal((await handler(request(plainRecord,{}))).status,401);
assert.equal((await handler(request(plainRecord,{'x-pair-id':identity,'x-pair-secret':'b'.repeat(43)}))).status,401);
assert.equal(inserts,previous);assert.equal(network,0);
console.log('✓ actual offline notification endpoint: $1, $5, $100 and attendance totals match settled wallet amounts; duplicate and unauthorized requests cannot write news');
