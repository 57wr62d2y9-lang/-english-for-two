import { checkpointCandidates, shuffle } from './learning.js';
import { AUDIO_LESSONS } from './media-lessons.js';

function listeningBlock(lessons, level, seed=0) {
  const pool=lessons.map(lesson=>AUDIO_LESSONS.find(full=>full.id===lesson.id) || lesson).filter(lesson=>lesson.level===level && lesson.questions.length>=3);
  if(!pool.length)return [];
  const lesson=pool[seed%pool.length];
  return lesson.questions.slice(0,3).map((question,index)=>({type:'listening',item:lesson,lesson,question,questionIndex:index,questionCount:3,prompt:question.prompt,answer:question.options[question.answer],options:shuffle(question.options)}));
}

const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function cloze(item, seed = 0) {
  const sources = [...(item.variations || []), ...(item.examples || [])];
  const source = sources[seed % Math.max(1, sources.length)] || item.explanation;
  const core = item.phrase.replace(/[.…!?]+$/g, '').trim();
  const pattern = new RegExp(escape(core), 'i');
  if (pattern.test(source)) return source.replace(pattern, '_____');
  return `Выбери выражение с этим значением: ${item.explanation}`;
}

function optionsFor(item, pool, field) {
  const others = shuffle(pool.filter(candidate => candidate.id !== item.id).map(candidate => candidate[field]).filter(Boolean)).slice(0, 3);
  return shuffle([item[field], ...others]);
}

export function buildCheckpoint(items, progress, quarter, collocations, lessons, level) {
  const candidates = checkpointCandidates(items, progress, quarter);
  if (candidates.length < 10) return [];
  const phraseTasks = [
    { type:'recognition', item:candidates[0], prompt:candidates[0].phrase, answer:candidates[0].ru, options:optionsFor(candidates[0], items, 'ru') },
    { type:'context', item:candidates[2], prompt:cloze(candidates[2], 3), answer:candidates[2].phrase, options:optionsFor(candidates[2], items, 'phrase') },
    { type:'context', item:candidates[3], prompt:cloze(candidates[3], 4), answer:candidates[3].phrase, options:optionsFor(candidates[3], items, 'phrase') },
    { type:'recall', item:candidates[4], prompt:candidates[4].ru, answer:candidates[4].phrase },
    { type:'recall', item:candidates[5], prompt:candidates[5].explanation, answer:candidates[5].phrase }
  ];
  const collocationPool = collocations.filter(item => item.level === level);
  const collocationTasks = [0,1].map((_, index) => {
    const item = collocationPool[index % collocationPool.length];
    return { type:'collocation', item, prompt:cloze(item, index + 1), answer:item.phrase, options:optionsFor(item, collocationPool, 'phrase') };
  });
  const listeningTasks = listeningBlock(lessons,level,quarter-1);
  return listeningTasks.length===3 ? [...shuffle([...phraseTasks,...collocationTasks]),...listeningTasks] : [];
}

export function buildFinalCheck(items, progress, collocations, lessons, grammar, level) {
  const candidates = shuffle(items.filter(item => progress[item.id]?.v && progress[item.id]?.s === 'MASTERED' && item.cloze));
  if (items.length < 400 || candidates.length < 400) return [];

  const phraseTasks = [
    ...candidates.slice(0, 3).map(item => ({ type:'recognition', item, prompt:item.phrase, answer:item.ru, options:optionsFor(item, items, 'ru') })),
    ...candidates.slice(4, 8).map((item, index) => ({ type:'context', item, prompt:cloze(item, index + 7), answer:item.phrase, options:optionsFor(item, items, 'phrase') })),
    ...candidates.slice(8, 12).map(item => ({ type:'recall', item, prompt:item.ru, answer:item.phrase }))
  ];
  const collocationPool = collocations.filter(item => item.level === level);
  const collocationTasks = shuffle(collocationPool).slice(0, 2).map((item, index) => ({
    type:'collocation', item, prompt:cloze(item, index + 11), answer:item.phrase, options:optionsFor(item, collocationPool, 'phrase')
  }));
  const listeningTasks = listeningBlock(shuffle(lessons),level);
  const grammarPool = grammar.filter(item => item.level === level);
  const grammarTasks = shuffle(grammarPool).slice(0, 4).map(item => ({
    type:'grammar', item, prompt:item.prompt, answer:item.answer, options:shuffle(item.options)
  }));
  const tasks = [...shuffle([...phraseTasks,...collocationTasks,...grammarTasks]),...listeningTasks];
  return tasks.length === 20 ? tasks : [];
}
