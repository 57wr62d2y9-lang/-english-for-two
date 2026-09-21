import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {makeSession,nextLessonTask,applySessionEvidence,replaceSpeakingWithVideo} from '../src/lesson-engine.js';
import {normaliseSpeakingMode,mediaBlockHasNext,skipUnheardMedia,quietMediaCandidates,resumeSpeakingMode} from '../src/quiet-speaking.js';
import {DAILY_IELTS} from '../src/daily-ielts.js';
import {VLOG_LESSONS} from '../src/vlog-lessons.js';
import {MEDIA_LESSONS} from '../src/media-lessons.js';
import {evaluateSessionReward,reviewItem} from '../src/learning.js';
import {backupRecords,mergeBackup} from '../src/private-backup.js';

let count=0;
const test=async(name,fn)=>{await fn();count++;console.log(`✓ ${name}`);};
const time=Date.parse('2026-09-21T06:00:00Z');
const mediaStart=(level,mode='quiet')=>nextLessonTask({...makeSession(level,15,0,time,mode),cycleStep:5},{},time);

await test('quiet is the default; an explicit aloud preference remains available',()=>{
  assert.equal(makeSession('B1').speakingMode,'quiet');
  assert.equal(normaliseSpeakingMode(undefined),'quiet');
  assert.equal(normaliseSpeakingMode('invalid'),'quiet');
  assert.equal(makeSession('B1',15,0,time,'aloud').speakingMode,'aloud');
  assert.equal(resumeSpeakingMode({id:'legacy'},{speakingMode:'aloud'}).speakingMode,'aloud');
  assert.equal(resumeSpeakingMode({id:'new',speakingMode:'quiet'},{speakingMode:'aloud'}).speakingMode,'quiet');
});
await test('all levels receive a complete three-question quiet block followed by unscored rehearsal',()=>{
  for(const level of ['A2','B1','B2','C1']){
    let session=mediaStart(level);const progress={};
    assert.equal(session.task.lesson.level,level);
    for(let i=0;i<3;i++){
      assert.equal(session.task.questionIndex,i);assert.equal(session.task.quiet,true);
      session=applySessionEvidence(session,session.task,true);
      session.remainingMs=0; // Expiry must not discard remaining questions or rehearsal.
      assert.equal(mediaBlockHasNext(session.mediaBlock),true);
      session=nextLessonTask(JSON.parse(JSON.stringify(session)),progress,time+1000+i);
    }
    assert.equal(session.task.quietRehearsal,true);assert.equal(session.task.practice,true);
    assert.equal(session.task.skill,'Speaking');assert.equal(session.answers,3);
    session=applySessionEvidence(session,session.task,false);
    assert.equal(session.answers,3);assert.equal(session.correct,3);
    assert.equal(mediaBlockHasNext(session.mediaBlock),false);
  }
});
await test('aloud mode keeps its normal media block and Speaking task',()=>{
  let session=mediaStart('B1','aloud');
  for(let i=0;i<3;i++){session=applySessionEvidence(session,session.task,true);if(i<2)session=nextLessonTask(session,{});}
  assert.equal(mediaBlockHasNext(session.mediaBlock),false);
  session=nextLessonTask({...makeSession('B1',15,0,time,'aloud'),cycleStep:15},{},time);
  assert.equal(session.task.practice,true);assert.equal(session.task.skill,'Speaking');assert.ok(!session.mediaBlock);
});
await test('fresh quiet lessons prioritise the level-specific vlogs, not unrelated long videos',()=>{
  for(const level of ['B1','B2','C1']){
    const task=mediaStart(level).task;
    assert.equal(task.lesson.format,'vlog');assert.equal(task.lesson.level,level);
    assert.equal(new URL(task.lesson.url).searchParams.get('v'),task.lesson.youtubeId);
  }
  assert.equal(mediaStart('A2').task.lesson.sourceLevel,'A2');
  assert.ok(VLOG_LESSONS.every(lesson=>lesson.questions.length===3&&lesson.transcriptUrl&&lesson.verifiedAt));
});
await test('replacing a saved legacy Speaking task with video preserves lesson time and earned evidence',()=>{
  const item=DAILY_IELTS.find(task=>task.level==='B1'&&task.skill==='Speaking');
  const old={...makeSession('B1'),task:{...item,item,type:'ielts',key:item.id},answers:8,correct:5,remainingMs:240000,step:17};delete old.speakingMode;
  const changed=replaceSpeakingWithVideo(old,{});
  assert.equal(changed.id,old.id);assert.equal(changed.answers,8);assert.equal(changed.correct,5);
  assert.equal(changed.remainingMs,240000);assert.equal(changed.step,17);assert.equal(changed.task.questionIndex,0);
});
await test('no-headphones fallback never awards listening credit or creates errors for unheard audio',()=>{
  const base=mediaStart('A2');
  const fallback=skipUnheardMedia(base);
  assert.equal(fallback.mediaBlock,null);assert.equal(fallback.task.listeningUnavailable,true);assert.equal(fallback.task.practice,true);
  assert.equal(fallback.remainingMs,base.remainingMs);assert.equal(fallback.task.skill,'Speaking');
  const completed=applySessionEvidence(fallback,fallback.task,false);
  assert.equal(completed.answers,0);assert.equal(completed.correct,0);assert.deepEqual(completed.recoveryQueue,[]);
});
await test('silent practice does not inflate accuracy; checked video answers earn ordinary rewards',()=>{
  let session=mediaStart('B1');
  for(let i=0;i<3;i++){session=applySessionEvidence(session,session.task,i!==1);session=nextLessonTask(session,{});}
  session.remainingMs=600000;
  session=applySessionEvidence(session,session.task,true);
  assert.equal(session.answers,3);assert.equal(session.correct,2);
  assert.equal(evaluateSessionReward({...session,spentSeconds:300}).amount,1);
});
await test('a failed vlog question is queued and later repeats as a complete recording block',()=>{
  let session=mediaStart('B1');const progress={};const failedId=session.task.progressId;
  progress[failedId]=reviewItem(undefined,'wrong',time).item;
  session=applySessionEvidence(session,session.task,false);
  let repeated=false;
  for(let i=0;i<50;i++){
    session=nextLessonTask(session,progress,time+i*10000);
    if(session.task.recovery&&session.task.progressId===failedId){assert.equal(session.task.questionIndex,0);repeated=true;break;}
    if(session.task.type!=='intro')session=applySessionEvidence(session,session.task,true);
  }
  assert.ok(repeated);
});
await test('rehearsal notes and personal mode survive a full backup round-trip',()=>{
  const session={...mediaStart('B1'),speakingDraft:{key:'test',notes:'A bus is useful because…',remaining:23}};
  const settings={level:'B1',speakingMode:'aloud',updatedAt:123};
  const state={level:'B1',settings,progress:{},stats:{byDay:{},lessons:{},legacy:{}},wallet:{},draft:{at:124,data:session}};
  const restored=mergeBackup({...state,settings:{},draft:null},backupRecords(state));
  assert.equal(restored.settings.speakingMode,'aloud');assert.equal(restored.draft.data.speakingDraft.notes,session.speakingDraft.notes);
  assert.equal(restored.draft.data.mediaBlock.index,0);
});
await test('manual video replacement cannot recycle the same sources endlessly',()=>{
  const session=makeSession('B1');
  for(const lesson of quietMediaCandidates('B1'))session.visits[lesson.id]=1;
  assert.equal(replaceSpeakingWithVideo(session,{}),null);
  const ids=MEDIA_LESSONS.map(lesson=>lesson.id);assert.equal(new Set(ids).size,ids.length);
});
await test('no mandatory microphone or automatic playback; confirmation is not gated by a timer',async()=>{
  const ui=await readFile(new URL('../src/SpeakingPractice.jsx',import.meta.url),'utf8');
  assert.doesNotMatch(ui,/getUserMedia|MediaRecorder|autoplay=1|disabled=\{completed\|\|remaining>0\}/);
  assert.match(ui,/Сформулировал ответ про себя/);assert.match(ui,/Нет наушников или видео не открывается/);
});
console.log(`${count} quiet-mode checks passed.`);
