import React,{useEffect,useRef,useState} from 'react';
import {microScene,examplesFor,guideFor} from './micro-lessons.js';
import {studyDuration} from './learning.js';
import {ScoreSummary} from './VocabularyLesson.jsx';

export function ShortPractice({draft,onStart,onGames,children}) {
 return <details className="quietExtras">
  <summary>Короткая практика и игры{draft ? ' · есть черновик' : ''}</summary>
  {draft ? <button className="secondary big" onClick={()=>onStart(draft.minutes)}>Продолжить короткую практику</button> :
    <div className="shortPracticeButtons">{[1,5].map(minutes =>
      <button key={minutes} className="secondary big" onClick={()=>onStart(minutes)}>{minutes===1?'1 минута':'5 минут'}</button>)}</div>}
  <button className="secondary big" onClick={onGames}>Игры и арена</button>
  {children}
 </details>;
}
export default function MicroLesson({session:s,onChange,onAnswer,onLearn,onNext,onFinish,onPause}) {
 const [value,setValue]=useState(s.input||''),callbacks=useRef({onChange,s}),active=useRef(Date.now()),last=useRef(Date.now());callbacks.current={onChange,s};
 useEffect(()=>{setValue(s.input||'');},[s.index]);
 useEffect(()=>{const hide=()=>{last.current=Date.now();};document.addEventListener('visibilitychange',hide);
 const timer=setInterval(()=>{const now=Date.now(),delta=Math.min(1500,now-last.current);last.current=now;const current=callbacks.current.s;if(document.hidden||now-active.current>45000||current.done)return;callbacks.current.onChange({...current,elapsedMs:Math.min(current.minutes*60000,current.elapsedMs+delta)});},1000);
 return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',hide);};},[s.id]);
 const scene=microScene(s),stage=s.stages[s.index],budget=s.elapsedMs>=s.minutes*60000;
 if(s.done)return <div className="app quietLesson lessonFinish"><h1>Короткая практика сохранена</h1><p>{scene.title} · {studyDuration(s.elapsedMs/1000,'0 сек')}</p>
  <ScoreSummary answers={s.answers.length} correct={s.answers.filter(a=>a.correct).length}/>
  {s.stages.some(step=>step.type==='reply')&&<p>Процент считается по заданиям с проверкой. Свободный ответ можно сравнить с примером.</p>}
  <button className="primary big" onClick={onPause}>На главную</button></div>;
 const example=stage.item?examplesFor(stage.item)[0]:null,guide=stage.item?guideFor(stage.item,example?.en):null;
 const next=()=>budget||s.index===s.stages.length-1?onFinish():onNext();
 return <div className="app quietLesson" onPointerDown={()=>active.current=Date.now()} onKeyDown={()=>active.current=Date.now()}><header><button className="quietButton" onClick={onPause}>Закрыть и сохранить</button><span>{s.index+1} / {s.stages.length}</span></header>
 <div className="quietProgress" aria-label="Пройдено шагов" role="progressbar" aria-valuenow={s.index+1} aria-valuemin={0} aria-valuemax={s.stages.length}><i style={{width:`${(s.index+1)/s.stages.length*100}%`}}/></div>
 <p className="quietLabel">{scene.title} · {s.level}</p>
 {budget&&<p className="quietBudget">Твое время на сегодня уже набралось — можно закончить.</p>}
 {stage.type==='story'&&<><h1>Небольшая переписка</h1>{s.returning&&<p>С возвращением. Сегодня будет меньше новых выражений и повторов.</p>}<div className="quietDialogue" lang="en">{scene.dialogue.map(line=><p key={line}>{line}</p>)}</div><details><summary>Смысл по-русски</summary><p>{scene.ru}</p></details><p>Цель: {scene.goal.toLowerCase()}.</p><button className="primary big" onClick={next}>Разберем выражение</button></>}
 {stage.type==='learn'&&<><p>{scene.ids[s.level].includes(stage.item.id)?"В этой ситуации пригодится":"Еще одно слово или выражение из твоего словаря"}</p><h1 lang="en">{stage.item.phrase}</h1><p className="quietMeaning">{stage.item.ru}</p>{example&&<blockquote><p lang="en">{example.en}</p><p>{example.ru}</p></blockquote>}<details><summary>Как это устроено</summary><p>{guide?.ru||stage.item.usageRu||'Запоминай выражение целиком и обращай внимание на пример.'}</p>{guide?.formula&&<p lang="en">{guide.formula}</p>}</details><button className="primary big" onClick={()=>{onLearn(stage.item);next();}}>Дальше</button></>}
 {stage.type==='recall'&&<><p>{stage.check?'Недельная мини-проверка':stage.review?'Короткое возвращение к знакомому':'Попробуй вспомнить без образца'}</p><h1>{stage.item.ru}</h1><p>Напиши изученное выражение по-английски. Сокращения допустимы.</p><form onSubmit={e=>{e.preventDefault();onAnswer(value);}}><label htmlFor="micro-answer">Твой ответ</label><input autoComplete="off" autoCapitalize="none" spellCheck={false} id="micro-answer" value={s.feedback?.value??value} disabled={Boolean(s.feedback)} onChange={e=>{setValue(e.target.value);onChange({...s,input:e.target.value});}}/>{!s.feedback&&<button className="primary big" disabled={!value.trim()} type="submit">Проверить</button>}</form>
 {s.feedback&&<div className={`quietFeedback ${s.feedback.correct?'correct':'wrong'}`} role="status"><strong>{s.feedback.correct?'Верно!':'Ответ не совпал с изученным выражением'}</strong><p lang="en">{stage.item.phrase}</p>{!s.feedback.correct&&<p>Это выражение появится в повторении.</p>}<button className="primary big" onClick={next}>{s.index===s.stages.length-1||budget?'На сегодня достаточно':'Дальше'}</button></div>}</>}
 {stage.type==='reply'&&<><h1>Теперь твое сообщение</h1><p>{scene.reply}</p><label htmlFor="micro-reply">Одно-два предложения по-английски</label><textarea id="micro-reply" value={s.reply||''} disabled={Boolean(s.feedback)} onChange={e=>onChange({...s,reply:e.target.value})}/>
 {!s.feedback?<button className="primary big" disabled={!s.reply?.trim()} onClick={()=>onChange({...s,feedback:{free:true}})}>Посмотреть пример и сравнить</button>:<div className="quietFeedback"><p>Один из вариантов ответа:</p><p lang="en">{{plans:'Seven works for me. Shall we meet outside the café?',late:'Sorry, I’m running ten minutes late. I’m on my way.',choice:'Could we go somewhere quieter? I’d like to talk.',clarify:'Which day next week works for you, and what time?',opinion:'The price is good, but it’s far from the centre. I’d rather stay somewhere closer.',uncertain:'I’m not sure yet. Can I let you know tomorrow?'}[scene.id]}</p><p>Это самопроверка. Сравни со своим ответом: другой вариант тоже может быть правильным. Автоматической оценки смысла здесь нет.</p><button className="primary big" onClick={onFinish}>На сегодня достаточно</button></div>}</>}
 <button className="quietButton big" onClick={onFinish}>Закончить сейчас</button></div>;
}
