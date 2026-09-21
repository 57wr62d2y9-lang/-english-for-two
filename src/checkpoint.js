import { LEVELS, checkpointCandidates, shuffle } from './learning.js';

const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function cloze(item, seed = 0) {
  const sources = [...(item.variations || []), ...(item.examples || [])];
  const source = sources[seed % Math.max(1, sources.length)] || item.explanation;
  const core = item.phrase.replace(/[.…!?]+$/g, '').trim();
  const pattern = new RegExp(escape(core), 'i');
  if (pattern.test(source)) return source.replace(pattern, '_____');
  const words = core.split(/\s+/).slice(0, Math.max(2, Math.min(4, core.split(/\s+/).length))).join(' ');
  return source.replace(new RegExp(escape(words), 'i'), '_____');
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
    { type:'recognition', item:candidates[1], prompt:candidates[1].phrase, answer:candidates[1].ru, options:optionsFor(candidates[1], items, 'ru') },
    { type:'context', item:candidates[2], prompt:cloze(candidates[2], 3), answer:candidates[2].phrase, options:optionsFor(candidates[2], items, 'phrase') },
    { type:'context', item:candidates[3], prompt:cloze(candidates[3], 4), answer:candidates[3].phrase, options:optionsFor(candidates[3], items, 'phrase') },
    { type:'recall', item:candidates[4], prompt:candidates[4].ru, answer:candidates[4].phrase },
    { type:'recall', item:candidates[5], prompt:candidates[5].explanation, answer:candidates[5].phrase }
  ];
  const levelPosition = LEVELS.indexOf(level);
  const collocationPool = collocations.filter(item => LEVELS.indexOf(item.level) <= levelPosition);
  const collocationTasks = [0,1].map((_, index) => {
    const item = collocationPool[index % collocationPool.length];
    return { type:'collocation', item, prompt:cloze(item, index + 1), answer:item.phrase, options:optionsFor(item, collocationPool, 'phrase') };
  });
  const exactLessons = lessons.filter(item => item.level === level);
  const lessonPool = exactLessons.length ? exactLessons : lessons.filter(item => LEVELS.indexOf(item.level) < levelPosition);
  const listeningTasks = [0,1].map((_, index) => {
    const lesson = lessonPool[index % lessonPool.length];
    const question = lesson.questions[index % lesson.questions.length];
    return { type:'listening', item:lesson, lesson, question, prompt:question.prompt, answer:question.options[question.answer], options:shuffle(question.options) };
  });
  return shuffle([...phraseTasks, ...collocationTasks, ...listeningTasks]);
}
