import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeSession,resumeVocabularySession,nextLessonTask} from '../src/lesson-engine.js';
import {normaliseSpeakingMode} from '../src/quiet-speaking.js';
import {mergeBackup,backupRecords} from '../src/private-backup.js';

assert.equal(makeSession('B1').speakingMode,'quiet');
assert.equal(normaliseSpeakingMode('invalid'),'quiet');
assert.equal(makeSession('B1',15,0,Date.now(),'aloud').speakingMode,'aloud');
for(const type of ['video','listening','grammar','ielts']) {
  const old={...makeSession('B1'),programmeVersion:undefined,id:'legacy-'+type,answers:8,correct:5,scoredAnswers:8,scoredCorrect:5,remainingMs:240000,step:17,
    task:{type,practice:type==='ielts'},mediaBlock:{lesson:{id:'old-video'},index:1},recoveryQueue:[{id:'old-video:q0',dueStep:0,attempts:1}]};
  const changed=resumeVocabularySession(old,{}, {speakingMode:'quiet'});
  assert.equal(changed.id,old.id);assert.equal(changed.answers,8);assert.equal(changed.correct,5);assert.equal(changed.remainingMs,240000);
  assert.equal(changed.mediaBlock,null);assert.equal(changed.programmeVersion,'vocabulary-1');
  assert.ok(!['video','listening','grammar'].includes(changed.task.type));
  assert.deepEqual(changed.recoveryQueue,[]);assert.equal(old.mediaBlock.index,1);
}
const session=nextLessonTask(makeSession('A2'),{});
const state={level:'A2',settings:{level:'A2',vocabPace:'more',speakingMode:'quiet',updatedAt:1000},progress:{},stats:{},wallet:{earned:{old:{amount:3,at:800}}},draft:{at:1000,data:session}};
const restored=mergeBackup({level:'A2',settings:{},progress:{},stats:{},wallet:{},draft:null},backupRecords(state));
assert.equal(restored.draft.data.task.key,session.task.key);
assert.equal(restored.settings.vocabPace,'more');assert.equal(restored.wallet.earned.old.amount,3);
assert.deepEqual(resumeVocabularySession(session,{},{}).task,session.task);
for(const file of ['src/AppV5.jsx','src/SpeakingPractice.jsx','src/lesson-engine.js']) {
  const text=readFileSync(new URL('../'+file,import.meta.url),'utf8');
  assert.doesNotMatch(text,/getUserMedia|MediaRecorder|<iframe|youtube-nocookie|replaceSpeakingWithVideo|MediaPrompt/);
}
console.log('✓ quiet programme: optional voice, legacy migration without lost work, backup and no video paths');
