import React,{useEffect,useRef,useState} from 'react';
import {dailyAdventure,championship,answerSpeedRound} from './arcade.js';
import {attendanceProgress} from './rewards.js';
import {WHEEL_PRIZES,dailyWheelReward,wheelPrize,wheelCollection} from './daily-wheel.js';
import {PrizeIcon,DateCollection,datePartnerName} from './DateCollection.jsx';
const ruName=name=>name==='Anna'?'Аня':name==='Artur'?'Артур':name||'Партнёр';

export function ChampionBelt({label='Чемпион недели'}) {
  return <div className="championBelt" role="img" aria-label={label}><span>★</span><strong><small>ENGLISH FOR TWO</small>CHAMPION<small>★ ★ ★</small></strong><span>★</span></div>;
}

export function DailyDraw({name,stats,wallet,onSpin,onClose,time}) {
  const saved=dailyWheelReward(wallet,time),collection=wheelCollection(wallet),partner=datePartnerName(wallet,name);
  const [stage,setStage]=useState(saved?'result':'ready'),[reward,setReward]=useState(saved),dialogRef=useRef(null),spinLock=useRef(Boolean(saved));
  const prize=wheelPrize(reward),sector=Math.max(0,WHEEL_PRIZES.findIndex(p=>p.id===prize?.id));
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
  function spin(){
    if(spinLock.current||stage!=='ready')return;
    spinLock.current=true;
    // The parent saves the reward before animation: closing mid-spin cannot
    // lose a prize or grant another chance.
    const next=onSpin?.();
    if(!next){spinLock.current=false;return;}
    setReward(next);setStage('spinning');
  }
  return <div className="drawBackdrop"><section ref={dialogRef} className="dailyDraw" role="dialog" aria-modal="true" aria-labelledby="draw-title">
    <button className="drawClose iconButton" aria-label="Закрыть колесо" onClick={onClose}>×</button>
    <div className="eyebrow">ПРИЗОВОЕ КОЛЕСО · РАЗ В ДЕНЬ</div><h1 id="draw-title">{stage==='result'?`Твой приз: ${prize?.label||'получен'}`:'Что тебе выпадет?'}</h1>
    <div className={`dailyWheel prizeWheel ${stage==='spinning'?'spinning':stage==='result'?'revealed':''}`} style={{'--wheel-stop':`${(360-sector*45)%360}deg`}} aria-hidden="true"><div className="wheelDisc" style={{background:`conic-gradient(from -22.5deg,${WHEEL_PRIZES.map((p,i)=>`${p.color} ${i*45}deg ${(i+1)*45}deg`).join(',')})`}}>{WHEEL_PRIZES.map((p,i)=><span key={p.id} style={{'--sector-angle':`${i*45}deg`}}><PrizeIcon prize={p}/></span>)}</div><b>{stage==='result'?<PrizeIcon prize={prize}/>:'✦'}</b></div>
    {stage==='result'?<><p className="wheelAward" role="status">{prize?.amount?`+$${prize.amount} уже в твоей копилке!`:'Новая вещь для вашего свидания!'}<br/><small>Следующее вращение — завтра.</small></p>{!prize?.amount&&<p className="drawCollectionProgress">{collection.completed>0?`Выиграно свиданий: ${collection.completed}. Организует: ${partner}.`:`До свидания: ${collection.nextProgress} из 5 разных вещей.`}</p>}<button className="primary big" onClick={onClose}>Отлично, на главную</button></>:
      <><p>Деньги в копилку или вещь для свидания.<br/>Собери все 5 — встречу организует {partner}.</p><button className="primary big" disabled={stage==='spinning'||!onSpin} onClick={spin}>{stage==='spinning'?'Выбираем…':'Крутить колесо'}</button><p className="wheelLimit">$1 · $2 · $3 · букет · два кофе · билет · сумка · ключи<br/>Все 8 секторов равновероятны. Одно бесплатное вращение за день, обновление в 00:00 по Стамбулу.</p></>}
    <p className="drawVisit">Вход сегодня засчитан ✓<br/><small>{attended.rewardedToday?'Бонус $10 уже в копилке':`${attended.days} из 30 дней к бонусу $10`}</small></p>
  </section></div>;
}

