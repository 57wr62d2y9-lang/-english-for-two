import React,{useEffect,useRef,useState} from 'react';
import {dailyAdventure,championship,answerSpeedRound,createSpeedRound} from './arcade.js';
import {attendanceProgress} from './rewards.js';
const ruName=name=>name==='Anna'?'Аня':name==='Artur'?'Артур':name||'Партнёр';

export function ChampionBelt({label='Чемпион недели'}) {
  return <div className="championBelt" role="img" aria-label={label}><span>★</span><strong><small>ENGLISH FOR TWO</small>CHAMPION<small>★ ★ ★</small></strong><span>★</span></div>;
}

export function DailyDraw({name,stats,wallet,onClose,onStart,time}) {
  const plan=dailyAdventure(name,time),[stage,setStage]=useState('ready'),dialogRef=useRef(null);
  const attended=attendanceProgress(stats,wallet,time);
  useEffect(()=>{
    const previous=globalThis.document?.activeElement,node=dialogRef.current;
    node?.querySelector('button')?.focus();
    const trap=event=>{if(event.key==='Escape'){onClose();return;}if(event.key!=='Tab'||!node)return;
      const buttons=[...node.querySelectorAll('button:not(:disabled)')],first=buttons[0],last=buttons.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}};
    node?.addEventListener('keydown',trap);return()=>{node?.removeEventListener('keydown',trap);previous?.focus?.();};
  },[]);
  useEffect(()=>{if(stage!=='spinning')return;const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;const timer=setTimeout(()=>setStage('result'),reduced?50:1100);return()=>clearTimeout(timer);},[stage]);
  return <div className="drawBackdrop"><section ref={dialogRef} className="dailyDraw" role="dialog" aria-modal="true" aria-labelledby="draw-title">
    <button className="drawClose iconButton" aria-label="Закрыть план дня" onClick={onClose}>×</button>
    <div className="eyebrow">ТВОЙ ДЕНЬ В ENGLISH FOR TWO</div><h1 id="draw-title">{stage==='result'?plan.title:'Что сыграем сегодня?'}</h1>
    <div className={`dailyWheel ${stage==='spinning'?'spinning':stage==='result'?'revealed':''}`} style={{'--wheel-stop':`${{recall:0,context:120,mix:240}[plan.id]}deg`}} aria-hidden="true"><div className="wheelDisc"><span>Вспомни</span><span>Примени</span><span>Выбери</span></div><b>{stage==='result'?plan.icon:'✦'}</b></div>
    <p className="drawVisit">Вход сегодня засчитан ✓<br/><small>{attended.rewardedToday?'Бонус $10 уже в копилке':`${attended.days} из 30 дней к бонусу $10`} · не обнуляется при пропуске</small></p>
    {stage==='result'?<><p>{plan.description}. Три мини-раунда по 4 ответа.</p><ul className="dailyMissions"><li>12 заданий · короткий маршрут</li><li>60 секунд · твои повторы</li><li>60 секунд · арена пары</li><li>Контрольная доступна каждую неделю</li></ul><button className="primary big" onClick={onStart}>Начать маршрут →</button><button className="quietButton" onClick={onClose}>Выбрать другой режим</button></>:
      <><p>Колесо выберет акцент заданий дня. План один на день, повторный вход его не меняет.</p><button className="primary big" disabled={stage==='spinning'} onClick={()=>setStage('spinning')}>{stage==='spinning'?'Выбираем…':'Крутить колесо'}</button></>}
  </section></div>;
}

