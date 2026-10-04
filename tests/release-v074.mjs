import assert from 'node:assert/strict';
import {lexiconForLevel,LEXICON,TOTAL_LEXICAL_UNITS} from '../src/lexicon.js';
import {CONVERSATION_CONTENT} from '../src/conversation-content.js';
import {vocabularyTask} from '../src/vocabulary-tasks.js';
import {optionsFor,phraseTask,makeSession,resumeVocabularySession} from '../src/lesson-engine.js';
import {reviewItem,chooseTask,DAY} from '../src/learning.js';
import {isSecured} from '../src/mastery.js';
import {isAnswerCorrect} from '../src/answer-check.js';
import {englishVoice} from '../src/pronunciation.js';
const pool=lexiconForLevel('B1'),now=Date.parse('2026-10-04T16:00:00Z');
for(const phrase of ['eventually','recommend']) {
  const item=pool.find(i=>i.phrase===phrase),task=vocabularyTask(item,'context',pool,0,{optionsFor});
  assert.equal(task.type,'context');assert.equal(task.hintRu,item.ru);assert.ok(task.supportOptions.includes(task.answer));
  assert.equal(task.supportOptions.length,4);assert.equal(new Set(task.supportOptions).size,4);
  assert.equal(task.prompt.replace('_____',task.answer),task.example.en);
  const assisted=reviewItem({},'context',now,'aided-'+phrase,{typed:true,unaided:false}).item;
  assert.deepEqual(assisted.proofDays,[]);assert.equal(isSecured(assisted),false);
}
const item=pool.find(i=>i.phrase==='eventually'),task=vocabularyTask(item,'context',pool,0,{optionsFor});
const draft={...makeSession('B1',15,0,now),programmeVersion:'vocabulary-3',step:5,task:{...task,supportOptions:undefined,hintRu:undefined},remainingMs:400000,answers:7,correct:5,hintUsed:true};
const resumed=resumeVocabularySession(draft,{});
for(const field of ['id','step','remainingMs','answers','correct','hintUsed'])assert.equal(resumed[field],draft[field]);
assert.equal(resumed.task.prompt,draft.task.prompt);assert.equal(resumed.task.answer,draft.task.answer);assert.equal(resumed.task.supportOptions.length,4);
const answered=resumeVocabularySession({...draft,feedback:'correct',selected:task.answer},{});
assert.equal(answered.feedback,'correct');assert.equal(answered.selected,task.answer);
const types=new Set(Array.from({length:6},(_,formatStep)=>phraseTask({item,type:'recall'},pool,{[item.id]:{c:2,w:0}},{now,formatStep}).type));
assert.deepEqual(types,new Set(['recall','context','recognition','write']));
assert.equal(CONVERSATION_CONTENT.length,18);assert.equal(TOTAL_LEXICAL_UNITS,1312+18);
assert.equal(new Set(CONVERSATION_CONTENT.map(i=>i.id)).size,18);
for(const card of CONVERSATION_CONTENT){assert.ok(LEXICON.some(i=>i.id===card.id));assert.ok(card.register&&card.usageRu&&card.source.startsWith('https://dictionary.cambridge.org/'));assert.equal(card.examples.length,3);assert.equal(card.exampleRu.length,3);assert.ok(card.exampleRu.every(Boolean));}
for(const level of ['A2','B1','B2']) {
  const bank=lexiconForLevel(level),s={...makeSession(level,15,0,now),step:3,newCount:1};
  assert.equal(chooseTask(bank,{},s,now).item.pack,'conversation-2026-10');
  assert.equal(chooseTask(bank,{}, {...s,newCount:2},now).item.pack,'2026-10');
}
const low=LEXICON.find(i=>i.phrase==='low-key');
assert.equal(isAnswerCorrect(vocabularyTask(low,'recall',lexiconForLevel('B2'),0,{optionsFor}),'lowkey'),true);
assert.equal(isAnswerCorrect(vocabularyTask(low,'write',lexiconForLevel('B2'),0,{optionsFor}),'lowkey'),false);
const voices=[{lang:'ru-RU',default:true},{lang:'en-US',name:'US'},{lang:'en-GB',name:'UK',localService:true}];
assert.equal(englishVoice(voices,'en-US').name,'US');assert.equal(englishVoice(voices,'en-GB').name,'UK');
assert.equal(englishVoice([{lang:'ru-RU'}]),null);assert.equal(englishVoice([]),null);
console.log('✓ context clues, optional support, varied lessons, paused work, 18 sourced bilingual conversation cards, new-content mix and English-only accent selection');
