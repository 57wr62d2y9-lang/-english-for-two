// Opt-in live regression test. Only fresh random QA accounts are used.
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
const endpoint=process.env.EFT_LIVE_TEST_URL;
if(!endpoint)throw new Error('Set EFT_LIVE_TEST_URL explicitly to run the live QA test.');
const accounts=[0,1].map(()=>({id:randomUUID(),secret:randomBytes(32).toString('base64url')}));
await writeFile('/tmp/eft-v03-qa-account-ids.json',JSON.stringify(accounts.map(a=>a.id)),{mode:0o600});
async function call(index,action,payload={},secret) {
  const account=accounts[index];const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json','x-pair-id':account.id,'x-pair-secret':secret||account.secret},body:JSON.stringify({action,payload})});
  const body=await response.json();return {...body,status:response.status};
}
for(const index of [0,1])assert.equal((await call(index,'sync',{profile:{displayName:index?'Anna':'Artur',level:index?'A2':'B1',balance:10}})).ok,true);
const code=await call(0,'create_pair_code');assert.ok(code.code);
assert.equal((await call(1,'join_pair',{code:code.code})).paired,true);
const at=Date.now();
assert.equal((await call(0,'save_state',{records:[{key:'progress:B1:qa-unit',at,data:{s:'LEARNING',c:4,w:1,l:at,xp:25}},{key:'draft',at,data:{id:'qa-draft',step:15,remainingMs:345000}},{key:'wallet:earned:qa-lesson',at,data:{at,amount:2}}]})).saved,3);
assert.equal((await call(0,'save_state',{records:[{key:'progress:B1:qa-unit',at:at-1,data:{c:0,l:at-1}}]})).ok,true);
const own=await call(0,'load_state');assert.equal(own.records.find(r=>r.record_key==='progress:B1:qa-unit').payload.c,4);assert.equal(own.records.find(r=>r.record_key==='draft').payload.step,15);
assert.equal((await call(1,'load_state')).records.length,0);
assert.equal((await call(0,'load_state',{},randomBytes(32).toString('base64url'))).status,401);
const lesson={id:`qa-${randomUUID()}`,level:'B1',reward:2,answers:30,accuracy:97,seconds:900,steps:4};
assert.equal((await call(0,'publish_lesson',{lesson})).published,true);
assert.equal((await call(0,'publish_lesson',{lesson})).published,true);
const partner=await call(1,'sync',{profile:{displayName:'Anna',level:'A2',balance:10}});
assert.equal(partner.notifications.length,1);assert.equal(partner.notifications[0].payload.reward,2);assert.equal(partner.notifications[0].payload.answers,30);assert.ok(!('records' in partner));
const gift={id:`qa-gift-${randomUUID()}`,title:'QA gift',cost:5};assert.equal((await call(0,'create_request',{request:gift})).created,true);assert.equal((await call(1,'resolve_request',{id:gift.id,status:'approved'})).resolved,true);
console.log('Live QA passed: private backup, stale-write protection, identity isolation, paused lesson restore, automatic partner notification, deduplication and gifts.');
console.log('Disposable QA account IDs:',accounts.map(a=>a.id).join(', '));