export function AdventureHub({name,stats,wallet,paired,syncError,weekly,hasDraft,onDraw,onAdventure,onSpeed,onCheck,time}) {
  const plan=dailyAdventure(name,time),league=championship(stats,wallet.partner,time);
  const won=league.winner==='self'?ruName(name):league.winner==='partner'?ruName(wallet.partner?.name):league.winner==='tie'?'Оба чемпионы':null;
  return <section className="adventureHub">
    <div className="adventureHeading"><div><div className="eyebrow">СЕГОДНЯ ИГРАЕМ</div><h2>{plan.title}</h2></div><button className="wheelMini" aria-label="Открыть колесо дня" onClick={onDraw}>✦</button></div>
    <p>{plan.description}. Короткие раунды — в твоём темпе.</p>
    <button className="primary big" onClick={onAdventure}>{hasDraft?'Продолжить сохранённое занятие':'Маршрут дня · 12 заданий →'}</button>
    <div className="speedLaunchers"><button onClick={()=>onSpeed('review')}><b>ϟ Мои повторы</b><span>60 секунд · знакомые карточки</span></button><button onClick={()=>onSpeed('arena')}><b>★ Арена пары</b><span>60 секунд · побей рекорд</span></button></div>
    <section className="weeklyArena"><div className="eyebrow">ПОЯС НЕДЕЛИ · ПН–ВС</div><ChampionBelt/>
      <div className="arenaScores"><div><span>{ruName(name)}</span><strong>{league.current.own?.score??'—'}</strong><small>твой рекорд</small></div><i>VS</i><div><span>{ruName(wallet.partner?.name)||'Партнёр'}</span><strong>{league.current.other?.score??'—'}</strong><small>{paired?'рекорд партнёра':'свяжи кабинеты'}</small></div></div>
      <p className="leagueWinner">{won?`Пояс за прошлую неделю: ${won} 🏆`:league.winner==='pending'&&paired?'Итог прошлой недели — после обновления кабинета партнёра':league.winner==='none'?'Новая неделя — новый пояс. Сделай первую попытку!':'Личный рекорд сохраняется. Для пояса свяжите кабинеты.'}</p>
      {syncError&&<p className="errorText">Рекорд сохранён на устройстве. Сравнение обновится после восстановления связи.</p>}
      <details><summary>Правила арены</summary><p>Одинаковые 60 секунд и общая колода базовых слов A2 для обоих. Верный ответ +10, ошибка −8; итог не ниже нуля. Колода и порядок одинаковы всю неделю, попыток сколько угодно — учитывается лучшая.</p><p>При равных очках сравниваем точность, затем лучшую серию без ошибок. Полная ничья — два чемпиона. После воскресенья пояс показывается за завершённую неделю, когда оба кабинета обновились. Это виртуальная награда, без дополнительного списания или начисления денег.</p><p>В «Моих повторах» — твои знакомые слова и фразы. Этот рекорд не участвует в общей арене. Скоростной выбор не заменяет письменное закрепление и не оплачивается как отдельный урок.</p></details>
    </section>
    <button className={`weeklyCheckButton ${weekly?'':'complete'}`} disabled={!weekly&&!hasDraft} onClick={onCheck}><span>{weekly?'Контрольная этой недели':'Контрольная недели пройдена ✓'}</span><b>{weekly?`${weekly.count} вопросов · до $5 →`:'Следующая — в понедельник'}</b></button>
  </section>;
}

