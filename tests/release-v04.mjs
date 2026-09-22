import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PHRASES, COLLOCATIONS } from '../src/catalog.js';
import { DAILY_GRAMMAR, GUIDES } from '../src/lesson-notes.js';
import { DAILY_IELTS } from '../src/daily-ielts.js';
import { MEDIA_LESSONS } from '../src/media-lessons.js';
import { grammarDetail, translationTarget, CONDITIONAL_TYPES, ruleResource } from '../src/task-support.js';
import { evaluateSessionReward, lessonRecord, reviewItem, DAY } from '../src/learning.js';
import { makeSession, nextLessonTask, applySessionEvidence, extendVocabularySession } from '../src/lesson-engine.js';
import { backupRecords, mergeBackup } from '../src/private-backup.js';
import { translationChunks, translateToRussian } from '../src/translation.js';

let count=0;
const test=async(name,fn)=>{await fn();count++;console.log(`✓ ${name}`);};
const full={plannedMs:900000,spentSeconds:900,answers:10,correct:0,taskCounts:{grammar:5,ielts:5}};
await test('completion earns $1 even when every checked answer was wrong',()=>{
  assert.equal(evaluateSessionReward(full).amount,1);
  assert.equal(evaluateSessionReward({...full,spentSeconds:300,answers:3}).amount,0);
  assert.equal(evaluateSessionReward({...full,spentSeconds:299,answers:3}).amount,0);
  assert.equal(evaluateSessionReward({...full,answers:2}).amount,0);
  assert.equal(evaluateSessionReward({...full,answers:0}).amount,0);
});
await test('ordinary, improving and excellent completed lessons all earn $1',()=>{
  assert.equal(evaluateSessionReward({...full,answers:8,correct:4}).amount,1);
  assert.equal(evaluateSessionReward({...full,answers:8,correct:3,recovered:2}).amount,1);
  const good={...full,answers:12,correct:9,taskCounts:{grammar:4,context:4,ielts:4},correctTaskKeys:Array.from({length:9},(_,i)=>`unique-${i}`),unaidedCorrect:0,fastCorrect:0};
  assert.equal(evaluateSessionReward(good).amount,1);
  assert.equal(evaluateSessionReward({...good,correctTaskKeys:['same']}).amount,1);
  assert.equal(evaluateSessionReward({...good,plannedMs:300000,spentSeconds:300}).amount,1);
});
await test('slow reading and mistakes still count as a completed lesson',()=>{
  assert.equal(lessonRecord({...full,id:'full',answers:5},'B1').climb,1);
  assert.equal(lessonRecord({...full,id:'early',answers:3,spentSeconds:300},'B1').completed,false);
  assert.equal(lessonRecord({...full,id:'short',plannedMs:300000,spentSeconds:240,answers:3},'A2').climb,1/3);
});
await test('every grammar sentence has its own Russian translation and reasoning',()=>{
  for(const item of DAILY_GRAMMAR){const help=grammarDetail(item);assert.ok(help.translation.length>10,item.id);assert.ok(help.why.length>70,item.id);assert.ok(help.sentence.includes(item.answer),item.id);}
  const second=grammarDetail(DAILY_GRAMMAR.find(t=>t.id==='daily-B1-conditional-1'));
  assert.match(second.why,/Lived здесь не означает/);assert.match(second.why,/live → lived, will → would/);assert.match(second.translation,/Если бы я жил ближе/);
});
await test('all five conditionals and both mixed-time directions are explained',()=>{
  assert.deepEqual(CONDITIONAL_TYPES.map(t=>t.id),['zero','first','second','third','mixed']);
  assert.ok(CONDITIONAL_TYPES.every(t=>t.formula&&t.ru&&t.en&&t.translation));
  assert.match(CONDITIONAL_TYPES[4].ru,/наоборот/);
  assert.equal(ruleResource(GUIDES.conditional).url,'https://englex.ru/conditional-sentences/');
  assert.equal(ruleResource(GUIDES.phrase),null);
});
await test('Reading translates the whole passage, never its question title',()=>{
  for(const task of DAILY_IELTS.filter(t=>t.skill==='Reading')){
    const target=translationTarget({...task,type:'ielts'});assert.equal(target.text,task.passage);assert.notEqual(target.text,task.prompt);assert.ok(target.ru.length>60,task.id);assert.match(target.label,/всего текста/);
  }
  const task=DAILY_IELTS.find(t=>t.id==='ielts-B1-flexible-work-0');
  assert.match(translationTarget(task).ru,/после пробного периода/);
});
await test('translation follows the visible sentence or phrase, not a hidden example',()=>{
  const target=translationTarget({type:'context',prompt:'_____.',example:{en:'That works for me.',ru:'Меня это устраивает.'}});
  assert.equal(target.text,'That works for me.');assert.equal(target.ru,'Меня это устраивает.');
  assert.equal(translationTarget({type:'context',prompt:'handle a problem',example:{en:'We dealt with it yesterday.'}}).text,'handle a problem');
  assert.equal(translationTarget({type:'recognition',prompt:'It depends.',item:{ru:'Зависит от обстоятельств.'},example:{en:'The price depends on the size.'}}).text,'It depends.');
  const grammar=DAILY_GRAMMAR.find(t=>t.id==='daily-B1-conditional-1');
  assert.equal(translationTarget({type:'grammar',item:grammar}).text,'If I lived closer, I would walk to work.');
});

