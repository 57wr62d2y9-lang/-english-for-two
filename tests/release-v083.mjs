import assert from 'node:assert/strict';
import {lexiconForLevel} from '../src/lexicon.js';
import {speedPool,createSpeedRound,answerSpeedRound,finishSpeedRound} from '../src/arcade.js';
import {FAST_ANSWER_MS,SPEED_REST_MS,mergeSpeedMemory} from '../src/speed-memory.js';
import {backupRecords,mergeBackup} from '../src/private-backup.js';
const now=Date.parse('2026-10-13T09:00:00Z');
for(const level of ['A2','B1','B2','C1']) {
  const r=createSpeedRound('arena',level,{},now),ids=new Set(lexiconForLevel(level).map(i=>i.id));
  assert.ok(r.questions.length>150);assert.ok(r.questions.every(q=>ids.has(q.item.id)));
  assert.ok(r.questions.some(q=>q.item.kind==='word'));assert.ok(r.questions.some(q=>q.item.kind!=='word'));
  for(const [i,q] of r.questions.entries()) {
    assert.equal(new Set(q.options).size,4);assert.ok(q.options.includes(q.answer));
    assert.equal(q.prompt,q.direction==='en-ru'?q.item.phrase:q.item.ru);
    assert.equal(q.answer,q.direction==='en-ru'?q.item.ru:q.item.phrase);
    const field=q.direction==='ru-en'?'phrase':'ru';
    assert.ok(q.options.every(value=>r.questions.some(other=>other.item.kind===q.item.kind&&other.item[field]===value)),'distractors match word/phrase kind');
    if(i)assert.notEqual(q.direction,r.questions[i-1].direction);
  }
  assert.notDeepEqual(createSpeedRound('arena',level,{},now).questions,r.questions);
}
let r=createSpeedRound('review','B1',{},now);
const fast=r.questions[0].item,slow=r.questions[1].item,wrong=r.questions[2].item;
r=answerSpeedRound(r,r.questions[0].answer,now+FAST_ANSWER_MS);
r=answerSpeedRound(r,r.questions[1].answer,now+7000);
r=answerSpeedRound(r,r.questions[2].options.find(x=>x!==r.questions[2].answer),now+8000);
const done=finishSpeedRound(r,{byDay:{},lessons:{}},now+60000),memory=done.stats.speedMemory;
assert.equal(memory['B1:'+fast.id].ms,3000);assert.equal(memory['B1:'+slow.id].ms,3550);
assert.equal(r.answers[1].ru,slow.ru,'reverse questions retain the real Russian translation');
for(const mode of ['arena','review']) {
  const next=createSpeedRound(mode,'B1',{},now+61000,memory);
  assert.ok(!next.questions.some(q=>q.item.id===fast.id));
  assert.ok(!next.questions.some(q=>q.options.includes(fast.phrase)||q.options.includes(fast.ru)));
  assert.ok(next.questions.some(q=>q.item.id===slow.id));assert.equal(next.questions[0].item.id,wrong.id);
}
assert.ok(speedPool('arena','B1',{},memory,now+3000+SPEED_REST_MS).some(i=>i.id===fast.id));
const reset=mergeSpeedMemory(memory,{['B1:'+fast.id]:{at:now+62000,correct:false,ms:1000}});
assert.ok(speedPool('arena','B1',{},reset,now+63000).some(i=>i.id===fast.id));
assert.equal(mergeSpeedMemory(reset,memory)['B1:'+fast.id].correct,false);
assert.equal(mergeSpeedMemory(memory,{['B1:'+fast.id]:{at:now+3000,correct:false,ms:1000}})['B1:'+fast.id].correct,false);
const aborted=finishSpeedRound(r,{byDay:{},lessons:{}},now+8000,{aborted:true});
assert.deepEqual(aborted.stats.byDay,{});assert.equal(Object.keys(aborted.stats.speedMemory).length,3);
const state={level:'B1',progress:{},stats:done.stats,wallet:{earned:{},spent:{},goals:{}}};
const restored=mergeBackup({...state,stats:{byDay:{},lessons:{}}},backupRecords(state));
assert.deepEqual(restored.stats.speedMemory,memory);assert.deepEqual(state.progress,{});
const all=Object.fromEntries(lexiconForLevel('B1').map(i=>['B1:'+i.id,{at:now,correct:true,ms:1000}]));
assert.equal(createSpeedRound('arena','B1',{},now+1000,all),null);
const aliases=lexiconForLevel('A2').filter(i=>['a2_149','lex-a2-can-i-get-this-to-go-'].includes(i.id));
assert.equal(aliases.length,2);
const restedAlias={['A2:'+aliases[0].id]:{at:now,correct:true,ms:1000}};
assert.ok(speedPool('arena','A2',{},restedAlias,now+1000).every(i=>!aliases.some(a=>a.id===i.id)),'equivalent US/UK duplicate must not return under another card ID');
console.log('✓ all personal levels, phrases and words, alternating directions, fresh queues, 3s/14day exclusion including distractors, error priority, abort/backup preservation, no SRS changes');