export function WheelCollection({wallet,name,paired,time,onDraw}) {
  const collected=wheelCollection(wallet),today=wheelPrize(dailyWheelReward(wallet,time));
  return <details className="homeCollection"><summary>Коллекция призов <span>{collected.nextProgress} / 5 · {collected.completed} свиданий</span></summary><div className="wheelCollection">
    {!today&&onDraw&&<button className="secondary big" aria-label="Открыть колесо дня" onClick={onDraw}>Сегодняшнее вращение →</button>}
    {today&&<p className="dailyPrizeStamp"><span><PrizeIcon prize={today}/></span><b>Приз дня: {today.label}</b><small>Получен ✓ · новое вращение завтра</small></p>}
    <DateCollection wallet={wallet} name={name} paired={paired}/>
    {collected.records.length>0&&<details className="wheelPrizeHistory"><summary>История призов · {collected.records.length}</summary><p>Денежные бонусы колеса: <b>+${collected.total}</b></p><div className="wheelHistory">{collected.records.slice(0,7).map(r=><p key={r.day}><span>{r.day.slice(8)}.{r.day.slice(5,7)}</span><b>{wheelPrize(r).label}</b></p>)}</div></details>}
  </div></details>;
}

export function AdventureHub({name,stats,wallet,paired,syncError,weekly,hasDraft,onDraw,onAdventure,onSpeed,onCheck,time}) {
  const plan=dailyAdventure(name,time),league=championship(stats,wallet.partner,time,wallet.championship);
  const won=league.winner==='self'?ruName(name):league.winner==='partner'?ruName(wallet.partner?.name):null;
  return <section className="adventureHub">
    <div className="adventureHeading"><div><div className="eyebrow">СЕГОДНЯ ИГРАЕМ</div><h2>{plan.title}</h2></div></div>
    <p>{plan.description}. Задания чередуются автоматически, независимо от колеса.</p>
    <button className="primary big" onClick={onAdventure}>{hasDraft?'Продолжить сохранённое занятие':'Маршрут дня · 12 заданий →'}</button>
    <div className="speedLaunchers"><button onClick={()=>onSpeed('review')}><b>ϟ Мой словарь</b><span>60 секунд · EN ⇄ RU</span></button><button onClick={()=>onSpeed('arena')}><b>★ Арена пары</b><span>Твой словарь · пояс +$5</span></button></div>
    <section className="weeklyArena"><div className="eyebrow">ПОЯС НЕДЕЛИ · ПН–ВС</div><ChampionBelt/>
      <div className="arenaScores"><div><span>{ruName(name)}</span><strong>{league.current.own?.score??'—'}</strong><small>твой рекорд</small></div><i>VS</i><div><span>{ruName(wallet.partner?.name)||'Партнёр'}</span><strong>{league.current.other?.score??'—'}</strong><small>{paired?'рекорд партнёра':'свяжи кабинеты'}</small></div></div>
      <p className="arenaCashPrize">+$5 победителю по итогам недели</p>
      <p className="leagueWinner">{won?`Пояс за прошлую неделю: ${won} 🏆 · +$5 в копилку`:league.winner==='pending'&&paired?'Итог прошлой недели — после обновления обоих кабинетов':league.winner==='none'?'Новая неделя — новый пояс. Сделай первую попытку!':'Личный рекорд сохраняется. Для пояса свяжите кабинеты.'}</p>
      {syncError&&<p className="errorText">Рекорд сохранён на устройстве. Сравнение обновится после восстановления связи.</p>}
      <details><summary>Правила арены</summary><p>У каждого свой словарь выбранного уровня: слова и фразы, включая ещё не встречавшиеся. Вопросы EN → RU и RU → EN чередуются. У обоих 60 секунд; верный ответ +10, ошибка −8, итог не ниже нуля. Учитывается лучшая попытка недели.</p><p>Верный ответ за 3 секунды убирает карточку из обеих скоростных игр на 14 дней. Приоритет — ошибки и новые слова. Уроки и учебное закрепление от этого не меняются.</p><p>За пояс — $5 в копилку одному победителю, начиная с недели 12 октября 2026. Неделя заканчивается в воскресенье в 23:59 по Стамбулу. Начисление — после обновления обоих кабинетов на следующей неделе, один раз. При равных очках сравниваем точность, серию, затем время рекорда: кто поставил раньше. При совпадении до миллисекунды — постоянный порядок кабинетов. После начисления итог не меняется.</p><p>«Мой словарь» — личная тренировка, без участия в борьбе за пояс. Отдельные спринты не оплачиваются как уроки.</p></details>
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
  if(!started)return <div className="app speedIntro"><div className="eyebrow">{initial.mode==='arena'?'АРЕНА ПАРЫ':'МОЙ СЛОВАРЬ'} · {initial.level}</div><h1>Есть 60 секунд?</h1><div className="speedClock">60</div><p>Английский → русский, затем наоборот. Верно — <b>+10</b>, ошибка — <b>−8</b>.</p><p className="helper">Весь твой словарь {initial.level}, слова и фразы. Верно за 3 секунды — карточка отдыхает 14 дней, а в следующих играх появляются другие.</p><p className="helper">{initial.mode==='arena'?'У партнёра своя подборка. Победитель недели получает пояс и $5 в копилку.':'Личная тренировка не участвует в арене и не меняет учебное закрепление.'} Если свернуть приложение или выйти, рекорд не засчитается.</p><button className="primary big" onClick={()=>{const time=Date.now(),next={...ref.current,startedAt:time,questionAt:time,deadline:time+60000,lastAnswerAt:time};ref.current=next;setRound(next);setNow(time);setStarted(true);}}>Поехали!</button><button className="quietButton" onClick={onBack}>Не сейчас</button></div>;
  const task=feedback?.task||round.questions[round.index%round.questions.length],seconds=Math.max(0,Math.ceil((round.deadline-now)/1000));
  function submit(value) {const time=Date.now();if(time<unlock.current)return;if(time>=ref.current.deadline){finish();return;}
    const current=ref.current,next=answerSpeedRound(current,value,time);if(next===current)return;unlock.current=time+450;
    const ok=next.correct>current.correct;setFeedback({ok,task,text:ok?'+10 · Верно!':`−8 · ${task.answer}`});ref.current=next;setRound(next);
  }
  return <div className="speedGame"><header><button className="iconButton" aria-label="Прервать скоростной раунд" onClick={()=>finish(true)}>×</button><span className={seconds<=10?'speedTimer urgent':'speedTimer'}>{seconds}<small>сек</small></span><strong>{round.score}<small>очков</small></strong></header>
    <div className="speedTimeTrack" role="progressbar" aria-label="Осталось времени" aria-valuenow={seconds} aria-valuemin={0} aria-valuemax={60}><i style={{width:seconds/60*100+'%'}}/></div>
    <main><div className="speedDirection">{task.direction==='ru-en'?'РУССКИЙ → ENGLISH':'ENGLISH → РУССКИЙ'}</div><div className="speedCombo">{round.streak>=3?`🔥 Серия ${round.streak}`:'Выбери перевод ниже'}</div><h1 lang={task.direction==='ru-en'?'ru':'en'}>{task.prompt}</h1><div className="speedOptions">{task.options.map(option=><button key={option} lang={task.direction==='ru-en'?'en':'ru'} disabled={Boolean(feedback)} onClick={()=>submit(option)}>{option}</button>)}</div><p className={`speedFeedback ${feedback?.ok?'correct':'wrong'}`} role="status">{feedback?.text||' '}</p></main>
    <footer>✓ {round.correct} верных · × {round.wrong} ошибок · рекорд серии {round.bestStreak}</footer>
  </div>;
}

