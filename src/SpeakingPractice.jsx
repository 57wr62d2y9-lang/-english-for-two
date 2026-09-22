import React,{useEffect,useRef,useState} from 'react';
import {normaliseSpeakingMode} from './quiet-speaking.js';
import {TranslateButton} from './ExerciseHelp.jsx';
import {EnglishText} from './WordLookup.jsx';

export function SpeakingModeChoice({mode,onChange}) {
  const quiet=normaliseSpeakingMode(mode)==='quiet';
  return <div className="speakingModeChoice"><div className="segmented two" aria-label="Режим речевой практики"><button type="button" aria-pressed={quiet} className={quiet?'active':''} onClick={()=>onChange('quiet')}>В автобусе · без голоса</button><button type="button" aria-pressed={!quiet} className={!quiet?'active':''} onClick={()=>onChange('aloud')}>Дома · вслух</button></div><p>{quiet?'Читай примеры и проговаривай их про себя. Ни наушники, ни микрофон не нужны.':'Отвечай вслух, когда удобно. Можно в любой момент выбрать тихий режим.'}</p></div>;
}

export default function SpeakingPractice({task,onComplete,completed,mode,onModeChange,draft,onDraftChange}) {
  const quiet=normaliseSpeakingMode(mode)==='quiet';
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
    <SpeakingModeChoice mode={mode} onChange={value=>{setRunning(false);window.speechSynthesis?.cancel();onModeChange(value);}}/>
    {task.sourceTitle&&<p>По материалу «{task.sourceTitle}»</p>}
    <p className="rehearsalInstruction">{quiet?'Сначала сформулируй ответ про себя. При желании запиши 2–3 опорные мысли по-английски.':'Сформулируй ответ вслух. Запись голоса и доступ к микрофону не требуются.'}</p>
    <div className="rehearsalPlan"><strong>План ответа</strong><p>{task.structureRu || task.ru}</p><p lang="en"><EnglishText text={task.structure}/></p></div>
    <label htmlFor="speaking-notes">Опорные слова или твой ответ · необязательно</label>
    <textarea id="speaking-notes" value={notes} maxLength={1200} disabled={completed} placeholder="First… Then… Because…" autoCapitalize="sentences" onChange={event=>onDraftChange({key:task.key,notes:event.target.value,remaining})}/>
    <div className="rehearsalTimer"><span>{remaining} сек · ориентир, не обязательное ожидание</span><button type="button" className="secondary" onClick={()=>setRunning(!running)} disabled={completed||remaining===0}>{running?'Пауза':'Включить таймер'}</button></div>
    {task.model&&<details><summary>Пример ответа и перевод</summary><p lang="en"><EnglishText text={task.model} ru={task.modelRu}/></p><TranslateButton text={task.model} ru={task.modelRu || ''} label="Перевести пример"/><button type="button" className="secondary" onClick={listen}>Слушать пример · голос устройства</button></details>}
    <p className="helper">Это подготовка связного ответа, не проверка произношения. Баллы дают проверяемые задания урока; мысленный ответ не снижает точность.</p>
    <button className="primary big" onClick={()=>{setRunning(false);window.speechSynthesis?.cancel();onComplete();}} disabled={completed}>{quiet?'Сформулировал ответ про себя':'Ответил вслух'}</button>
    {message&&<p role="status">{message}</p>}
  </section>;
}
