import {PHRASES,COLLOCATIONS} from './catalog.js';
import {VOCABULARY} from './vocabulary.js';

export const lexicalKey=text=>String(text).toLowerCase().replaceAll('’',"'").replace(/[.!?…]+$/g,'').trim();
const levels=['A2','B1','B2','C1'];
// Keep original IDs. Duplicate legacy cards are aliases, never new learning.
export const LEXICON=levels.flatMap(level=>{
  const unique=new Map();
  for(const item of [...PHRASES,...COLLOCATIONS,...VOCABULARY].filter(item=>item.level===level)) {
    const key=lexicalKey(item.phrase),existing=unique.get(key);
    if(existing){existing.aliases.push(item.id);continue;}
    unique.set(key,{...item,kind:item.kind || 'phrase',aliases:[]});
  }
  const words=[...unique.values()].filter(item=>item.kind==='word');
  const phrases=[...unique.values()].filter(item=>item.kind==='phrase');
  const result=[];
  for(let n=0;n<Math.max(words.length,phrases.length);n++) {
    if(words[n])result.push(words[n]);
    if(phrases[n])result.push(phrases[n]);
  }
  return result;
});
export const lexiconForLevel=level=>LEXICON.filter(item=>item.level===level);
export function progressFor(item,progress={}) {
  return [item?.id,...(item?.aliases || [])].map(id=>progress[id]).filter(Boolean)
    .sort((a,b)=>Number(b.l || b.f || 0)-Number(a.l || a.f || 0))[0];
}
export function vocabularyStats(items,progress,time=Date.now()) {
  const learned=items.filter(item=>{const p=progressFor(item,progress);return p && p.s!=='NEW';});
  return {available:items.length,words:items.filter(item=>item.kind==='word').length,phrases:items.filter(item=>item.kind!=='word').length,
    introduced:learned.length,remaining:items.length-learned.length,
    recall:learned.filter(item=>progressFor(item,progress)?.rcl>0).length,
    due:learned.filter(item=>{const p=progressFor(item,progress);return !p.n || p.n<=time;}).length,
    verified:learned.filter(item=>{const p=progressFor(item,progress);return p.v && p.s==='MASTERED';}).length};
}
export const TOTAL_LEXICAL_UNITS=new Set(LEXICON.map(item=>lexicalKey(item.phrase))).size;
