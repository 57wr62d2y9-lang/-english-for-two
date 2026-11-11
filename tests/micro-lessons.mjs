import assert from 'node:assert/strict';
import {makeMicro,microEvidence,settleMicro,situations} from '../src/micro-lessons.js';
import {lexiconForLevel} from '../src/lexicon.js';
import {backupRecords,mergeBackup} from '../src/private-backup.js';
const now=Date.parse('2026-11-11T08:00:00Z'),stats={lessons:{},byDay:{}};
for(const level of ['A2','B1','B2','C1']){
 const pool=lexiconForLevel(level);
 for(const scene of situations)assert.equal(scene.ids[level].filter(id=>pool.some(i=>i.id===id)).length,2);
 const brief=makeMicro(level,{},stats,1,now);assert.equal(brief.stages.length,3);assert.equal(brief.stages.filter(s=>s.type==='learn').length,1);
 const full=makeMicro(level,{},stats,5,now);assert.equal(full.stages.filter(s=>s.type==='learn').length,2);assert.equal(full.stages.at(-1).type,'reply');
 const starters=Object.fromEntries(situations.flatMap(scene=>scene.ids[level]).map(id=>[id,{s:'LEARNING',c:2,l:now-100000,n:now+100000}]));
 const expanded=makeMicro(level,starters,stats,5,now);assert.ok(expanded.stages.some(s=>s.type==='learn'&&!starters[s.item.id]),'new vocabulary continues beyond the scenario starters');
 const recall=brief.stages.findIndex(s=>s.type==='recall'),atRecall={...brief,index:recall};
 assert.equal(microEvidence(atRecall,'  '),atRecall);
 const submitted=microEvidence(atRecall,atRecall.stages[recall].item.phrase,now+1000);assert.equal(submitted.feedback.correct,true);assert.equal(microEvidence(submitted,'again'),submitted);
 const done=settleMicro(submitted,stats,now+2000);assert.equal(done.lessons[brief.id].completed,true);assert.equal(settleMicro(submitted,done),done);assert.equal(done.lessons[brief.id].reward,0);
 const partial=settleMicro(full,stats,now+1000);assert.equal(partial.lessons[full.id].completed,false);
 const next=makeMicro(level,{},done,5,now+10000);assert.notEqual(next.sceneId,brief.sceneId);
 const returning=makeMicro(level,{}, {lessons:{},byDay:{'2026-10-01':{answers:4}}},5,now);assert.equal(returning.returning,true);assert.equal(returning.stages.filter(s=>s.type==='learn').length,1);
 const wallet={earned:{old:{amount:30,at:1}},spent:{},goals:{}};
 const bundle={level,progress:{},stats:done,wallet,draft:{at:now,data:submitted},settings:{level}};
 const restored=mergeBackup({...bundle,stats,draft:null},backupRecords(bundle));assert.equal(restored.draft.data.index,recall);assert.equal(restored.wallet.earned.old.amount,30);assert.deepEqual(restored.stats.lessons[brief.id].items,submitted.answers);
}
console.log('✓ four levels, authored IDs, bounded 1/5min plans, lighter return, exact/variant checker, duplicate guards, rotation, draft/private backup and preserved money');
