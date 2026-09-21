import React, { useState } from 'react';
import { GUIDES, guideFor, wordHints } from './lesson-notes.js';
import { translateToRussian } from './translation.js';
import { grammarDetail, CONDITIONAL_TYPES, isConditionalGuide, ruleResource, translationTarget } from './task-support.js';

export function TranslateButton({text,ru='',label='Показать перевод предложения',onHint}) {
  const [value,setValue]=useState(''),[loading,setLoading]=useState(false),[error,setError]=useState(false);
  async function translate() {
    onHint?.();setLoading(true);setError(false);
    try {setValue(ru || await translateToRussian(text));} catch {setError(true);}
    setLoading(false);
  }
  if(!text)return null;
  return <div className="optionalTranslation">{value?<p lang="ru">{value}</p>:<><button onClick={translate} disabled={loading}>{loading?'Загружаю перевод…':error?'Повторить перевод':label}</button>{error&&<small role="status">Сервис перевода пока недоступен. Попробуй ещё раз.</small>}</>}</div>;
}
export function Example({example}) {
  return <div className="examplePair"><strong lang="en">{example.en}</strong>{example.ru?<span lang="ru">{example.ru}</span>:<TranslateButton key={example.en} text={example.en}/>}</div>;
}
function WordHelp({text}) {
  const hints=wordHints(text);
  return hints.length?<div className="wordGlossary">{hints.map(item=><div key={item.word}><b lang="en">{item.word}</b><span lang="en">{item.en}</span><small>{item.ru}</small></div>)}</div>:null;
}
function ConditionalOverview() {
  return <details className="conditionalOverview"><summary>Все 5 типов условных предложений</summary><p>Сначала спроси себя: это закономерность, реальное будущее, воображаемое настоящее или другое прошлое?</p>{CONDITIONAL_TYPES.map(type=><article key={type.id}><h3>{type.title}</h3><code>{type.formula}</code><p>{type.ru}</p><Example example={{en:type.en,ru:type.translation}}/></article>)}<p className="helper">Это основные учебные схемы. В результате также бывают can/could/may/might; выбор зависит от смысла. Will и would иногда встречаются после if в значении готовности, но не в этих базовых примерах.</p></details>;
}
export function RuleHelp({guide,item,open=false}) {
  if(!guide || guide.title===GUIDES.phrase.title) {
    // No generic “learn the complete expression” essay. A phrase gets its
    // actual meaning; reading/writing tasks get their own strategy below.
    return item?.phrase?<div className="phraseMeaning compact"><b>{item.phrase}</b><span>{item.ru}</span><small lang="en">{item.explanation}</small></div>:null;
  }
  const resource=ruleResource(guide);
  return <div className="ruleSupport"><details className="ruleHelp" open={open}><summary>{guide.title}</summary><code>{guide.formula}</code><p>{guide.ru}</p>{guide.example&&<Example example={{en:guide.example,ru:guide.translation}}/>}<details className="englishExplanation"><summary>Explanation in English</summary><p lang="en">{guide.en}</p></details></details>{isConditionalGuide(guide)&&<ConditionalOverview/>}{resource&&<a className="ruleLink" href={resource.url} target="_blank" rel="noopener noreferrer">{resource.label}</a>}</div>;
}
export function TaskTranslation({task,onHint}) {
  const target=translationTarget(task);
  return <TranslateButton key={target.text} {...target} onHint={onHint}/>;
}
export function TaskHint({task,onHint}) {
  return <details className="taskHint" onToggle={event=>{if(event.currentTarget.open)onHint();}}><summary>{task.type==='ielts'?'Как решить это задание и полезные слова':'Подсказка: смысл и правило'}</summary>{task.type==='ielts'?<div className="taskStrategy"><p>{task.strategyRu}</p><details><summary>Strategy in English</summary><p lang="en">{task.strategyEn}</p></details></div>:task.lesson?<p>Прослушай запись ещё раз и найди момент, который отвечает на этот вопрос. Ответ должен опираться на услышанное, а не на догадку.</p>:<RuleHelp guide={task.guide || guideFor(task.item,task.example?.en || task.prompt)} item={task.item} open/>}<WordHelp text={`${task.passage||''} ${task.prompt} ${task.options?.join(' ') || ''}`}/></details>;
}
export function AnswerExplanation({task,selected,wrong}) {
  if(task.type==='grammar') {
    const detail=grammarDetail(task.item || task);
    return <div className="answerExplanation">{wrong&&<p className="chosenAnswer">Твой ответ: <s>{selected}</s></p>}<div className="answerReveal" lang="en">{detail.sentence}</div><p className="sentenceTranslation">{detail.translation}</p><h3>Почему именно так</h3><p>{detail.why}</p><RuleHelp guide={task.guide || guideFor(task.item)} item={task.item}/></div>;
  }
  return <div className="answerExplanation">{wrong&&<p className="chosenAnswer">Твой ответ: <s>{selected}</s></p>}{!task.practice&&<div className="answerReveal">{task.answer}</div>}{task.ru&&task.ru!==task.prompt&&<p>{task.ru}</p>}{task.explanation&&<details className="englishExplanation"><summary>Explanation in English</summary><p lang="en">{task.explanation}</p></details>}{task.example&&<><RuleHelp guide={task.guide || guideFor(task.item,task.example.en)} item={task.item}/><Example example={task.example}/></>}{task.passage&&<TaskTranslation task={task}/>}</div>;
}
