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
import {securedItem} from './learning-fixtures.mjs';
import {ARENA_DECK} from '../supabase/functions/english-for-two-sync/arcade-summary.js';
import {DATE_ITEMS} from '../supabase/functions/english-for-two-sync/date-collection.js';

// Execute the actual endpoint with an isolated database and no outgoing network.
// No production accounts, secrets, payments or Telegram messages are involved.
const now=Date.parse('2026-10-03T08:00:00Z');
const wallet=()=>({earned:{},spent:{},goals:{},incoming:{}});
const stats=()=>({lessons:{},byDay:{}});
const identity='00000000-0000-4000-8000-000000000001',secret='a'.repeat(43);
const secretHash=Buffer.from(await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(secret))).toString('hex');
const notices=new Map();let handler,inserts=0,network=0,lastProfile;
let partnerCollection=null;
const db={from(table){
  let selected='',id;
  return {
    select(value){selected=value;return this;},
    eq(key,value){if(key==='id')id=value;return this;},
    update(value){assert.equal(table,'eft_users');lastProfile=value;return this;},
    order(){return this;},
    async limit(){return {data:[],error:null};},
    async maybeSingle(){
      if(table==='eft_users'&&selected==='secret_hash')return {data:{secret_hash:secretHash},error:null};
      if(table==='eft_users'&&selected==='routines')return {data:{routines:lastProfile?.routines||{}},error:null};
      if(table==='eft_users'&&selected.startsWith('display_name, level'))return {data:{display_name:'Artur',level:'B1',percent:74,balance:23,today_minutes:12,routines:{dateCollection:partnerCollection,morning:true,evening:false,vocabulary:{version:1,total:411,introduced:226,verified:6,ready:10}},goals:[],updated_at:'2026-10-04T06:00:00Z'},error:null};
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
  assert.ok(['./lesson-reward.js','./vocabulary-summary.js','./arcade-summary.js','./date-collection.js'].includes(specifier));
  return new vm.SourceTextModule(await readFile(new URL('../supabase/functions/english-for-two-sync/'+specifier.slice(2),import.meta.url),'utf8'),{context});
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
pool.forEach(item=>{progress[item.id]=securedItem(now);});
const final={...makeCheckpoint(pool,progress,'A2',0,now),id:'passed-final',score:16};
const graduated=finishCheckpoint(beforeFinal,stats(),final,pool,progress,now+300000);
const finalRecord=graduated.stats.lessons[final.id],finalNotice=await post(finalRecord);
assert.equal(balanceOf(graduated.wallet)-balanceOf(beforeFinal),100);
assert.equal(lessonRewardTotal(finalRecord),100);assert.equal(finalNotice.reward,100);assert.equal(finalNotice.quarter,0);
assert.equal((await post({...plainRecord,id:'legacy-three',reward:3})).reward,3);
assert.equal((await post({...plainRecord,id:'check-nine',kind:'checkpoint',quarter:9,reward:0,checkReward:5})).quarter,9);
assert.equal(lessonRewardTotal({reward:-1,checkReward:Infinity,bonusReward:NaN}),0);
const previous=inserts;
assert.equal((await handler(request(plainRecord,{}))).status,401);
assert.equal((await handler(request(plainRecord,{'x-pair-id':identity,'x-pair-secret':'b'.repeat(43)}))).status,401);
assert.equal(inserts,previous);assert.equal(network,0);
const syncRequest=profile=>new Request('https://example.invalid/sync',{method:'POST',headers:{'content-type':'application/json','x-pair-id':identity,'x-pair-secret':secret},body:JSON.stringify({action:'sync',payload:{profile}})});
const syncResponse=await handler(syncRequest({displayName:'Anna',level:'A2',percent:74,balance:39,vocabulary:{version:1,total:426,introduced:320,verified:9,ready:12}}));
assert.equal(syncResponse.status,200,await syncResponse.clone().text());
const syncData=await syncResponse.json();assert.equal(syncData.partner.vocabulary.verified,6);assert.equal(syncData.partner.balance,23);
assert.equal(syncData.partner.dateCollection,null,'old partner profiles remain compatible');
assert.equal(lastProfile.percent,2);assert.equal(lastProfile.balance,39);assert.equal(lastProfile.routines.vocabulary.verified,9);
assert.equal((await handler(syncRequest({displayName:'Anna',level:'A2',percent:74,balance:39}))).status,200);
assert.equal(lastProfile.routines.vocabulary,null);assert.equal(network,0);
const ended=Date.now(),arena={id:'qa-arena-best',deck:ARENA_DECK,completed:true,startedAt:ended-60000,at:ended,correct:12,wrong:1,bestStreak:8,score:999999};
assert.equal((await handler(syncRequest({displayName:'Anna',arcade:{version:1,records:[arena]}}))).status,200);
assert.equal(lastProfile.routines.arcade.records[0].score,112);
assert.equal((await handler(syncRequest({displayName:'Anna'}))).status,200);
assert.equal(lastProfile.routines.arcade.records[0].score,112,'old clients must preserve the new record');
assert.equal((await handler(syncRequest({displayName:'Anna',arcade:{version:1,records:[{...arena,id:'qa-weaker',correct:1,wrong:0,bestStreak:1}]}}))).status,200);
assert.equal(lastProfile.routines.arcade.records[0].score,112,'a later weaker run must not overwrite the best');
const counts=Object.fromEntries(DATE_ITEMS.map(id=>[id,1]));
assert.equal((await handler(syncRequest({displayName:'Anna',balance:39,dateCollection:{version:1,counts,completed:999}}))).status,200);
assert.equal(lastProfile.routines.dateCollection.completed,1,'completed sets are recomputed, not trusted');
assert.equal(lastProfile.balance,39,'a date must not alter cash');
assert.equal((await handler(syncRequest({displayName:'Anna',balance:39}))).status,200);
assert.equal(lastProfile.routines.dateCollection.completed,1,'old clients preserve the date collection');
assert.equal((await handler(syncRequest({displayName:'Anna',dateCollection:{version:1,counts:{bouquet:2}}}))).status,200);
assert.equal(lastProfile.routines.dateCollection.counts.bouquet,2);
assert.equal(lastProfile.routines.dateCollection.completed,1,'partial/stale counts must not erase other items');
partnerCollection={version:1,counts:Object.fromEntries(DATE_ITEMS.map(id=>[id,2])),completed:999};
const partnerSnapshot=await (await handler(syncRequest({displayName:'Anna'}))).json();
assert.equal(partnerSnapshot.partner.dateCollection.completed,2,'linked partner receives a sanitised collection');
assert.equal(Object.keys(partnerSnapshot.partner.dateCollection.counts).length,5);
const denied=syncRequest({dateCollection:{version:1,counts}});denied.headers.delete('x-pair-secret');
const beforeDenied=JSON.stringify(lastProfile);
assert.equal((await handler(denied)).status,401);assert.equal(JSON.stringify(lastProfile),beforeDenied);
assert.equal(network,0);
console.log('✓ actual offline endpoint preserves bounded date counts across stale/old clients, recomputes sets and rejects unauthorised updates');
console.log('✓ actual offline endpoint sanitises weekly scores, preserves best records across old clients and weaker submissions, with unchanged account authentication');
console.log('✓ actual offline notification endpoint: $1, $5, $100 and attendance totals match settled wallet amounts; duplicate and unauthorized requests cannot write news');
console.log('✓ actual offline profile endpoint: versioned mastery counts round-trip, override stale exposure percentages and do not modify wallets or credentials');
