import assert from 'node:assert/strict';
import { PHRASES } from '../src/catalog.js';
import { DAILY_GRAMMAR, examplesFor, guideFor } from '../src/lesson-notes.js';
import { DAILY_IELTS } from '../src/daily-ielts.js';
import { MEDIA_LESSONS } from '../src/media-lessons.js';
import { makeSession, nextLessonTask, applySessionEvidence, isAnswerCorrect, extendVocabularySession } from '../src/lesson-engine.js';
import { ascentProgress, lessonRecord, reviewItem, evaluateSessionReward, awardRoutine, DAY } from '../src/learning.js';
import { mergeBackup, backupRecords } from '../src/private-backup.js';
import { mergeItems } from '../src/storage-v3.js';

let count=0;
const test=(name,fn)=>{fn();count++;console.log(`✓ ${name}`);};
function simulate(level,n=65) {
  const time=Date.parse('2026-09-21T06:00:00Z');let session=makeSession(level,15,0,time),progress={},tasks=[];
  for(let i=0;i<n;i++){
    session=nextLessonTask(session,progress,time+i*10000);if(session.exhausted)session=nextLessonTask(extendVocabularySession(session),progress,time+i*10000);assert.ok(!session.exhausted,`${level} exhausted at ${i}`);
    const task=session.task;tasks.push(task);
    if(task.type==='intro')progress[task.item.id]=reviewItem(progress[task.item.id],'intro',time+i*10000,`${i}`).item;
    else { session.remainingMs-=10000;progress[task.progressId]=reviewItem(progress[task.progressId],task.practice?'intro':'context',time+i*10000,`${i}`).item;session=applySessionEvidence(session,task,true); }
    if(session.mediaBlock)session.mediaBlock.ready=true;
  }
  return {session,progress,tasks};
}
test('every level is vocabulary-first with occasional reading and no media',()=>{
  const all={};
  for(const level of ['A2','B1','B2','C1']){
    const {tasks}=simulate(level);all[level]=tasks;
    assert.ok(tasks.every(task=>task.item.level===level));
    assert.ok(tasks.some(task=>task.type==='ielts'&&task.skill==='Reading'));
    assert.ok(tasks.every(task=>!['video','listening','grammar'].includes(task.type) && !task.practice));
    assert.ok(tasks.filter(task=>task.type==='ielts').length/tasks.length<.15);
    assert.ok(new Set(tasks.filter(t=>PHRASES.some(p=>p.id===t.item.id)).map(t=>t.item.id)).size>=8,`${level}: too few phrases`);
    const recordings=[...new Set(tasks.filter(t=>t.lesson).map(t=>t.lesson.id))];
    for(const id of recordings){const block=tasks.filter(t=>t.lesson?.id===id);assert.deepEqual(block.map(t=>t.questionIndex),[0,1,2]);}
  }
  const a2=new Set(all.A2.map(t=>t.item.id));assert.ok(all.B1.every(t=>!a2.has(t.item.id)));
});
test('a long lesson does not recycle identical scored prompts',()=>{
  for(const level of ['A2','B1','B2','C1']){
    const {tasks}=simulate(level);const keys=tasks.filter(t=>t.type!=='intro'&&!t.practice).map(t=>t.key);
    assert.equal(new Set(keys).size,keys.length,`${level} repeated task`);
  }
});
test('all new tasks include correct choices and authored bilingual explanations',()=>{
  assert.equal(DAILY_GRAMMAR.length,56);
  for(const task of [...DAILY_GRAMMAR,...DAILY_IELTS]){
    if(!task.practice){assert.ok(task.options.includes(task.answer),task.id);assert.equal(new Set(task.options).size,task.options.length,task.id);assert.ok(task.explanation&&task.ru,task.id);}
  }
  assert.ok(MEDIA_LESSONS.every(lesson=>lesson.questions.length>=3));
  assert.equal(MEDIA_LESSONS.filter(l=>l.kind==='video'&&l.format!=='vlog').length,8);
  assert.equal(MEDIA_LESSONS.filter(l=>l.format==='vlog').length,3);
});
test('depend has twelve distinct contexts with Russian support and its own construction',()=>{
  const item=PHRASES.find(p=>p.phrase==='It depends.');const examples=examplesFor(item);
  assert.equal(examples.length,12);assert.ok(examples.every(example=>example.en&&example.ru));assert.equal(new Set(examples.map(e=>e.en)).size,12);assert.ok(guideFor(item).formula.includes('depend on'));
});
test('typed answers accept punctuation and normal contractions, but reject wrong meaning',()=>{
  assert.equal(isAnswerCorrect({answer:'It depends.'},' it depends '),true);
  assert.equal(isAnswerCorrect({answer:'I am on my way.'},'I’m on my way'),true);
  assert.equal(isAnswerCorrect({answer:'It depends.'},'it is depend'),false);
});
test('next-day lessons retain ascent and existing earnings without changing SRS dates',()=>{
  const start=Date.parse('2026-09-21T06:00:00Z');const session={...makeSession('B1',15,0,start),spentSeconds:900,answers:30,correct:28,scoredAnswers:30,scoredCorrect:28};
  const record=lessonRecord(session,'B1',start);const stats={lessons:{[record.id]:record},byDay:{},legacy:{}};
  assert.equal(ascentProgress(stats,'B1').steps,1);
  const next=makeSession('B1',15,1,start+DAY);assert.notEqual(next.id,session.id);assert.equal(ascentProgress(stats,'B1').steps,1);
  const wallet={earned:{old:{amount:3,at:start-1}},spent:{},goals:{}};
  const awarded=awardRoutine(wallet,session,start);assert.equal(awarded.wallet.earned.old.amount,3);assert.equal(awardRoutine(awarded.wallet,session,start).awarded,0);
});
test('private backup restores progress, lesson history, wallet and a paused exercise without rollback',()=>{
  const old={s:'LEARNING',c:1,w:0,l:100,xp:8,n:1000};const newer={...old,c:3,l:300,xp:12};
  const state={level:'B1',progress:{p26:newer},stats:{byDay:{},lessons:{},legacy:{}},wallet:{earned:{local:{amount:2,at:300}},spent:{},goals:{}},draft:{at:300,data:{id:'active'}}};
  const restored=mergeBackup(state,[{key:'progress:B1:p26',at:100,data:old},{key:'progress:B1:p27',at:200,data:old},{key:'lesson:lesson-one',at:200,data:{id:'lesson-one',level:'B1',completed:true,climb:1,at:200}},{key:'wallet:earned:remote',at:200,data:{amount:3,at:200}},{key:'draft',at:100,data:null}]);
  assert.equal(restored.progress.p26.c,3);assert.ok(restored.progress.p27);assert.equal(restored.wallet.earned.remote.amount,3);assert.equal(restored.wallet.earned.local.amount,2);assert.equal(restored.draft.data.id,'active');assert.equal(ascentProgress(restored.stats,'B1').steps,1);
  const roundTrip=mergeBackup({...state,progress:{},stats:{byDay:{},lessons:{},legacy:{}},wallet:{},draft:null},backupRecords(restored));assert.equal(roundTrip.progress.p26.c,3);assert.equal(roundTrip.draft.data.id,'active');
});
test('equal-time updates retain the larger answer history',()=>{const merged=mergeItems({one:{l:10,c:1,w:0}},{one:{l:10,c:2,w:1}});assert.equal(merged.one.c,2);assert.equal(merged.one.w,1);});
test('introductions are not auto-scored; hints support learning without cancelling rewards',()=>{
  const {session}=simulate('B1');assert.ok(session.scoredAnswers<65);
  const assisted={plannedMs:900000,spentSeconds:900,answers:50,correct:50,taskCounts:{recall:10,context:10,grammar:10,ielts:10,listening:5,order:5},successByType:{recall:10,context:10,grammar:10,ielts:10,listening:5,order:5},correctTaskKeys:Array.from({length:50},(_,i)=>String(i)),unaidedCorrect:0,fastCorrect:0};
  assert.equal(evaluateSessionReward(assisted).amount,1);assert.equal(evaluateSessionReward({...assisted,correct:20}).amount,1);
});
console.log(`${count} lesson regression checks passed.`);