export function SpeedResult({round,onAgain,onHome}) {
  const mistakes=round.answers.filter(a=>!a.correct).filter((a,i,all)=>all.findIndex(b=>b.id===a.id)===i);
  const latest=new Map(round.answers.map(a=>[a.id,a]));
  const rested=[...latest.values()].filter(a=>a.correct&&a.ms<=3000).length;
  return <div className="app speedResult"><div className="eyebrow">{round.completed?round.newBest?'НОВЫЙ ЛИЧНЫЙ РЕКОРД':'РАУНД ЗАВЕРШЁН':'РАУНД ПРЕРВАН'}</div><h1>{round.score}<small>очков</small></h1><p>{round.completed?round.mode==='arena'?'Результат сохранён для арены этой недели.':'Результат личных повторов сохранён.':'Рекорд не засчитан: для честного сравнения нужны полные 60 секунд без выхода.'}</p><div className="speedResultStats"><span><b>{round.correct}</b>верных</span><span><b>{round.wrong}</b>ошибок</span><span><b>{round.bestStreak}</b>лучшая серия</span></div>
    {mistakes.length>0&&<details className="speedMistakes" open><summary>Что повторить · {mistakes.length}</summary>{mistakes.map(item=><p key={item.id}><b lang="en">{item.en}</b><span>{item.ru}</span></p>)}</details>}
    <p className="speedRestSummary">Карточек на отдыхе: {rested}. {rested?'Верно за 3 секунды — не появятся в скоростных играх 14 дней.':'Быстрые верные ответы освободят место новым словам.'}</p>
    <button className="primary big" onClick={onAgain}>Новая подборка →</button><button className="quietButton" onClick={onHome}>На главную</button><small>Спринт не меняет закрепление. За победу в арене по итогам недели — $5.</small></div>;
}
