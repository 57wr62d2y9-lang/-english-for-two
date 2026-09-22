import {checkpointCandidates,levelTarget,shuffle} from './learning.js';
import {examplesFor} from './lesson-notes.js';
import {progressFor} from './lexicon.js';

function optionsFor(item,pool,field) {
  const alternatives=shuffle([...new Set(pool.filter(other=>other.id!==item.id).map(other=>other[field]))]).filter(value=>value && value!==item[field]).slice(0,3);
  return shuffle([item[field],...alternatives]);
}
function vocabularyTask(item,pool,index) {
  const example=examplesFor(item)[index%Math.max(1,examplesFor(item).length)];
  if(index%3===0)return {type:'recognition',item,prompt:item.phrase,answer:item.ru,options:optionsFor(item,pool,'ru')};
  if(index%3===1)return {type:'meaning',item,prompt:example?.en || item.phrase,answer:item.explanation,options:optionsFor(item,pool,'explanation')};
  return {type:'recall',item,prompt:item.ru,answer:item.phrase};
}
export function buildCheckpoint(items,progress,quarter) {
  const candidates=checkpointCandidates(items,progress,quarter);
  return candidates.length===10?candidates.map((item,index)=>vocabularyTask(item,items,index)):[];
}
export function buildFinalCheck(items,progress,level=items[0]?.level) {
  // Old callers passed unrelated banks as the third argument.
  if(typeof level!=='string')level=items[0]?.level;
  const pool=items.filter(item=>item.level===level);
  const candidates=shuffle(pool.filter(item=>{const p=progressFor(item,progress);return p?.v && p.s==='MASTERED' && item.cloze;}));
  if(candidates.length<levelTarget(level))return [];
  return candidates.slice(0,20).map((item,index)=>vocabularyTask(item,pool,index));
}