function runWithMistake(family) {
  const time=Date.parse('2026-09-21T06:00:00Z');let session=makeSession('B1',15,0,time),progress={},failed=null,repeated=null,after=[];
  for(let i=0;i<65;i++) {
    session=nextLessonTask(session,progress,time+i*3000);if(session.exhausted)session=nextLessonTask(extendVocabularySession(session),progress,time+i*3000);assert.ok(!session.exhausted);
    const task=session.task;
    if(failed)after.push(task);
    if(task.type==='intro'){progress[task.progressId]=reviewItem(progress[task.progressId],'intro',time+i*3000).item;continue;}
    let correct=true;
    const fits=family==='Reading' ? task.skill==='Reading' : family==='collocation' ? task.category==='collocation' : task.type===family;
    if(!failed && fits){correct=false;failed={id:task.progressId,step:session.step,task};}
    if(failed && task.progressId===failed.id && task.recovery){repeated={task,step:session.step};}
    session.remainingMs-=3000;
    progress[task.progressId]=reviewItem(progress[task.progressId],task.practice?'intro':correct?'context':'wrong',time+i*3000).item;
    session=applySessionEvidence(session,task,correct);
    if(repeated)break;
  }
  return {session,failed,repeated,progress,after};
}
await test('vocabulary and Reading errors return after intervening tasks',()=>{
  for(const family of ['recognition','context','Reading']) {
    const {session,failed,repeated}=runWithMistake(family);
    assert.ok(failed,family);assert.ok(repeated,`${family} never returned`);
    assert.ok(repeated.step>=failed.step+6,family);assert.equal(repeated.task.progressId,failed.id);
    assert.ok(!session.recoveryQueue.some(entry=>entry.id===failed.id));assert.ok(session.recovered>=1);
  }
});
await test('old media and grammar progress remains stored but is never scheduled',()=>{
  const now=Date.parse('2026-09-22T06:00:00Z');
  const progress={'daily-B1-conditional-1':reviewItem(undefined,'wrong',now-DAY-1).item,'media-B1:q0':reviewItem(undefined,'wrong',now-DAY-1).item};
  const copy=JSON.stringify(progress);
  const next=nextLessonTask({...makeSession('B1',15,1,now),cycleStep:5},progress,now);
  assert.equal(next.task.type,'intro');assert.equal(JSON.stringify(progress),copy);
});
await test('recovery state survives a save and each error gets at most two retries',()=>{
  const now=Date.now(),item=DAILY_GRAMMAR.find(t=>t.id==='daily-B1-conditional-1');
  const task={type:'grammar',category:'grammar',item,progressId:item.id,key:item.id,recovery:true};
  let s={...makeSession('B1'),step:6,taskStartedRemaining:900000,remainingMs:890000};
  for(let i=0;i<3;i++)s=applySessionEvidence(s,task,false);
  s=JSON.parse(JSON.stringify(s));assert.equal(s.recoveryQueue[0].attempts,3);
  const next=nextLessonTask({...s,step:30,visits:{[item.id]:3},recent:[]},{},now);
  assert.notEqual(next.task.progressId,item.id);
});
await test('settings are backed up independently, and stale settings cannot roll back newer ones',()=>{
  const state={level:'B1',settings:{level:'B1',minutes:15,updatedAt:400},progress:{},stats:{},wallet:{},draft:null};
  const records=backupRecords(state);assert.ok(records.some(r=>r.key==='settings'&&r.at===400));
  assert.equal(mergeBackup(state,[{key:'settings',at:300,data:{minutes:5}}]).settings.minutes,15);
  assert.equal(mergeBackup(state,[{key:'settings',at:500,data:{level:'A2',minutes:5}}]).settings.minutes,5);
});
await test('every stable authored task ID is accepted by the backup endpoint, including café',async()=>{
  const source=await readFile(new URL('../supabase/functions/english-for-two-sync/index.ts',import.meta.url),'utf8');
  const expression=source.match(/if\(!\/(\^\(progress:.*?)\/u\.test\(key\)/)[1];const pattern=new RegExp(expression,'u');
  for(const task of [...PHRASES,...COLLOCATIONS,...DAILY_GRAMMAR,...DAILY_IELTS])assert.ok(pattern.test(`progress:${task.level}:${task.id}`),task.id);
  for(const lesson of MEDIA_LESSONS)lesson.questions.forEach((_,i)=>assert.ok(pattern.test(`progress:${lesson.level}:${lesson.id}:q${i}`)));
  assert.ok(pattern.test('settings'));assert.ok(!pattern.test('progress:B1:../../secret'));
});
await test('long translation keeps the whole input and service errors are not cached as translations',async()=>{
  const text=Array.from({length:100},(_,i)=>`Sentence ${i} ends here.`).join(' ');
  const chunks=translationChunks(text);assert.equal(chunks.join(' '),text);assert.ok(chunks.every(c=>new TextEncoder().encode(c).length<=450));
  const oldFetch=globalThis.fetch;
  try {
    globalThis.fetch=async()=>({ok:true,json:async()=>({responseStatus:429,responseData:{translatedText:'MYMEMORY WARNING: LIMIT'}})});
    await assert.rejects(()=>translateToRussian('A unique unavailable test.'));
    globalThis.fetch=async()=>({ok:true,json:async()=>({responseStatus:200,responseData:{translatedText:'Уникальный пример.'}})});
    assert.equal(await translateToRussian('A unique unavailable test.'),'Уникальный пример.');
  } finally {globalThis.fetch=oldFetch;}
});
console.log(`${count} release 0.4 regression checks passed.`);
