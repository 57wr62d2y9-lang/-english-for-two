import {DAILY_IELTS} from './daily-ielts.js';
import {MEDIA_LESSONS} from './media-lessons.js';

export const normaliseSpeakingMode=mode=>mode==='aloud'?'aloud':'quiet';
export const mediaBlockHasNext=block=>Boolean(block && block.index < block.lesson.questions.length+(block.quiet?1:0));
export const resumeSpeakingMode=(draft,settings)=>({...draft,speakingMode:normaliseSpeakingMode(draft.speakingMode || settings.speakingMode)});

export function quietRehearsalTask(block) {
  const level=block.lesson.level;
  const prompts={
    A2:['Think of one thing you would say in a similar conversation.','Представь похожий разговор. Составь про себя 2–3 простые реплики.','Situation → response → reason.','Ситуация → твоя реплика → причина.'],
    B1:['Retell the main event, then relate it to your own experience.','Перескажи главное событие и добавь похожий случай из своей жизни.','What happened → one detail → your experience.','Что случилось → одна деталь → твой опыт.'],
    B2:['Summarise the main idea and explain whether you agree with it.','Кратко передай главную мысль и объясни свою позицию.','Main idea → reason → your view → example.','Главная мысль → причина → твоя позиция → пример.'],
    C1:['Separate what the speaker reports from what you infer. Add one limitation.','Отдели услышанные факты от своих выводов. Назови одно ограничение такого вывода.','Reported fact → inference → limitation.','Факт из записи → твой вывод → ограничение.'],
  };
  const [prompt,ru,structure,structureRu]=prompts[level];
  const item={id:`${block.lesson.id}:rehearsal`,level,skill:'Speaking',taskType:'Silent response preparation',practice:true,prompt,ru,structure,structureRu,seconds:45,
    strategyEn:'Rehearse silently or write notes. This prepares an answer; it does not assess pronunciation.',
    strategyRu:'Сначала сформулируй ответ про себя, затем при желании запиши опорные слова. Произношение здесь не оценивается.'};
  return {...item,item,type:'ielts',category:'ielts',progressId:item.id,key:item.id,quietRehearsal:true,sourceTitle:block.lesson.title};
}

export function quietFallbackTask(session) {
  const pool=DAILY_IELTS.filter(task=>task.level===session.level&&task.skill==='Speaking');
  const item=pool.find(task=>!session.visits?.[task.id]) || pool[(session.lessonIndex||0)%pool.length];
  return {...item,item,type:'ielts',category:'ielts',progressId:item.id,key:item.id,listeningUnavailable:true};
}

export function quietMediaCandidates(level) {
  return MEDIA_LESSONS.filter(lesson=>lesson.level===level&&lesson.kind==='video');
}

export function skipUnheardMedia(session) {
  // No correct answers, penalties or listening evidence for a video not heard.
  return {...session,mediaBlock:null,task:quietFallbackTask(session),feedback:null,selected:null,hintUsed:false,taskStartedRemaining:session.remainingMs};
}
