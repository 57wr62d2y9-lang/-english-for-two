import React,{useEffect,useRef,useState} from 'react';
import {normaliseSpeakingMode} from './quiet-speaking.js';
import {TranslateButton} from './ExerciseHelp.jsx';
import {EnglishText} from './WordLookup.jsx';

export function SpeakingModeChoice({mode,onChange}) {
  const quiet=normaliseSpeakingMode(mode)==='quiet';
  return <div className="speakingModeChoice"><div className="segmented two" aria-label="Режим речевой практики"><button type="button" aria-pressed={quiet} className={quiet?'active':''} onClick={()=>onChange('quiet')}>В автобусе · без голоса</button><button type="button" aria-pressed={!quiet} className={!quiet?'active':''} onClick={()=>onChange('aloud')}>Дома · вслух</button></div><p>{quiet?'Слушай в наушниках и формулируй ответы про себя. Микрофон не нужен.':'Отвечай вслух, когда удобно. Можно в любой момент выбрать тихий режим.'}</p></div>;
}

export function MediaPrompt({task,ready,onOpen,onReady,onSkip}) {
  const [loaded,setLoaded]=useState(false);
  const lesson=task.lesson;
  return <section className="mediaBlock"><h1><EnglishText text={lesson.title}/></h1><p>{lesson.note}</p>
    {task.quiet&&<p className="quietStudyNote">Наушники → 3 вопроса → короткий ответ про себя. Говорить вслух не требуется.</p>}
    {lesson.youtubeId&&<>{loaded?<iframe className="lessonVideo" src={`https://www.youtube-nocookie.com/embed/${lesson.youtubeId}?playsinline=1`} title={lesson.title} allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen/>:<button className="secondary big" onClick={()=>{setLoaded(true);onOpen();}}>Загрузить YouTube-видео в уроке</button>}<p className="helper">Звук включается только после нажатия Play в плеере.</p></>}
    <a className="audioLink" href={lesson.url} onClick={onOpen} target="_blank" rel="noreferrer">{lesson.youtubeId?'Открыть в YouTube':task.type==='video'?'Смотреть учебную сцену':'Слушать запись'} · {lesson.source} ↗</a>
    {lesson.transcriptUrl&&<a className="ruleLink" href={lesson.transcriptUrl} onClick={onOpen} target="_blank" rel="noreferrer">Страница с видео, субтитрами и расшифровкой ↗</a>}
    <small>Один материал → {task.questionCount} вопроса. Можно переслушивать и пользоваться субтитрами.</small>
    {!ready&&<><button className="primary big" onClick={onReady}>Готово — перейти к вопросам</button><button className="quietButton" onClick={onSkip}>Нет наушников или видео не открывается</button></>}
  </section>;
}

export default function SpeakingPractice({task,onComplete,completed,mode,onModeChange,draft,onDraftChange,onVideo}) {
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
    {task.listeningUnavailable&&<p className="quietStudyNote">Видео пропущено без штрафа. Подготовь свой ответ на вопрос выше. Вопросов по непрослушанной записи не будет.</p>}
    <p className="rehearsalInstruction">{quiet?'Сначала сформулируй ответ про себя. При желании запиши 2–3 опорные мысли по-английски.':'Сформулируй ответ вслух. Запись голоса и доступ к микрофону не требуются.'}</p>
    <div className="rehearsalPlan"><strong>План ответа</strong><p>{task.structureRu || task.ru}</p><p lang="en"><EnglishText text={task.structure}/></p></div>
    <label htmlFor="speaking-notes">Опорные слова или твой ответ · необязательно</label>
    <textarea id="speaking-notes" value={notes} maxLength={1200} disabled={completed} placeholder="First… Then… Because…" autoCapitalize="sentences" onChange={event=>onDraftChange({key:task.key,notes:event.target.value,remaining})}/>
    <div className="rehearsalTimer"><span>{remaining} сек · ориентир, не обязательное ожидание</span><button type="button" className="secondary" onClick={()=>setRunning(!running)} disabled={completed||remaining===0}>{running?'Пауза':'Включить таймер'}</button></div>
    {task.model&&<details><summary>Пример ответа и перевод</summary><p lang="en"><EnglishText text={task.model} ru={task.modelRu}/></p><TranslateButton text={task.model} ru={task.modelRu || ''} label="Перевести пример"/><button type="button" className="secondary" onClick={listen}>Слушать пример · голос устройства</button></details>}
    <p className="helper">Это подготовка связного ответа, не проверка произношения. Баллы дают проверяемые задания урока; мысленный ответ не снижает точность.</p>
    <button className="primary big" onClick={()=>{setRunning(false);window.speechSynthesis?.cancel();onComplete();}} disabled={completed}>{quiet?'Сформулировал ответ про себя':'Ответил вслух'}</button>
    {!completed&&!task.quietRehearsal&&<button className="quietButton" onClick={()=>{setRunning(false);window.speechSynthesis?.cancel();if(!onVideo())setMessage('Все доступные видео этого уровня уже были в уроке. Сейчас можно подготовить ответ про себя.');}}>Вместо этого — видео и 3 вопроса</button>}
    {message&&<p role="status">{message}</p>}
  </section>;
}