export function SpeedRound({initial,onFinish,onBack}) {
  const [round,setRound]=useState(initial),[now,setNow]=useState(Date.now()),[feedback,setFeedback]=useState(null),[started,setStarted]=useState(false);
  const ref=useRef(initial),settled=useRef(false),unlock=useRef(0);
  function finish(aborted=false) {if(settled.current)return;settled.current=true;onFinish(ref.current,{aborted});}
  useEffect(()=>{if(!started)return;const tick=setInterval(()=>{const time=Date.now();setNow(time);if(time>=ref.current.deadline)finish();},100);
    const hide=()=>{if(document.hidden)finish(true);};document.addEventListener('visibilitychange',hide);return()=>{clearInterval(tick);document.removeEventListener('visibilitychange',hide);};},[started]);
  useEffect(()=>{if(!feedback)return;const timer=setTimeout(()=>setFeedback(null),450);return()=>clearTimeout(timer);},[feedback]);
  if(!started)return <div className="app speedIntro"><div className="eyebrow">{initial.mode==='arena'?'АРЕНА ПАРЫ':'МОИ ПОВТОРЫ'}</div><h1>Есть 60 секунд?</h1><div className="speedClock">60</div><p>Выбирай перевод. Верно — <b>+10</b>, ошибка — <b>−8</b>. Бей личный рекорд и собирай серии без ошибок.</p><p className="helper">{initial.mode==='arena'?'Общая колода A2, одинаковая для вас обоих. Лучший результат недели участвует в борьбе за пояс.':'Только слова и фразы, которые уже встречались в твоих уроках. Без изменения закрепления и расписания повторений.'}</p><p className="helper">Если свернуть приложение или выйти, попытка не попадёт в рекорды. Денежная награда за спринт не начисляется.</p><button className="primary big" onClick={()=>{const time=Date.now(),next=initial.mode==='arena'?createSpeedRound('arena',initial.level,{},time):{...ref.current,startedAt:time,deadline:time+60000,lastAnswerAt:time};ref.current=next;setRound(next);setNow(time);setStarted(true);}}>Поехали!</button><button className="quietButton" onClick={onBack}>Не сейчас</button></div>;
  const task=feedback?.task||round.questions[round.index%round.questions.length],seconds=Math.max(0,Math.ceil((round.deadline-now)/1000));
  function submit(value) {const time=Date.now();if(time<unlock.current)return;if(time>=ref.current.deadline){finish();return;}
    const current=ref.current,next=answerSpeedRound(current,value,time);if(next===current)return;unlock.current=time+450;
    const ok=next.correct>current.correct;setFeedback({ok,task,text:ok?'+10 · Верно!':`−8 · ${task.answer}`});ref.current=next;setRound(next);
  }
  return <div className="speedGame"><header><button className="iconButton" aria-label="Прервать скоростной раунд" onClick={()=>finish(true)}>×</button><span className={seconds<=10?'speedTimer urgent':'speedTimer'}>{seconds}<small>сек</small></span><strong>{round.score}<small>очков</small></strong></header>
    <div className="speedTimeTrack" role="progressbar" aria-label="Осталось времени" aria-valuenow={seconds} aria-valuemin={0} aria-valuemax={60}><i style={{width:seconds/60*100+'%'}}/></div>
    <main><div className="speedCombo">{round.streak>=3?`🔥 Серия ${round.streak}`:'Найди значение'}</div><h1 lang="en">{task.prompt}</h1><div className="speedOptions">{task.options.map(option=><button key={option} disabled={Boolean(feedback)} onClick={()=>submit(option)}>{option}</button>)}</div><p className={`speedFeedback ${feedback?.ok?'correct':'wrong'}`} role="status">{feedback?.text||' '}</p></main>
    <footer>✓ {round.correct} верных · × {round.wrong} ошибок · рекорд серии {round.bestStreak}</footer>
  </div>;
}

export function SpeedResult({round,onAgain,onHome}) {
  const mistakes=round.answers.filter(a=>!a.correct).filter((a,i,all)=>all.findIndex(b=>b.id===a.id)===i);
  return <div className="app speedResult"><div className="eyebrow">{round.completed?round.newBest?'НОВЫЙ ЛИЧНЫЙ РЕКОРД':'РАУНД ЗАВЕРШЁН':'РАУНД ПРЕРВАН'}</div><h1>{round.score}<small>очков</small></h1><p>{round.completed?round.mode==='arena'?'Результат сохранён для арены этой недели.':'Результат личных повторов сохранён.':'Рекорд не засчитан: для честного сравнения нужны полные 60 секунд без выхода.'}</p><div className="speedResultStats"><span><b>{round.correct}</b>верных</span><span><b>{round.wrong}</b>ошибок</span><span><b>{round.bestStreak}</b>лучшая серия</span></div>
    {mistakes.length>0&&<details className="speedMistakes" open><summary>Что повторить · {mistakes.length}</summary>{mistakes.map(item=><p key={item.id}><b lang="en">{item.en}</b><span>{item.ru}</span></p>)}</details>}
    <button className="primary big" onClick={onAgain}>Попробовать ещё →</button><button className="quietButton" onClick={onHome}>На главную</button><small>Спринт не меняет закрепление слов и не начисляет деньги.</small></div>;
}
