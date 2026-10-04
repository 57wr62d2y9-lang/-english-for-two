import React,{useState} from 'react';
import {WordHelpProvider,EnglishText} from './WordLookup.jsx';
import {TranslateButton} from './InlineTranslation.jsx';
import {examplesFor} from './lesson-notes.js';
import Mountain from './Mountain.jsx';

export function TextAnswer({onSubmit,disabled,sentence=false}) {
  const [value,setValue]=useState('');
  return <form className="typedAnswer" onSubmit={e=>{e.preventDefault();if(value.trim())onSubmit(value);}}>
    {sentence?<textarea aria-label="Предложение по-английски" rows={3} value={value} onChange={e=>setValue(e.target.value)} placeholder="Напиши перевод целиком" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} disabled={disabled}/>:<input aria-label="Ответ по-английски" value={value} onChange={e=>setValue(e.target.value)} placeholder="Напиши по-английски" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} disabled={disabled}/>}
    <button className="primary" disabled={disabled||!value.trim()}>Проверить</button>
  </form>;
}

export function OrderAnswer({task,onSubmit,disabled}) {
  const [chosen,setChosen]=useState([]),[lookup,setLookup]=useState(false);
  const available=task.tokens.filter(token=>!chosen.includes(token.id));
  return <div className="orderTask"><div className="segmented two orderMode">
    <button type="button" aria-pressed={!lookup} className={!lookup?'active':''} onClick={()=>setLookup(false)}>Собрать предложение</button>
    <button type="button" aria-pressed={lookup} className={lookup?'active':''} onClick={()=>setLookup(true)}>Перевод слов</button>
  </div><div className="sentenceAssembly">{chosen.length?chosen.map(id=>{const token=task.tokens.find(t=>t.id===id);return lookup?<span className="orderLookupToken" key={id}><EnglishText text={token.text}/></span>:<button type="button" key={id} disabled={disabled} onClick={()=>setChosen(chosen.filter(v=>v!==id))}>{token.text}</button>}):<span>Нажимай на слова по порядку</span>}</div>
    <div className="wordBank">{available.map(token=>lookup?<span className="orderLookupToken" key={token.id}><EnglishText text={token.text}/></span>:<button type="button" key={token.id} disabled={disabled} onClick={()=>setChosen([...chosen,token.id])}>{token.text}</button>)}</div>
    <button className="primary" disabled={disabled||available.length>0} onClick={()=>onSubmit(chosen.map(id=>task.tokens.find(t=>t.id===id).text).join(' '))}>Проверить предложение</button>
  </div>;
}

function Examples({examples=[]}) {
  const [index,setIndex]=useState(0),example=examples[index%Math.max(1,examples.length)];
  if(!example)return null;
  return <section className="compactExample"><div className="exampleHeading"><small>В жизни</small>{examples.length>1&&<div>{examples.map((_,i)=><button key={i} type="button" aria-label={`Пример ${i+1}`} aria-pressed={i===index} className={i===index?'active':''} onClick={()=>setIndex(i)}>{i+1}</button>)}</div>}</div>
    <p lang="en"><EnglishText text={example.en} ru={example.ru}/></p>
    {example.ru?<p lang="ru">{example.ru}</p>:<TranslateButton text={example.en}/>}
  </section>;
}

function Sound({text}) {
  const [message,setMessage]=useState('');
  function play(){if(!globalThis.speechSynthesis){setMessage('Озвучивание недоступно');return;}
    const voice=new SpeechSynthesisUtterance(text);voice.lang='en-GB';voice.rate=.85;voice.onerror=()=>setMessage('Не удалось включить звук');speechSynthesis.cancel();speechSynthesis.speak(voice);}
  return <><button type="button" className="soundButton" onClick={play} aria-label="Послушать произношение">◖</button>{message&&<small role="status">{message}</small>}</>;
}

const taskName={recognition:'Значение',meaning:'Смысл в ситуации',context:'Заполни пропуск',recall:'Вспомни по-английски',write:'Напиши предложение',order:'Напиши предложение'};
function RuleNote({rule}) {return rule?<details className="sentenceRule"><summary>Как построить предложение · {rule.title}</summary><strong>{rule.formula}</strong><p>{rule.ru}</p><small>Здесь только правило, без готового ответа.</small></details>:null;}

