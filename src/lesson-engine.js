import {lexiconForLevel,progressFor} from './lexicon.js';
import {chooseTask,isDue,queueRecovery,settleRecovery,shuffle,studySlot} from './learning.js';
import {normaliseSpeakingMode} from './quiet-speaking.js';
import {vocabularyTask} from './vocabulary-tasks.js';
export const PROGRAMME_VERSION='vocabulary-3';
export {normaliseAnswer,isAnswerCorrect} from './answer-check.js';

export function optionsFor(item,pool,field='phrase') {
  const answer = item[field];
  const alternatives = [...new Set(shuffle(pool.filter(other => other.id !== item.id && other.level === item.level)).map(other=>other[field]))].filter(value=>value && value !== answer).slice(0,3);
  return shuffle([answer,...alternatives]);
}

export function phraseTask(choice,pool,progress,session) {
  const item=choice.item,previous=progressFor(item,progress);
  const encounter=Number(previous?.c || 0)+Number(previous?.w || 0);
  let type=choice.type==='intro'?'intro':previous?.known||previous?.sentenceRecallPending?'recall':
    ['recognition','recall','context','write'][encounter % 4];
  if(choice.recovery)type=choice.type==='recognition'?'context':choice.type;
  const task={...choice,...vocabularyTask(item,type,pool,encounter,{optionsFor})};
  return {...task,key:item.id+':'+task.type+':'+task.exampleIndex,wasDue:Boolean(previous && isDue(previous,session.now))};
}
export function makeSession(level,minutes=15,lessonIndex=0,time=Date.now(),speakingMode='quiet',vocabPace='normal') {
  return {version:3,programmeVersion:PROGRAMME_VERSION,id:globalThis.crypto?.randomUUID?.() || 'lesson-'+time+'-'+Math.random().toString(36).slice(2),level,minutes,lessonIndex,
    speakingMode:normaliseSpeakingMode(speakingMode),vocabPace,slot:studySlot(time),startedAt:time,plannedMs:minutes*60000,remainingMs:minutes*60000,step:0,cycleStep:0,newCount:0,introducedIds:[],
    recent:[],visits:{},taskCounts:{},successByType:{},answers:0,correct:0,scoredAnswers:0,scoredCorrect:0,correctTaskKeys:[],
    unaidedCorrect:0,fastCorrect:0,recoveryQueue:[],recovered:0,dueSuccess:0,xp:0,mediaBlocks:0,done:false};
}
export function nextLessonTask(base,progress,time=Date.now()) {
  const session={...base,programmeVersion:PROGRAMME_VERSION,now:time,visits:base.visits || {},recent:base.recent || [],
    introducedIds:base.introducedIds || [],mediaBlock:null,feedback:null,selected:null,hintUsed:false,exhausted:false};
  const pool=lexiconForLevel(session.level);
  session.recoveryQueue=(session.recoveryQueue || []).filter(entry=>pool.some(item=>item.id===entry.id));
  const choice=chooseTask(pool,progress,session,time);
  let task;
  if(!task && choice)task=phraseTask(choice,pool,progress,session);
  if(!task)return {...session,task:null,exhausted:true,moreAvailable:pool.some(item=>!progressFor(item,progress) || progressFor(item,progress).s==='NEW')};
  const id=task.item.id,isNew=task.type==='intro';
  return {...session,task,step:session.step+1,newCount:session.newCount+(isNew?1:0),
    introducedIds:isNew?[...new Set([...session.introducedIds,id])]:session.introducedIds,
    recent:[...session.recent,id].slice(-12),visits:{...session.visits,[id]:(session.visits[id] || 0)+1},
    taskStartedRemaining:session.remainingMs};
}
export function extendVocabularySession(session) {
  return {...session,extraNew:Number(session.extraNew || 0)+(session.minutes<=5?4:6),exhausted:false};
}
// Upgrade old tasks without resetting time, wallet, answers or lesson identity.
export function resumeVocabularySession(draft,progress,settings={},time=Date.now()) {
  const session={...draft,speakingMode:normaliseSpeakingMode(settings.speakingMode || draft.speakingMode),
    vocabPace:settings.vocabPace || draft.vocabPace || 'normal'};
  if(draft.programmeVersion===PROGRAMME_VERSION)return session;
  const ids=lexiconForLevel(draft.level).map(item=>item.id);
  return nextLessonTask({...session,introducedIds:[],mediaBlock:null,speakingDraft:null,feedback:null,
    recoveryQueue:(draft.recoveryQueue || []).filter(entry=>ids.includes(entry.id))},progress,time);
}
export function applySessionEvidence(session,task,correct) {
  const elapsed = Math.max(0,(session.taskStartedRemaining-session.remainingMs)/1000);
  const scored = !task.practice;
  const category = task.category;
  const unique = !session.correctTaskKeys.includes(task.key);
  const unaided = scored && correct && !session.hintUsed && unique && elapsed >= .8;
  const wasQueued=(session.recoveryQueue || []).some(entry=>entry.id===task.progressId);
  let recoveryQueue = session.recoveryQueue || [];
  if(scored) {
    recoveryQueue = correct ? settleRecovery(recoveryQueue,task.progressId,true,task.type,session.step+2)
      : queueRecovery(recoveryQueue,task.progressId,task.type,session.step+2);
    // Preserve identity for retries and legacy saved sessions.
    recoveryQueue=recoveryQueue.map(entry=>entry.id===task.progressId ? {...entry,sourceId:task.item.id} : entry);
  }
  return {...session,
    answers:session.answers+(scored ? 1 : 0),correct:session.correct+(scored && correct ? 1 : 0),
    scoredAnswers:session.scoredAnswers+(scored ? 1 : 0),scoredCorrect:session.scoredCorrect+(scored && correct ? 1 : 0),
    taskCounts:{...session.taskCounts,...(scored ? {[category]:(session.taskCounts[category] || 0)+1} : {})},
    successByType:{...session.successByType,...(scored && correct ? {[category]:(session.successByType[category] || 0)+1} : {})},
    correctTaskKeys:scored && correct ? [...new Set([...session.correctTaskKeys,task.key])] : session.correctTaskKeys,
    unaidedCorrect:session.unaidedCorrect+(unaided ? 1 : 0),fastCorrect:session.fastCorrect+(unaided && elapsed <= 18 ? 1 : 0),
    dueSuccess:session.dueSuccess+(correct && task.wasDue ? 1 : 0),recovered:session.recovered+(scored && correct && wasQueued ? 1 : 0),recoveryQueue,
    mediaBlock:null};
}
export function reviewActionFor(task,correct) {
  return task.practice?'intro':!correct?(task.type==='write'?'sentenceRetry':'wrong'):
    task.type==='recognition'?'recognition':task.type==='recall'?'recall':'context';
}
