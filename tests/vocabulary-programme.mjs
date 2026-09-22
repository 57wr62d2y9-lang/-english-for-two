import assert from 'node:assert/strict';
import {VOCABULARY} from '../src/vocabulary.js';
import {LEXICON,lexiconForLevel,lexicalKey,progressFor,vocabularyStats,TOTAL_LEXICAL_UNITS} from '../src/lexicon.js';
import {makeSession,nextLessonTask,applySessionEvidence,extendVocabularySession,resumeVocabularySession} from '../src/lesson-engine.js';
import {reviewItem,chooseTask,newItemLimit,DAY,evaluateSessionReward,courseProgress} from '../src/learning.js';
import {packItems,unpackItems,progressChunks} from '../src/storage-v3.js';
import {buildWordCard} from '../src/word-lookup.js';
import {buildCheckpoint,buildFinalCheck} from '../src/checkpoint.js';

let count=0;
function test(name,fn){fn();count++;console.log('✓ '+name);}
const start=Date.parse('2026-09-22T06:00:00Z');
function study(level,progress,time,{minutes=15,pace='normal',answers=55,wrong=()=>false,extend=false}={}) {
  let session=makeSession(level,minutes,0,time,'quiet',pace),tasks=[];
  for(let index=0;index<answers;index++) {
    const now=time+index*15000;
    session=nextLessonTask(session,progress,now);
    if(session.exhausted && extend)session=nextLessonTask(extendVocabularySession(session),progress,now);
    if(session.exhausted)break;
    const task=session.task;tasks.push(task);
    if(task.type==='intro')progress[task.progressId]=reviewItem(progressFor(task.item,progress),'intro',now,session.id+':'+session.step).item;
    else {
      const correct=!wrong(task,index);
      const action=correct?(task.type==='recognition'?'recognition':task.type==='recall'?'recall':'context'):'wrong';
      progress[task.progressId]=reviewItem(progressFor(task.item,progress),action,now,session.id+':'+session.step).item;
      session.remainingMs=Math.max(0,session.remainingMs-15000);
      session=applySessionEvidence(session,task,correct);
    }
    session=JSON.parse(JSON.stringify(session)); // real pause/resume round trip
  }
  return {session,tasks,introductions:tasks.filter(t=>t.type==='intro').map(t=>t.item.id)};
}
test('400 original word cards have two distinct translated situations and usage notes',()=>{
  assert.equal(VOCABULARY.length,400);
  assert.equal(new Set(VOCABULARY.map(item=>item.id)).size,400);
  for(const level of ['A2','B1','B2','C1'])assert.equal(VOCABULARY.filter(item=>item.level===level).length,100);
  for(const item of VOCABULARY) {
    assert.ok(item.ru.length>=2 && item.explanation.length>9 && item.usageRu.length>15,item.id);
    assert.equal(new Set(item.examples).size,2,item.id);assert.equal(item.exampleRu.length,2,item.id);
    assert.ok(item.examples.every(text=>/[a-z]/i.test(text) && /[.!?]$/.test(text)),item.id);
    assert.ok(item.exampleRu.every(text=>/[а-яё]/i.test(text) && text.length>8),item.id);
    assert.match(item.id,/^word-(a2|b1|b2|c1)-[a-z-]+$/);
  }
});
test('catalogue counts headwords, not examples, task variants or duplicate legacy cards',()=>{
  assert.equal(TOTAL_LEXICAL_UNITS,1012);
  for(const level of ['A2','B1','B2','C1']) {
    const pool=lexiconForLevel(level);
    assert.equal(new Set(pool.map(item=>lexicalKey(item.phrase))).size,pool.length);
    assert.ok(pool.slice(0,8).some(item=>item.kind==='word'));
    assert.ok(pool.slice(0,8).some(item=>item.kind==='phrase'));
  }
});
test('duplicate legacy progress suppresses a false new introduction without changing history',()=>{
  const item=LEXICON.find(item=>item.aliases.length);
  const p={s:'LEARNING',c:3,l:start,n:start+7*DAY};
  const progress={[item.aliases[0]]:p};
  assert.equal(progressFor(item,progress),p);
  assert.equal(chooseTask([item],progress,{step:0,newCount:0,visits:{},recent:[]},start),null);
  assert.equal(vocabularyStats([item],progress,start).introduced,1);
  assert.deepEqual(progress,{[item.aliases[0]]:p});
});
test('a large due backlog cannot displace the twelve new units in either daily slot',()=>{
  for(const level of ['A2','B1','B2','C1'])for(const hour of [0,12]) {
    const time=start+hour*3600000,pool=lexiconForLevel(level);
    const progress=Object.fromEntries(pool.slice(0,80).map(item=>[item.id,{s:'LEARNING',c:2,w:1,rec:1,l:time-DAY,n:time-1000,f:time-3*DAY}]));
    const result=study(level,progress,time,{answers:45});
    assert.equal(result.introductions.length,12,level+' '+hour);
    assert.ok(result.tasks.some(task=>task.reason==='due'));
    assert.ok(result.tasks.filter(task=>task.type==='ielts').length/result.tasks.length<.15);
  }
});
test('seven mornings and evenings offer fresh words without early recycling',()=>{
  for(const level of ['A2','B1','B2','C1']) {
    const progress={},allNew=new Set();
    for(let day=0;day<7;day++)for(const hour of [0,12]) {
      const now=start+day*DAY+hour*3600000;
      const dueAt=Object.fromEntries(Object.entries(progress).map(([id,p])=>[id,p.n]));
      const result=study(level,progress,now,{answers:42});
      assert.equal(result.introductions.length,12,level+' day '+day+' hour '+hour);
      for(const id of result.introductions){assert.ok(!allNew.has(id),'reintroduced '+id);allNew.add(id);}
      for(const [index,task] of result.tasks.entries()) {
        assert.ok(!['video','listening','grammar'].includes(task.type));assert.ok(!task.lesson && !task.practice);
        assert.equal(task.item.level,level);
        if(!result.introductions.includes(task.item.id))assert.ok((dueAt[task.item.id]||0)<=now+index*15000,'early recycle '+task.item.id);
      }
    }
    assert.equal(allNew.size,168);assert.ok(vocabularyStats(lexiconForLevel(level),progress).introduced>=168);
  }
});
test('a correct recognition leaves the due queue but cannot claim active mastery',()=>{
  const p=reviewItem(reviewItem(undefined,'intro',start).item,'recognition',start+1000).item;
  assert.equal(p.n,start+1000+DAY);assert.equal(p.v,false);assert.equal(p.rcl,0);assert.equal(p.days.length,0);
});
test('five-minute lessons have enough intervening material for actual checked answers',()=>{
  for(const level of ['A2','B1','B2','C1']) {
    const {tasks,session,introductions}=study(level,{},start,{minutes:5});
    assert.equal(introductions.length,4);assert.ok(session.scoredAnswers>=6,level);
    assert.equal(tasks.filter(task=>task.type==='intro').length,4);
    assert.equal(evaluateSessionReward({...session,spentSeconds:240}).amount,1);
  }
});
test('pace is a limit; extra new cards require an explicit new batch',()=>{
  for(const pace of ['gentle','normal','more']) {
    const progress={},result=study('B1',progress,start,{pace,answers:100});
    assert.equal(result.introductions.length,newItemLimit({minutes:15,vocabPace:pace}));
    assert.equal(result.session.exhausted,true);
    const next=nextLessonTask(extendVocabularySession(result.session),progress,start+1800000);
    assert.equal(next.task.type,'intro');assert.ok(!result.introductions.includes(next.task.item.id));
  }
});
test('future reviews are not used as filler when all available material has been introduced',()=>{
  const items=lexiconForLevel('A2');
  const progress=Object.fromEntries(items.map(item=>[item.id,{s:'STABLE',c:4,n:start+30*DAY,l:start}]));
  const s=nextLessonTask(makeSession('A2'),progress,start);
  assert.equal(s.exhausted,true);assert.equal(s.moreAvailable,false);assert.equal(s.task,null);
});
test('mistakes retry after other tasks, without preventing new learning',()=>{
  const progress={};let failed;
  const result=study('B1',progress,start,{wrong:task=>{if(!failed && task.type==='recognition'){failed=task;return true;}return false;}});
  const first=result.tasks.indexOf(failed),retry=result.tasks.findIndex((task,index)=>index>first && task.progressId===failed.progressId && task.recovery);
  assert.ok(retry-first>=6);assert.ok(result.session.recovered>=1);
  assert.equal(result.introductions.length,12);assert.notEqual(result.tasks[retry].type,failed.type);
});
test('examples rotate according to encounters even with an unchanged lesson index',()=>{
  const item=lexiconForLevel('B1')[0],other=lexiconForLevel('B1').slice(1);
  const progress=Object.fromEntries(other.map(x=>[x.id,{s:'MASTERED',v:true,known:true,n:start+90*DAY}]));
  let previous;
  for(let count=1;count<=4;count++) {
    progress[item.id]={s:'LEARNING',c:count,l:start,n:start-1};
    const s=nextLessonTask({...makeSession('B1'),step:1,newCount:12},progress,start);
    assert.equal(s.task.item.id,item.id);
    if(previous!==undefined)assert.notEqual(s.task.exampleIndex,previous);
    previous=s.task.exampleIndex;
  }
});
test('word lookup knows all added headwords offline and offers relevant examples',()=>{
  for(const item of VOCABULARY) {
    const text=item.examples.find(text=>text.toLowerCase().includes(item.phrase)) || item.phrase;
    const card=buildWordCard({word:item.phrase,text,index:Math.max(0,text.toLowerCase().indexOf(item.phrase)),level:item.level});
    assert.ok(card.ru,item.id);assert.ok(card.note,item.id);
  }
});
test('expanded progress round trips in bounded Telegram buckets',()=>{
  const hash=id=>[...id].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0)%64;
  for(const level of ['A2','B1','B2','C1']) {
    const progress=Object.fromEntries(lexiconForLevel(level).map(item=>[item.id,{...reviewItem(undefined,'context',start,item.id).item,c:123,w:45,days:Array.from({length:8},(_,i)=>'2026-09-'+(10+i)),event:'lesson-00000000-0000-4000-8000-000000000000:123'}]));
    const packed=packItems(progress);const restored=unpackItems(JSON.parse(JSON.stringify(packed)));
    assert.equal(Object.keys(restored).length,Object.keys(progress).length);
    for(let n=0;n<64;n++)for(const chunk of progressChunks(Object.fromEntries(Object.entries(progress).filter(([id])=>hash(id)===n))))assert.ok(JSON.stringify(chunk).length<4096,level+' bucket '+n);
  }
});
test('vocabulary-only lessons earn the fixed completion reward without any media or grammar',()=>{
  const {session}=study('B1',{},start,{answers:48});
  assert.ok(session.scoredAnswers>=12);
  assert.equal(evaluateSessionReward({...session,spentSeconds:900}).amount,1);
});
test('checkpoint and final use lexical evidence only, with no recordings',()=>{
  const pool=lexiconForLevel('B1'),progress=Object.fromEntries(pool.map(item=>[item.id,{s:'MASTERED',v:true}]));
  const tasks=buildCheckpoint(pool,progress,1);
  assert.equal(tasks.length,10);assert.ok(tasks.every(t=>!t.lesson && ['meaning','recognition','recall'].includes(t.type)));
  const full=lexiconForLevel('A2'),all=Object.fromEntries(full.map(item=>[item.id,{s:'MASTERED',v:true}]));
  assert.equal(buildFinalCheck(full,all).length,20);
  assert.ok(courseProgress(full,all).percent<=100);
});
console.log(count+' vocabulary programme checks passed.');