export default function Lesson({session,ascent,course,onIntro,onKnown,onAnswer,onNext,onFinish,onBack,onHome,onHint,onMore,onAddNew}) {
  if(session.done)return <div className="app lessonFinish"><div className="eyebrow">УРОК СОХРАНЁН</div><h1>Практика сохранена</h1>
    <Mountain level={session.level} ascent={ascent} course={course} celebrate reward={(session.routineReward||0)+(session.attendanceReward||0)} climb={session.climb}/>
    <div className="resultSummary"><div><strong>{session.correct}/{session.answers}</strong><span>Верных ответов</span></div><div><strong>+${(session.routineReward||0)+(session.attendanceReward||0)}</strong><span>В копилку</span></div></div>
    <p>{session.rewardAlready?'Награда за эту часть дня уже получена. Ответы сохранены.':session.rewardReasons?.join(' · ')}</p>
    {session.attendanceReward>0&&<p className="bonusNotice" role="status">+${session.attendanceReward} за 30 дней подряд с входом в приложение!</p>}
    <button className="primary big" onClick={onHome}>На главную</button><button className="quietButton" onClick={onMore}>Ещё один урок</button></div>;
  const task=session.task,seconds=Math.max(0,Math.ceil(session.remainingMs/1000)),intro=task?.type==='intro';
  return <WordHelpProvider key={session.id+':'+session.step} level={session.level} onHint={onHint} enabled={intro||Boolean(session.feedback)}><div className="compactLesson">
    <header className="compactTopbar"><button className="iconButton" onClick={onBack} aria-label="Сохранить урок и выйти">×</button><div className="sessionProgress"><i style={{width:Math.min(100,100-session.remainingMs/session.plannedMs*100)+'%'}}/></div><span className="compactTimer">{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</span></header>
    <main className={`compactCard ${task?.item?.phrase?.length>32?'compactLong':''}`} key={session.id+':'+session.step}>
      {!task?<><span className="eyebrow">ПОДБОРКА ПРОЙДЕНА</span><h1>Отличная работа!</h1><p>Ответы сохранены. Повторы вернутся в назначенные дни.</p>
        {session.moreAvailable?<p>На уровне ещё есть новые слова — можно продолжить сейчас.</p>:<p>На сегодня все доступные карточки пройдены. Можно подвести итог урока.</p>}
        <div className="compactExample"><strong>{session.answers} ответов за урок</strong><p>Ошибки не отменяют награду. Для завершённой подборки нужно минимум {session.minutes<=5?3:5} ответов.</p></div></>:
      intro?<><span className="eyebrow">{task.item.kind==='word'?'НОВОЕ СЛОВО':'НОВАЯ ФРАЗА'} · {session.level}</span>
        <div className="phraseLine"><h1><EnglishText text={task.item.phrase} ru={task.item.ru}/></h1><Sound text={task.item.phrase}/></div>
        <p className="compactMeaning">{task.item.ru}</p>
        {(task.item.explanationRu||task.item.usageRu)&&<details className="compactUsage"><summary>Когда так говорят</summary><p>{task.item.explanationRu||task.item.usageRu}</p></details>}
        <Examples examples={task.examples?.length?task.examples:examplesFor(task.item)}/>
        <small className="compactLookupHint">Нажми на английское слово для перевода.</small>
      </>:session.feedback?<><span className={'feedbackTitle '+session.feedback}>{session.feedback==='correct'?'Верно!':task.type==='write'?'Сравним с учебным вариантом':'Запомним правильный ответ'}</span>
        {session.feedback==='wrong'&&<p className="compactYourAnswer">Твой ответ: {session.selected}</p>}
        <h1 className="feedbackAnswer"><EnglishText text={['write','order','context'].includes(task.type)?task.answer:task.item.phrase} ru={['write','order'].includes(task.type)?task.prompt:task.item.ru}/></h1>
        <p className="compactMeaning">{['write','order'].includes(task.type)?task.prompt:task.item.ru}</p>
        {task.type==='write'&&<RuleNote rule={task.rule}/>}
        {task.guide?.ru&&<details className="compactUsage"><summary>Почему так говорят</summary><strong>{task.guide.formula}</strong><p>{task.guide.ru}</p></details>}
        <Examples examples={task.examples?.length?task.examples:examplesFor(task.item)}/>
        {session.feedback==='wrong'&&<p className="compactRecovery">Повторим после других карточек. {task.type==='write'?'Это учебный образец, а не единственный возможный перевод. Полный и сокращенный варианты равнозначны.':'Полная и сокращённая формы равнозначны.'}</p>}
      </>:<><span className="eyebrow">{taskName[task.type]} · {session.level}</span>
        {task.recovery&&<small className="recoveryTag">Повтор после ошибки</small>}
        <h1 className="compactPrompt">{task.prompt}</h1>
        <p className="compactInstruction">{task.instruction || 'Выбери перевод именно показанного слова или выражения.'}</p>
        {task.type==='write'&&<RuleNote rule={task.rule}/>}
        {['recall','write','order','context'].includes(task.type)?<TextAnswer sentence={['write','order'].includes(task.type)} onSubmit={onAnswer}/>:<div className="options">{task.options.map(option=><button type="button" key={option} onClick={()=>onAnswer(option)}>{option}</button>)}</div>}
      </>}
    </main>
    <footer className="compactActions">
      {!task?<><button className="primary" onClick={onFinish}>Завершить урок</button>{session.moreAvailable&&<button className="secondary" onClick={onAddNew}>Ещё новые слова</button>}</>:
      <>{intro?<button className="primary" onClick={()=>onIntro(false)}>Потренировать →</button>:session.feedback?<button className="primary" onClick={onNext}>{seconds===0?'Завершить урок':'Дальше →'}</button>:null}
        <button type="button" className="knownButton" onClick={()=>onKnown?onKnown():onIntro(true)}>Очень хорошо знаю · повтор через 35 дней</button></>}
      <button className="compactFinishLink" onClick={onFinish}>Завершить сейчас</button>
    </footer>
  </div></WordHelpProvider>;
}

export function CheckScreen({value,onAnswer,onNext,onDone,onBack}) {
  if(value.done)return <div className="app lessonFinish"><h1>{value.score} / {value.tasks.length}</h1><p>{value.passed?'Контрольная пройдена!':'Повторим трудные карточки и попробуем ещё раз.'}</p>
    <p>Занятие за эту часть дня засчитано.</p>{value.awarded>0&&<p className="bonusNotice" role="status">+${value.awarded} в копилку{!value.quarter&&value.level==='A2'?' за завершение программы A2':''}!</p>}
    {(value.responses||[]).filter(r=>!r.correct).length>0&&<section className="checkMistakes"><h2>Разбор после проверки</h2>{value.responses.filter(r=>!r.correct).map(r=>{const task=value.tasks[r.index];return <article key={r.index}><strong>{task.item.phrase}</strong><p>{task.item.ru}</p><p lang="en">Учебный ответ: {task.answer}</p><small>Твой ответ: {r.value}</small><RuleNote rule={task.rule}/></article>;})}<p className="helper">Ошибки сохранены и вернутся в следующих уроках.</p></section>}
    <button className="primary big" onClick={onDone}>На главную</button></div>;
  const task=value.tasks[value.index],answered=value.selected!==undefined;
  return <WordHelpProvider key={value.id+':'+value.index} level={value.level} enabled={false}><div className="compactLesson checkpointLesson">
    <header className="compactTopbar"><button className="iconButton" onClick={onBack} aria-label="Сохранить контрольную и выйти">×</button><div className="sessionProgress"><i style={{width:(value.index/value.tasks.length*100)+'%'}}/></div><span>{value.index+1}/{value.tasks.length}</span></header>
    <main className="compactCard"><span className="eyebrow">{value.quarter?`${value.retest?'ПОВТОРНАЯ ПРОВЕРКА':'КОНТРОЛЬНАЯ'} ${value.quarter}`:'ИТОГ СЛОВАРЯ'} · {value.level}</span><h1 className="compactPrompt">{task.prompt}</h1>
      <p className="compactInstruction">{task.instruction || (task.type==='recall'?'Напиши по-английски. Полная и сокращённая формы подходят.':'Выбери правильное значение.')}</p>
      {['recall','write','context'].includes(task.type)?<TextAnswer sentence={task.type==='write'} disabled={answered} onSubmit={onAnswer}/>:<div className="options">{task.options.map(option=><button key={option} disabled={answered} onClick={()=>onAnswer(option)}>{option}</button>)}</div>}
      {answered&&<p className="checkSaved">Ответ сохранён. Разбор ошибок — после контрольной.</p>}
    </main><footer className="compactActions">{answered&&<button className="primary" onClick={onNext}>{value.index+1===value.tasks.length?'Завершить контрольную':'Дальше →'}</button>}<small>Проходной результат: {Math.ceil(value.tasks.length*.8)} из {value.tasks.length}. Прогресс сохраняется.</small></footer>
  </div></WordHelpProvider>;
}
