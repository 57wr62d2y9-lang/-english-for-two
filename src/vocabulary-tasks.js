import {examplesFor,guideFor} from './lesson-notes.js';
import {sentenceRule} from './sentence-rules.js';
const escape=text=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const core=text=>text.replace(/[.!?…]+$/g,'').trim();

export function contextSupport(task,pool,{optionsFor}={}) {
  const candidates=pool.filter(other=>other.kind===task.item.kind &&
    Math.abs(core(other.phrase).split(/\s+/).length-task.answer.split(/\s+/).length)<=1);
  const supportOptions=typeof optionsFor==='function'?optionsFor({...task.item,phrase:task.answer},
    candidates.length>=4?candidates:pool,'phrase'):[];
  return {hintRu:task.item.ru,supportOptions};
}

export function vocabularyTask(item,type,pool,index=0,{optionsFor}={}) {
  const examples=examplesFor(item),example=examples[index%Math.max(1,examples.length)] || {en:item.phrase,ru:item.ru};
  const task={item,type,category:type,progressId:item.id,exampleIndex:index%Math.max(1,examples.length),example,examples,
    guide:guideFor(item,example.en),answer:item.phrase};
  if(type==='intro')return {...task,prompt:item.phrase};
  // Do not ask for an unspecified expression in a different person's example.
  // Recognition always asks about the canonical headword shown on the card.
  if(type==='recognition')return {...task,prompt:item.phrase,answer:item.ru,options:optionsFor(item,pool,'ru'),instruction:'Выбери перевод именно этого слова или выражения.'};
  if(type==='write') {
    const usable=examples.filter(e=>e.ru && e.en.split(/\s+/).length<=20 && !/^["“]/.test(e.en));
    if(usable.length){const chosen=usable[index%usable.length];return {...task,prompt:chosen.ru,answer:chosen.en,example:chosen,focusRu:item.ru,
      rule:sentenceRule(chosen.en),typed:true,instruction:'Переведи учебный пример целиком. Используй слова и выражения из этой карточки; сохраняй лицо, время и отрицание.'};}
    type='recall';
  }
  if(type==='context') {
    const pattern=new RegExp('(?<![a-z])'+escape(core(item.phrase)).replace(/['’]/g,"['’]")+'(?![a-z])','i');
    const usable=examples.filter(e=>(e.en.match(new RegExp(pattern.source,'gi')) || []).length===1);
    if(usable.length){const chosen=usable[index%usable.length],answer=chosen.en.match(pattern)[0];const gap={...task,type,category:type,
      prompt:chosen.en.replace(pattern,'_____'),answer,example:chosen,typed:true,
      instruction:'Вставь слово или выражение с этим смыслом.'};
      return {...gap,accepted:item.accepted||[],...contextSupport(gap,pool,{optionsFor})};}
    type='recall';
  }
  return {...task,type:'recall',category:'recall',prompt:item.ru,accepted:item.accepted||[],typed:true,
    instruction:'Вспомни изученное слово или выражение. Напиши по-английски; регистр, пунктуация и сокращения не влияют на проверку.'};
}
