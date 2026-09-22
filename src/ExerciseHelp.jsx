import React from 'react';
import { GUIDES, guideFor, wordHints } from './lesson-notes.js';
import {TranslateButton} from './InlineTranslation.jsx';
import {EnglishText} from './WordLookup.jsx';
import { grammarDetail, CONDITIONAL_TYPES, isConditionalGuide, ruleResource, translationTarget } from './task-support.js';
export {TranslateButton};
export function Example({example}) {
  return <div className="examplePair"><strong lang="en"><EnglishText text={example.en} ru={example.ru}/></strong>{example.ru?<span lang="ru">{example.ru}</span>:<TranslateButton key={example.en} text={example.en}/>}</div>;
}
function WordHelp({text}) {
  const hints=wordHints(text);
  return hints.length?<div className="wordGlossary">{hints.map(item=><div key={item.word}><b lang="en"><EnglishText text={item.word} ru={item.ru}/></b><span lang="en"><EnglishText text={item.en}/></span><small>{item.ru}</small></div>)}</div>:null;
}
function ConditionalOverview() {
  return <details className="conditionalOverview"><summary>Все 5 типов условных предложений</summary><p>Сначала спроси себя: это закономерность, реальное будущее, воображаемое настоящее или другое прошлое?</p>{CONDITIONAL_TYPES.map(type=><article key={type.id}><h3>{type.title}</h3><code>{type.formula}</code><p>{type.ru}</p><Example example={{en:type.en,ru:type.translation}}/></article>)}<p className="helper">Это основные учебные схемы. В результате также бывают can/could/may/might; выбор зависит от смысла. Will и would иногда встречаются после if в значении готовности, но не в этих базовых примерах.</p></details>;
}
export function RuleHelp({guide,item,open=false}) {
  if(!guide || guide.title===GUIDES.phrase.title) {
    // No generic “learn the complete expression” essay. A phrase gets its
    // actual meaning; reading/writing tasks get their own strategy below.
    return item?.phrase?<div className="phraseMeaning compact"><b><EnglishText text={item.phrase} ru={item.ru}/></b><span>{item.ru}</span><small lang="en"><EnglishText text={item.explanation}/></small></div>:null;
  }
  const resource=ruleResource(guide);
  return <div className="ruleSupport"><details className="ruleHelp" open={open}><summary>{guide.title}</summary><code><EnglishText text={guide.formula}/></code><p>{guide.ru}</p>{guide.example&&<Example example={{en:guide.example,ru:guide.translation}}/>}<details className="englishExplanation"><summary>Explanation in English</summary><p lang="en"><EnglishText text={guide.en}/></p></details></details>{isConditionalGuide(guide)&&<ConditionalOverview/>}{resource&&<a className="ruleLink" href={resource.url} target="_blank" rel="noopener noreferrer">{resource.label}</a>}</div>;
}
export function LexicalHelp({item,compact=false}) {
  if(!item?.phrase)return null;
  if(compact)return item.usageRu?<div className="usageNote"><strong>Как сказать в жизни</strong><p>{item.usageRu}</p></div>:null;
  return <div className="usageNote"><strong><EnglishText text={item.phrase} ru={item.ru}/></strong><p>{item.ru}</p>{item.usageRu&&<p>{item.usageRu}</p>}<small lang="en"><EnglishText text={item.explanation}/></small></div>;
}
export function TaskTranslation({task,onHint}) {
  const target=translationTarget(task);
  return <TranslateButton key={target.text} {...target} onHint={onHint}/>;
}
export function TaskHint({task,onHint}) {
  return <details className="taskHint" onToggle={event=>{if(event.currentTarget.open)onHint?.();}}><summary>{task.type==='ielts'?'Как понять текст и полезные слова':'Подсказка: значение и употребление'}</summary>{task.type==='ielts'?<div className="taskStrategy"><p>{task.strategyRu}</p></div>:<><LexicalHelp item={task.item}/>{task.example&&<Example example={task.example}/>}</>}<WordHelp text={`${task.passage||''} ${task.prompt} ${task.options?.join(' ') || ''}`}/></details>;
}
export function AnswerExplanation({task,selected,wrong}) {
  if(task.type==='grammar') {
    const detail=grammarDetail(task.item || task);
    return <div className="answerExplanation">{wrong&&<p className="chosenAnswer">Твой ответ: <s><EnglishText text={selected}/></s></p>}<div className="answerReveal" lang="en"><EnglishText text={detail.sentence} ru={detail.translation}/></div><p className="sentenceTranslation">{detail.translation}</p><h3>Почему именно так</h3><p>{detail.why}</p><RuleHelp guide={task.guide || guideFor(task.item)} item={task.item}/></div>;
  }
  return <div className="answerExplanation">{wrong&&<p className="chosenAnswer">Твой ответ: <s><EnglishText text={selected}/></s></p>}{!task.practice&&<div className="answerReveal"><EnglishText text={task.answer}/></div>}{task.ru&&task.ru!==task.prompt&&<p>{task.ru}</p>}{task.explanation&&<details className="englishExplanation"><summary>Explanation in English</summary><p lang="en"><EnglishText text={task.explanation}/></p></details>}{task.example&&<><LexicalHelp item={task.item}/><Example example={task.example}/><details className="optionalGrammar"><summary>Если интересна конструкция предложения</summary><RuleHelp guide={task.guide || guideFor(task.item,task.example.en)} item={task.item}/></details></>}{task.passage&&<TaskTranslation task={task}/>}</div>;
}
