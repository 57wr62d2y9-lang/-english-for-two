import { PHRASES, COLLOCATIONS } from './catalog.js';
import { DAILY_GRAMMAR, examplesFor, guideFor } from './lesson-notes.js';
import { dailyIeltsForLevel } from './daily-ielts.js';
import { MEDIA_LESSONS } from './media-lessons.js';
import { chooseTask, isDue, queueRecovery, settleRecovery, shuffle, studySlot } from './learning.js';

const cycle = ['phrase','grammar','phrase','Reading','phrase','media','phrase','collocation','phrase','grammar','phrase','Writing','phrase','order','phrase','Speaking'];
const escapes = text => text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function normaliseAnswer(text) {
  return String(text || '').toLowerCase().replaceAll('’',"'").replaceAll('‘',"'")
    .replace(/\bi'm\b/g,'i am').replace(/\bit's\b/g,'it is').replace(/\bthat's\b/g,'that is')
    .replace(/\bcan't\b/g,'cannot').replace(/\bwon't\b/g,'will not').replace(/n't\b/g,' not')
    .replace(/'re\b/g,' are').replace(/'ve\b/g,' have').replace(/'ll\b/g,' will')
    .replace(/[^a-z0-9а-яё\s]/gi,' ').replace(/\s+/g,' ').trim();
}
export const isAnswerCorrect = (task,value) => (task.accepted || [task.answer]).some(answer => normaliseAnswer(answer) === normaliseAnswer(value));

export function optionsFor(item,pool,field='phrase') {
  const answer = item[field];
  const alternatives = [...new Set(shuffle(pool.filter(other => other.id !== item.id && other.level === item.level)).map(other=>other[field]))].filter(value=>value && value !== answer).slice(0,3);
  return shuffle([answer,...alternatives]);
}
function leastUsed(pool, progress, session, maxVisits=1) {
  const priority=item=>{
    const p=progress[item.id];
    // A due mistake must not be hidden behind hundreds of unseen items.
    return p && isDue(p,session.now) ? (p.lastWrong > (p.lastCorrect || 0) ? 0 : 1) : !p ? 2 : 3;
  };
  return [...pool].filter(item=>(session.visits[item.id] || 0) < maxVisits && !session.recent.slice(-5).includes(item.id))
    .sort((a,b)=>priority(a)-priority(b) || (session.visits[a.id] || 0) - (session.visits[b.id] || 0) || (progress[a.id]?.l || 0) - (progress[b.id]?.l || 0))[0];
}
function grammarTask(item,recovery=false) {
  return {type:'grammar',category:'grammar',item,progressId:item.id,key:item.id,prompt:item.prompt,answer:item.answer,options:shuffle(item.options),guide:guideFor(item),explanation:item.explanation,ru:item.ru,recovery};
}
function ieltsTask(item,recovery=false) {
  return {...item,type:'ielts',category:'ielts',item,progressId:item.id,key:item.id,options:item.options ? shuffle(item.options) : undefined,recovery};
}
function phraseTask(choice,pool,progress,session,forceType) {
  const item = choice.item;
  const examples = examplesFor(item);
  const previous = progress[item.id];
  const exampleIndex = (Number(previous?.c || 0) + Number(previous?.w || 0) + Number(session.lessonIndex || 0)) % Math.max(1,examples.length);
  const example = examples[exampleIndex] || {en:item.phrase,ru:item.ru};
  let type = choice.type === 'intro' ? 'intro' : forceType || ['recognition','context','recall','order','meaning'][(Number(previous?.c || 0) + Number(previous?.w || 0)) % 5];
  if (choice.recovery) type = ['context','order','recall'][(session.visits[item.id] || 0) % 3];
  const task = {...choice,item,type,category:type,progressId:item.id,exampleIndex,example,guide:guideFor(item,example.en),examples,answer:item.phrase};
  if(type === 'intro') return {...task,key:`${item.id}:intro`,prompt:item.phrase};
  if(type === 'recognition') Object.assign(task,{prompt:item.phrase,answer:item.ru,options:optionsFor(item,pool,'ru'),instruction:'Выбери значение выражения.'});
  if(type === 'meaning') Object.assign(task,{prompt:example.en,answer:item.explanation,options:optionsFor(item,pool,'explanation'),instruction:`Что означает «${item.phrase}» в этой ситуации?`});
  if(type === 'context') {
    const core = item.phrase.replace(/[.!?…]+$/g,'').trim();
    const pattern = new RegExp(escapes(core),'i');
    Object.assign(task,{prompt:pattern.test(example.en) ? example.en.replace(pattern,'_____') : item.explanation,options:optionsFor(item,pool),instruction:pattern.test(example.en) ? 'Вставь подходящее выражение.' : 'Выбери выражение с этим значением.'});
  }
  if(type === 'recall') Object.assign(task,{prompt:item.ru,subPrompt:item.explanation,instruction:'Напиши изученное выражение по-английски. Регистр и знаки препинания не важны.'});
  if(type === 'order') Object.assign(task,{prompt:example.ru || item.ru,answer:example.en,tokens:shuffle(example.en.split(/\s+/).map((text,index)=>({id:index,text}))),instruction:'Собери предложение из слов. Используй все слова.'});
  return {...task,key:`${item.id}:${type}:${exampleIndex}`,wasDue:Boolean(previous && isDue(previous))};
}
function mediaQuestion(block) {
  const question = block.lesson.questions[block.index];
  const id = `${block.lesson.id}:q${block.index}`;
  return {type:block.lesson.kind,category:block.lesson.kind,item:block.lesson,lesson:block.lesson,questionIndex:block.index,questionCount:block.lesson.questions.length,
    progressId:id,key:id,prompt:question.prompt,answer:question.options[question.answer],options:shuffle(question.options),explanation:question.explanation,ru:question.ru,recovery:Boolean(block.recovery)};
}
export function makeSession(level,minutes=15,lessonIndex=0,time=Date.now()) {
  return {version:3,id:globalThis.crypto?.randomUUID?.() || `lesson-${time}-${Math.random().toString(36).slice(2)}`,level,minutes,lessonIndex,
    slot:studySlot(time),startedAt:time,plannedMs:minutes*60000,remainingMs:minutes*60000,step:0,cycleStep:0,newCount:0,
    recent:[],visits:{},taskCounts:{},successByType:{},answers:0,correct:0,scoredAnswers:0,scoredCorrect:0,correctTaskKeys:[],
    unaidedCorrect:0,fastCorrect:0,recoveryQueue:[],recovered:0,dueSuccess:0,xp:0,mediaBlocks:0,done:false};
}
export function nextLessonTask(base,progress,time=Date.now()) {
  const session = {...base,now:time,visits:base.visits || {},recent:base.recent || [],feedback:null,selected:null,hintUsed:false};
  let task;
  if(session.mediaBlock && session.mediaBlock.index < session.mediaBlock.lesson.questions.length) task = mediaQuestion(session.mediaBlock);
  else {
    session.mediaBlock = null;
    const pool = PHRASES.filter(item=>item.level === session.level);
    const category = cycle[session.cycleStep % cycle.length];
    for(const recovery of session.recoveryQueue || []) {
      if(recovery.dueStep > session.step || recovery.attempts > 2 || session.recent.slice(-5).includes(recovery.sourceId || recovery.id))continue;
      const phrase=pool.find(item=>item.id===recovery.id);
      const grammar=DAILY_GRAMMAR.find(item=>item.level===session.level && item.id===recovery.id);
      const ielts=dailyIeltsForLevel(session.level).find(item=>item.id===recovery.id);
      const collocation=COLLOCATIONS.find(item=>item.level===session.level && item.id===recovery.id);
      if(phrase) task=phraseTask({item:phrase,type:'context',recovery:true},pool,progress,session);
      else if(grammar) task=grammarTask(grammar,true);
      else if(ielts) task=ieltsTask(ielts,true);
      else if(collocation) task={...phraseTask({item:collocation,type:'context',recovery:true},COLLOCATIONS.filter(item=>item.level===session.level),progress,session),category:'collocation'};
      else if(session.remainingMs>120000) {
        const lesson=MEDIA_LESSONS.find(item=>item.level===session.level && recovery.id.startsWith(`${item.id}:q`));
        if(lesson && !session.recent.slice(-5).includes(lesson.id)) {
          session.mediaBlock={lesson,index:0,ready:false,recovery:true};task=mediaQuestion(session.mediaBlock);
        }
      }
      if(task)break;
    }
    // A recovery supplements the normal programme; it does not skip its next category.
    if(!task)session.cycleStep++;
    if(!task && category === 'media' && session.minutes >= 12 && session.mediaBlocks < 2 && session.remainingMs > 120000) {
      const kind = (session.lessonIndex + session.mediaBlocks) % 2 === 0 ? 'video' : 'listening';
      const mediaPool = MEDIA_LESSONS.filter(lesson=>lesson.level === session.level && lesson.kind === kind);
      const lesson = [...mediaPool].sort((a,b)=>{
        const wrongDue=media=>media.questions.some((_,index)=>{const p=progress[`${media.id}:q${index}`];return p && isDue(p,time) && p.lastWrong>(p.lastCorrect || 0);});
        const last = media => Math.max(0,...media.questions.map((_,index)=>progress[`${media.id}:q${index}`]?.l || 0));
        return Number(wrongDue(b))-Number(wrongDue(a)) || last(a)-last(b);
      }).find(media=>!session.recent.includes(media.id)) || mediaPool[0];
      if(lesson) { session.mediaBlock={lesson,index:0,ready:false};session.mediaBlocks++;task=mediaQuestion(session.mediaBlock); }
    }
    if(!task && category === 'grammar') {
      const item = leastUsed(DAILY_GRAMMAR.filter(item=>item.level === session.level),progress,session);
      if(item) task=grammarTask(item);
    }
    if(!task && ['Reading','Writing','Speaking'].includes(category)) {
      const item = leastUsed(dailyIeltsForLevel(session.level,category),progress,session);
      if(item) task=ieltsTask(item);
    }
    if(!task && category === 'collocation') {
      const collocations = COLLOCATIONS.filter(item=>item.level === session.level);
      const item = leastUsed(collocations,progress,session,2);
      if(item) task={...phraseTask({item,type:'context'},collocations,progress,session,'context'),category:'collocation'};
    }
    if(!task) {
      const choice = chooseTask(pool,progress,session,time);
      if(choice) task=phraseTask(choice,pool,progress,session,category === 'order' ? 'order' : undefined);
    }
    // A fast learner gets unused material, never an endless three-card loop.
    if(!task) {
      const item = leastUsed(DAILY_GRAMMAR.filter(item=>item.level === session.level),progress,session);
      if(item) task=grammarTask(item);
    }
  }
  if(!task) return {...session,exhausted:true};
  const id=task.item.id;
  return {...session,task,step:session.step+1,newCount:session.newCount+(task.type === 'intro' ? 1 : 0),
    recent:[...session.recent,id].slice(-12),visits:{...session.visits,[id]:(session.visits[id] || 0)+1},
    taskStartedRemaining:session.remainingMs,feedback:null,selected:null};
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
    // Keep source identity as well as question identity for audio/video blocks.
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
    mediaBlock:session.mediaBlock ? {...session.mediaBlock,index:session.mediaBlock.index+1} : null};
}
