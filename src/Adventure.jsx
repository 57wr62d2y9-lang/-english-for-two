import React,{useEffect,useRef,useState} from 'react';
import {dailyAdventure,championship,answerSpeedRound,createSpeedRound} from './arcade.js';
import {attendanceProgress} from './rewards.js';
import {WHEEL_PRIZES,dailyWheelReward,wheelPrize,wheelCollection} from './daily-wheel.js';
const ruName=name=>name==='Anna'?'Аня':name==='Artur'?'Артур':name||'Партнёр';

function PrizeIcon({prize}) {
  if(!prize)return '✦';
  if(prize.amount)return <span className="prizeCash">${prize.amount}</span>;
  const colors={star:['#ffd36e','#986b24'],lightning:['#ffe57c','#9b7923'],crystal:['#b8eaff','#4084ae'],clover:['#81c491','#357a56'],crown:['#ffcc66','#906723']};
  const [fill,stroke]=colors[prize.id]||colors.star;
  return <svg className="prizeIcon" viewBox="0 0 32 32" fill={fill} stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
    {prize.id==='star'?<path d="m16 3 4 8.5 9.5 1.3-6.9 6.7 1.6 9.5L16 24.5 7.8 29l1.6-9.5-6.9-6.7 9.5-1.3Z"/>:
      prize.id==='lightning'?<path d="M18 2 6 18h9l-1 12 13-18h-9Z"/>:
      prize.id==='crystal'?<><path d="M8 5h16l6 9-14 16L2 14Z"/><path d="m8 5 8 25 8-25M2 14h28M8 5l8 9 8-9" fill="none"/></>:
      prize.id==='clover'?<><path d="M16 18q4 8 12 11" fill="none" strokeWidth="3"/><circle cx="10" cy="9" r="6"/><circle cx="22" cy="9" r="6"/><circle cx="10" cy="21" r="6"/><circle cx="22" cy="21" r="6"/></>:
      <><path d="m3 8 8 6 5-10 5 10 8-6-3 18H6Z"/><path d="M6 22h20" fill="none"/><circle cx="16" cy="18" r="2" fill="#fbf0c4"/></>}
  </svg>;
}

export function ChampionBelt({label='Чемпион недели'}) {
  return <div className="championBelt" role="img" aria-label={label}><span>★</span><strong><small>ENGLISH FOR TWO</small>CHAMPION<small>★ ★ ★</small></strong><span>★</span></div>;
}

export function DailyDraw({name,stats,wallet,onSpin,onClose,onStart,time}) {
  const plan=dailyAdventure(name,time),saved=dailyWheelReward(wallet,time);
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
    <button className="drawClose iconButton" aria-label="Закрыть план дня" onClick={onClose}>×</button>
    <div className="eyebrow">ПРИЗОВОЕ КОЛЕСО · РАЗ В ДЕНЬ</div><h1 id="draw-title">{stage==='result'?`Твой приз: ${prize?.label||'получен'}`:'Что тебе выпадет?'}</h1>
    <div className={`dailyWheel prizeWheel ${stage==='spinning'?'spinning':stage==='result'?'revealed':''}`} style={{'--wheel-stop':`${(360-sector*45)%360}deg`}} aria-hidden="true"><div className="wheelDisc" style={{background:`conic-gradient(from -22.5deg,${WHEEL_PRIZES.map((p,i)=>`${p.color} ${i*45}deg ${(i+1)*45}deg`).join(',')})`}}>{WHEEL_PRIZES.map((p,i)=><span key={p.id} style={{'--sector-angle':`${i*45}deg`}}><PrizeIcon prize={p}/></span>)}</div><b>{stage==='result'?<PrizeIcon prize={prize}/>:'✦'}</b></div>
    {stage==='result'?<><p className="wheelAward" role="status">{prize?.amount?`+$${prize.amount} уже в твоей копилке!`:'Значок добавлен в твою коллекцию.'}<br/><small>Следующее вращение — завтра.</small></p><p>{plan.title} · 12 заданий на сегодня</p><button className="primary big" onClick={onStart}>Начать маршрут →</button><button className="quietButton" onClick={onClose}>На главную</button></>:
      <><p>Бонусы $1, $2, $3 и пять значков для коллекции. Все 8 секторов равновероятны.</p><button className="primary big" disabled={stage==='spinning'||!onSpin} onClick={spin}>{stage==='spinning'?'Выбираем…':'Крутить колесо'}</button><p className="wheelLimit">Одно бесплатное вращение за день · обновление в 00:00 по Стамбулу</p></>}
    <p className="drawVisit">Вход сегодня засчитан ✓<br/><small>{attended.rewardedToday?'Бонус $10 уже в копилке':`${attended.days} из 30 дней к бонусу $10`}</small></p>
  </section></div>;
}

export function WheelCollection({wallet,time}) {
  const collected=wheelCollection(wallet),today=wheelPrize(dailyWheelReward(wallet,time));
  if(!collected.records.length)return null;
  return <div className="wheelCollection">
    {today&&<p className="dailyPrizeStamp"><span><PrizeIcon prize={today}/></span><b>Приз дня: {today.label}</b><small>Получен ✓ · новое вращение завтра</small></p>}
    <details><summary>Коллекция призов · {collected.records.length}</summary><p>Денежные бонусы колеса: <b>+${collected.total}</b></p><div className="badgeCollection">{collected.badges.map(p=><span key={p.id} className={p.count?'owned':''}><b><PrizeIcon prize={p}/></b>{p.label}<small>×{p.count}</small></span>)}</div><div className="wheelHistory">{collected.records.slice(0,7).map(r=><p key={r.day}><span>{r.day.slice(8)}.{r.day.slice(5,7)}</span><b>{wheelPrize(r).label}</b></p>)}</div></details>
  </div>;
}

export function AdventureHub({name,stats,wallet,paired,syncError,weekly,hasDraft,onDraw,onAdventure,onSpeed,onCheck,time}) {
  const plan=dailyAdventure(name,time),league=championship(stats,wallet.partner,time);
  const prize=dailyWheelReward(wallet,time);
  const won=league.winner==='self'?ruName(name):league.winner==='partner'?ruName(wallet.partner?.name):league.winner==='tie'?'Оба чемпионы':null;
  return <section className="adventureHub">
    <div className="adventureHeading"><div><div className="eyebrow">СЕГОДНЯ ИГРАЕМ</div><h2>{plan.title}</h2></div><button className="wheelMini" aria-label={prize?'Приз дня уже получен':'Открыть колесо дня'} disabled={Boolean(prize)} onClick={onDraw}>{prize?'✓':'✦'}</button></div>
    <p>{plan.description}. Короткие раунды — в твоём темпе.</p>
    <WheelCollection wallet={wallet} time={time}/>
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
