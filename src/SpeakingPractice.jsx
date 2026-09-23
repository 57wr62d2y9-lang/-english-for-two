import React,{useEffect,useRef,useState} from 'react';
import {TranslateButton} from './ExerciseHelp.jsx';
import {EnglishText} from './WordLookup.jsx';

export default function SpeakingPractice({task,onComplete,completed,draft,onDraftChange}) {
  const saved=draft?.key===task.key?draft:null;
  const remaining=Number.isFinite(saved?.remaining)?saved.remaining:task.seconds;
  const notes=saved?.notes || '';
  const [running,setRunning]=useState(false),[message,setMessage]=useState('');
  const timerState=useRef(null);timerState.current={remaining,notes,onDraftChange};
  useEffect(()=>{
    if(!running||completed)return;
    const timer=setInterval(()=>{const state=timerState.current;if(!document.hidden&&state.remaining>0)state.onDraftChange({key:task.key,remaining:state.remaining-1,notes:state.notes});},1000);
    return()=>clearInterval(timer);
  },[running,completed,task.key]);
  useEffect(()=>()=>{window.speechSynthesis?.cancel();},[]);
  function listen() {
    if(!window.speechSynthesis||!window.SpeechSynthesisUtterance){setMessage('Голос устройства недоступен. Пример можно прочитать ниже.');return;}
    window.speechSynthesis.cancel();const utterance=new window.SpeechSynthesisUtterance(task.model);utterance.lang='en-GB';utterance.rate=.85;
    utterance.onerror=()=>setMessage('Не удалось включить голос. Пример остаётся на экране.');window.speechSynthesis.speak(utterance);
  }
  return <section className="speakingPractice">
    {task.sourceTitle&&<p>По материалу «{task.sourceTitle}»</p>}
    <p className="rehearsalInstruction">Сначала сформулируй ответ про себя. При желании запиши 2–3 опорные мысли по-английски.</p>
    <div className="rehearsalPlan"><strong>План ответа</strong><p>{task.structureRu || task.ru}</p><p lang="en"><EnglishText text={task.structure}/></p></div>
    <label htmlFor="speaking-notes">Опорные слова или твой ответ · необязательно</label>
    <textarea id="speaking-notes" value={notes} maxLength={1200} disabled={completed} placeholder="First… Then… Because…" autoCapitalize="sentences" onChange={event=>onDraftChange({key:task.key,notes:event.target.value,remaining})}/>
    <div className="rehearsalTimer"><span>{remaining} сек · ориентир, не обязательное ожидание</span><button type="button" className="secondary" onClick={()=>setRunning(!running)} disabled={completed||remaining===0}>{running?'Пауза':'Включить таймер'}</button></div>
    {task.model&&<details><summary>Пример ответа и перевод</summary><p lang="en"><EnglishText text={task.model} ru={task.modelRu}/></p><TranslateButton text={task.model} ru={task.modelRu || ''} label="Перевести пример"/><button type="button" className="secondary" onClick={listen}>Слушать пример · голос устройства</button></details>}
    <p className="helper">Это подготовка связного ответа, не проверка произношения. Баллы дают проверяемые задания урока; мысленный ответ не снижает точность.</p>
    <button className="primary big" onClick={()=>{setRunning(false);window.speechSynthesis?.cancel();onComplete();}} disabled={completed}>Сформулировал ответ про себя</button>
    {message&&<p role="status">{message}</p>}
  </section>;
}
