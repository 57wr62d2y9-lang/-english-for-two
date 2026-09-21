import React,{createContext,useCallback,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {englishTokens,buildWordCard} from './word-lookup.js';
import {TranslateButton} from './InlineTranslation.jsx';

const LookupContext=createContext(null);

export function WordHelpProvider({children,level='B1',onHint}) {
  const [selection,setSelection]=useState(null);
  const trigger=useRef(null),hint=useRef(onHint);hint.current=onHint;
  const open=useCallback((value,element)=>{trigger.current=element;hint.current?.();setSelection({...value,level});},[level]);
  const close=useCallback(()=>{setSelection(null);trigger.current?.focus?.({preventScroll:true});},[]);
  const value=useMemo(()=>({open}),[open]);
  return <LookupContext.Provider value={value}>{children}{selection&&<WordCard key={`${selection.text}:${selection.index}`} selection={selection} onClose={close}/>}</LookupContext.Provider>;
}

// Only exercise content is passed here, never typed answers or personal notes.
// Each word is a real keyboard-accessible button; spaces/punctuation stay intact.
export function EnglishText({text,ru=''}) {
  const lookup=useContext(LookupContext);
  if(!lookup)return text;
  return <span className="englishText">{englishTokens(text).map(token=>token.word?<button type="button" className="wordTap" key={token.start} lang="en" aria-label={`Перевод слова: ${token.text}`} onClick={event=>{event.preventDefault();event.stopPropagation();lookup.open({word:token.text,text:String(text),index:token.start,ru},event.currentTarget);}}>{token.text}</button>:token.text)}</span>;
}

export function LookupHint() {return <p className="lookupHint">Нажми на английское слово — откроются перевод и примеры.</p>;}

export function AnswerChoices({options=[],selected,answer,feedback,disabled,onAnswer}) {
  return <>{options.some(option=>englishTokens(option).some(token=>token.word))&&<p className="answerChoiceHint">Слова открывают подсказку. Ответ подтверждает кнопка «Выбрать».</p>}<div className="options lookupOptions">{options.map(option=>{
    const state=feedback?(option===answer?'correct':option===selected?'wrong':''):'';
    const english=englishTokens(option).some(token=>token.word);
    return english?<div key={option} className={`lookupOption ${state}`}><div className="optionText"><EnglishText text={option}/></div><button type="button" className="chooseAnswer" disabled={disabled} aria-label={`Выбрать ответ: ${option}`} onClick={()=>onAnswer(option)}>{feedback&&option===answer?'Верный ответ':feedback&&option===selected?'Твой ответ':'Выбрать'}</button></div>:<button type="button" key={option} className={state} disabled={disabled} onClick={()=>onAnswer(option)}>{option}</button>;
  })}</div></>;
}

function WordCard({selection,onClose}) {
  const dialog=useRef(null);
  const card=useMemo(()=>buildWordCard(selection),[selection]);
  useEffect(()=>{
    const element=dialog.current;
    const previous=document.body?.style.overflow;
    if(document.body)document.body.style.overflow='hidden';
    element?.showModal?.();
    return()=>{element?.close?.();if(document.body)document.body.style.overflow=previous||'';};
  },[]);
  return <dialog ref={dialog} className="wordSheet" aria-labelledby="word-sheet-title" onCancel={event=>{event.preventDefault();onClose();}} onClick={event=>{if(event.target===event.currentTarget)onClose();}}>
    <div className="wordSheetInner"><header><div><small>ПЕРЕВОД И ПРИМЕРЫ</small><h2 id="word-sheet-title" lang="en">{card.word}</h2>{card.lemma!==card.word.toLowerCase()&&<p className="wordLemma">Начальная форма: <b lang="en">{card.lemma}</b></p>}</div><button type="button" className="closeWordSheet" onClick={onClose} aria-label="Закрыть перевод" autoFocus>×</button></header>
      <section className="wordMeaning"><TranslateButton key={card.word} text={card.word} ru={card.ru} auto label="Перевести слово"/>{card.note&&<p>{card.note}</p>}{card.definition&&<details><summary>Значение по-английски</summary><p lang="en">{card.definition}</p></details>}</section>
      {card.phrase&&<section className="wordPhrase"><h3>В этом выражении</h3><strong lang="en">{card.phrase.en}</strong><p>{card.phrase.ru}</p>{card.phrase.note&&<small>{card.phrase.note}</small>}</section>}
      {card.context.en&&<section className="wordContext"><h3>В твоём задании</h3><p lang="en">{card.context.en}</p><TranslateButton key={card.context.en} text={card.context.en} ru={card.context.ru} auto={Boolean(card.context.ru)} label="Перевести это предложение"/></section>}
      <section className="wordExamples"><h3>Примеры употребления</h3>{card.examples.length?card.examples.map((example,i)=><article key={example.en}><span className="exampleNumber">{i+1}</span><div><p lang="en">{example.en}</p><TranslateButton text={example.en} ru={example.ru} auto={Boolean(example.ru)} label="Перевести пример"/></div></article>):<p>Других примеров в курсе пока нет. Посмотри употребление в предложении выше.</p>}</section>
      <p className="wordSource">Встроенные объяснения и примеры — из курса. Остальные переводы: онлайн-сервис MyMemory; возможны неточности. Подсказка не выбирает ответ и не считается ошибкой.</p>
      <button type="button" className="primary big" onClick={onClose}>Вернуться к заданию</button>
    </div>
  </dialog>;
}
