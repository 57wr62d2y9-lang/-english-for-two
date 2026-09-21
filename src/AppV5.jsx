import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PHRASES, COLLOCATIONS } from './catalog.js';
import { LEVELS, COURSE_SIZE, addGoal, awardMilestone, awardLevelCompletion, awardRoutine, ascentProgress, balanceOf, courseProgress, dayKey, finalLevelReady, isDue, lessonRecord, levelCompletionId, redeem, reviewItem, studySlot } from './learning.js';
import { emptyStats, inTelegram, loadLevelProgress, loadSettings, loadStats, loadWallet, saveLevelProgress, saveSettings, saveStats, saveWallet, loadDraft, saveDraft, telegramProfile, getLocalMeta, setLocalMeta, summariseStats, loadReadNotifications, saveReadNotifications } from './storage-v3.js';
import { coupleSyncConfigured, createPairCode, joinPair, syncCouple, mergeCoupleSnapshot, createCoupleGiftRequest, resolveCoupleGiftRequest, publishLesson } from './couple-sync.js';
import { saveBackup, restoreBackup } from './private-backup.js';
import { makeSession, nextLessonTask, isAnswerCorrect, applySessionEvidence } from './lesson-engine.js';
import { DAILY_GRAMMAR, GUIDES, examplesFor, guideFor, wordHints } from './lesson-notes.js';
import { translateToRussian } from './translation.js';
import { buildCheckpoint, buildFinalCheck } from './checkpoint.js';
import Mountain from './Mountain.jsx';
import { AUDIO_LESSONS } from './media-lessons.js';

const defaults={level:'B1',minutes:15,dailyGoal:30,profileName:'Artur'};
const emptyWallet=()=>({earned:{},spent:{},goals:{},incoming:{},partner:null});
const walletShape=value=>({...emptyWallet(),...value});
const nameRu=name=>name === 'Anna' ? 'Аня' : name === 'Artur' ? 'Артур' : name || 'Партнёр';
const other=name=>name === 'Anna' ? 'Artur' : 'Anna';
const nextLevel=level=>({A2:'B1',B1:'B2',B2:'C1',C1:'C1+'}[level]);
const uid=prefix=>`${prefix}-${crypto.randomUUID()}`;
const itemCount=level=>PHRASES.filter(item=>item.level === level).length;
const ruPlural=(value,one,few,many)=>{const n=Math.abs(value)%100;return n>=11&&n<=14?many:n%10===1?one:n%10>=2&&n%10<=4?few:many;};

export default function App() {
  const [ready,setReady]=useState(false),[settings,setSettings]=useState(defaults),[progress,setProgress]=useState({}),[stats,setStats]=useState(emptyStats),[wallet,setWallet]=useState(emptyWallet);
  const [screen,setScreen]=useState('home'),[session,setSession]=useState(null),[checkpoint,setCheckpoint]=useState(null),[notice,setNotice]=useState(''),[backup,setBackup]=useState('local');
  const [couple,setCouple]=useState({paired:false,notifications:[],code:'',busy:false}),[readNotices,setReadNotices]=useState(loadReadNotifications);
  const stateRef=useRef({settings,progress,stats,wallet}),sessionRef=useRef(null),busyRef=useRef(false),finishedRef=useRef(new Set()),levelToken=useRef(0),activityRef=useRef(Date.now());
  stateRef.current={settings,progress,stats,wallet};
  const items=useMemo(()=>PHRASES.filter(item=>item.level===settings.level),[settings.level]);
  const path=useMemo(()=>courseProgress(items,progress),[items,progress]);
  const ascent=useMemo(()=>ascentProgress(stats,settings.level),[stats,settings.level]);
  const unread=couple.notifications.filter(entry=>!readNotices.includes(entry.id)).length;

  function setCurrentSession(next) { sessionRef.current=next;setSession(next); }
  function storeProgress(next,level=stateRef.current.settings.level) { stateRef.current={...stateRef.current,progress:next};setProgress(next);saveLevelProgress(level,next); }
  function storeStats(next) { const value=summariseStats(next);stateRef.current={...stateRef.current,stats:value};setStats(value);saveStats(value);return value; }
  function storeWallet(next) { stateRef.current={...stateRef.current,wallet:next};setWallet(next);saveWallet(next); }
  function bundle(draft=loadDraft()) { const s=stateRef.current;return {level:s.settings.level,progress:s.progress,stats:s.stats,wallet:s.wallet,draft}; }
  async function backUpNow() { setBackup('saving');const result=await saveBackup(bundle());setBackup(result.ok?'saved':'pending');return result; }

  useEffect(()=>{
    let active=true;
    (async()=>{
      const saved=await loadSettings();
      const first=telegramProfile()?.firstName?.toLowerCase() || '';
      const profileName=['Artur','Anna'].includes(saved?.profileName) ? saved.profileName : /^(anna|anya|аня|анна)/.test(first)?'Anna':'Artur';
      const config={...defaults,...saved,profileName};
      if(!LEVELS.includes(saved?.level))config.level=profileName==='Anna'?'A2':'B1';
      if(![5,15].includes(Number(config.minutes)))config.minutes=15;
      const [p,s,w]=await Promise.all([loadLevelProgress(config.level),loadStats(),loadWallet()]);
      let loaded=await restoreBackup({level:config.level,progress:p,stats:s,wallet:walletShape(w),draft:loadDraft()});
      // Existing paid lessons are evidence of completed practice. Import once,
      // retaining every existing reward and every old SRS identifier.
      const lessons={...(loaded.stats.lessons || {})};
      for(const [id,earned] of Object.entries(loaded.wallet.earned || {})) if(id.startsWith('routine:') && !lessons[`import-${id}`] && !Object.values(lessons).some(record=>record.rewardId===id)) {
        lessons[`import-${id}`]={id:`import-${id}`,level:earned.level || config.level,at:earned.at,seconds:900,completed:true,climb:1,reward:earned.amount,imported:true,rewardId:id};
      }
      loaded.stats={...loaded.stats,lessons};
      if(!active)return;
      stateRef.current={settings:config,progress:loaded.progress,stats:loaded.stats,wallet:loaded.wallet};
      setSettings(config);storeProgress(loaded.progress,config.level);storeStats(loaded.stats);storeWallet(loaded.wallet);
      if(loaded.draft?.data?.version===3 && !loaded.stats.lessons?.[loaded.draft.data.id] && !loaded.draft.data.done){setCurrentSession(loaded.draft.data);saveDraft(loaded.draft.data);}
      else saveDraft(null);
      setBackup(loaded.backupOk?'saved':'pending');setReady(true);saveSettings(config);
    })().catch(()=>{if(active){setNotice('Не удалось загрузить все данные. Обнови страницу: сохранённые уроки не удалены.');setReady(true);}});
    return()=>{active=false;};
  },[]);

  useEffect(()=>{
    if(!ready)return;
    const timer=setTimeout(()=>backUpNow(),1500);
    return()=>clearTimeout(timer);
  },[ready,progress,stats,wallet]);

  useEffect(()=>{
    if(!ready)return;
    const start=setTimeout(()=>refreshCouple(),600);
    const timer=setInterval(()=>{if(!document.hidden){refreshCouple();if(backup==='pending')backUpNow();}},20000);
    const wake=()=>{activityRef.current=Date.now();if(!document.hidden){refreshCouple();backUpNow();}};
    window.addEventListener('online',wake);document.addEventListener('visibilitychange',wake);
    return()=>{clearTimeout(start);clearInterval(timer);window.removeEventListener('online',wake);document.removeEventListener('visibilitychange',wake);};
  },[ready,backup]);

  useEffect(()=>{
    if(screen!=='session' || !session || session.done)return;
    let last=Date.now(),lastSave=0;
    const tick=setInterval(()=>{
      const now=Date.now(),delta=now-last;last=now;
      const current=sessionRef.current;
      if(!current || current.done || document.hidden || current.paused || now-activityRef.current>90000)return;
      const next={...current,remainingMs:Math.max(0,current.remainingMs-Math.min(delta,1500))};
      setCurrentSession(next);
      if(now-lastSave>5000){saveDraft(next);lastSave=now;}
      // Let the current answer and all questions about one recording finish.
    },500);
    return()=>{clearInterval(tick);if(sessionRef.current&&!sessionRef.current.done)saveDraft(sessionRef.current);};
  },[screen,session?.id,session?.done]);

  async function refreshCouple() {
    if(busyRef.current || !coupleSyncConfigured())return;
    busyRef.current=true;
    try {
      const s=stateRef.current,day=s.stats.byDay?.[dayKey()] || {},climb=ascentProgress(s.stats,s.settings.level);
      const result=await syncCouple({displayName:s.settings.profileName,level:s.settings.level,percent:climb.percent,balance:balanceOf(s.wallet),todayMinutes:Math.round((day.seconds||0)/60),morningDone:Boolean(s.wallet.earned?.[`routine:${dayKey()}:morning`]),eveningDone:Boolean(s.wallet.earned?.[`routine:${dayKey()}:evening`]),goals:Object.entries(s.wallet.goals || {}).map(([id,goal])=>({id,...goal}))});
      if(!result.ok){setCouple(current=>({...current,error:result.error,busy:false}));return;}
      const merged=mergeCoupleSnapshot(stateRef.current.wallet,result);
      if(JSON.stringify(merged)!==JSON.stringify(stateRef.current.wallet))storeWallet(merged);
      setCouple(current=>({...current,...result,busy:false,error:''}));
      // Retry completed lesson notifications after a temporary loss of network.
      if(result.paired) {
        const ack=getLocalMeta('publishedLessons') || [];
        for(const record of Object.values(stateRef.current.stats.lessons || {}).filter(r=>r.completed&&!r.imported&&!ack.includes(r.id)).slice(-20)) {
          const sent=await publishLesson({...record,accuracy:record.answers?record.correct/record.answers*100:0,steps:ascentProgress(stateRef.current.stats,record.level).steps});
          if(sent.ok){ack.push(record.id);setLocalMeta('publishedLessons',ack);}
        }
      }
    } finally {busyRef.current=false;}
  }
  async function connect(code) {
    setCouple(c=>({...c,busy:true,error:''}));
    const result=code ? await joinPair(code) : await createPairCode();
    setCouple(c=>({...c,...(result.ok?result:{}),busy:false,error:result.ok?'':result.error}));
    if(code&&result.ok){setNotice('Кабинеты связаны. Уроки, заработок и подарки обновляются автоматически.');refreshCouple();}
  }
  async function changeLevel(level) {
    if(level===settings.level)return;
    if(sessionRef.current&&!sessionRef.current.done){setNotice('Сначала заверши или продолжи начатый урок. Его прогресс сохранён.');return;}
    const token=++levelToken.current;
    setNotice('Загружаю твой прогресс…');
    await backUpNow();
    const local=await loadLevelProgress(level);
    const loaded=await restoreBackup({...bundle(),level,progress:local});
    if(token!==levelToken.current)return;
    const config={...stateRef.current.settings,level};stateRef.current={...stateRef.current,settings:config};setSettings(config);saveSettings(config);storeProgress(loaded.progress,level);setNotice('');
  }
  function changeSettings(patch) {const next={...stateRef.current.settings,...patch};stateRef.current={...stateRef.current,settings:next};setSettings(next);saveSettings(next);}

  function startLesson(minutes=settings.minutes) {
    if(sessionRef.current&&!sessionRef.current.done){setScreen('session');return;}
    const s=stateRef.current,index=Object.values(s.stats.lessons || {}).filter(record=>record.level===s.settings.level).length;
    const next=nextLessonTask(makeSession(s.settings.level,minutes,index),s.progress);
    activityRef.current=Date.now();setCurrentSession(next);saveDraft(next);setScreen('session');
  }
  function advance(base=sessionRef.current) {
    const blockPending=base.mediaBlock&&base.mediaBlock.index<base.mediaBlock.lesson.questions.length;
    if(base.remainingMs<=0&&!blockPending){finishLesson(base);return;}
    const next=nextLessonTask(base,stateRef.current.progress);
    if(next.exhausted){finishLesson(next);return;}
    setCurrentSession(next);saveDraft(next);
  }
  function introduce(known=false) {
    const current=sessionRef.current,item=current.task.item;
    const result=reviewItem(stateRef.current.progress[item.id],known?'known':'intro',Date.now(),`${current.id}:${current.step}`);
    storeProgress({...stateRef.current.progress,[item.id]:result.item});advance(current);
  }
  function answer(value) {
    const current=sessionRef.current;if(!current||current.feedback)return;
    const task=current.task,ok=!task.practice&&isAnswerCorrect(task,value);
    const action=task.practice?'intro':!ok?'wrong':task.type==='recognition'?'recognition':['listening','video'].includes(task.type)?'listening':task.type==='recall'?'recall':'context';
    const result=reviewItem(stateRef.current.progress[task.progressId],action,Date.now(),`${current.id}:${current.step}`);
    storeProgress({...stateRef.current.progress,[task.progressId]:result.item});
    const st=stateRef.current.stats,key=dayKey(),day=st.byDay?.[key] || {};
    let nextDay={...day,at:Date.now()};
    if(!task.practice){nextDay.answers=(day.answers||0)+1;nextDay.correct=(day.correct||0)+(ok?1:0);}
    if(task.type==='ielts') {
      const old=day.ielts?.[task.skill] || {},byType=old.taskTypes?.[task.taskType] || {};
      nextDay.ielts={...day.ielts,[task.skill]:{...old,attempts:(old.attempts||0)+1,scored:(old.scored||0)+(task.practice?0:1),correct:(old.correct||0)+(ok?1:0),last:Date.now(),taskTypes:{...old.taskTypes,[task.taskType]:{attempts:(byType.attempts||0)+1,scored:(byType.scored||0)+(task.practice?0:1),correct:(byType.correct||0)+(ok?1:0)}}}};
    }
    storeStats({...st,byDay:{...st.byDay,[key]:nextDay}});
    const next={...applySessionEvidence(current,task,ok),selected:value,feedback:task.practice?'practice':ok?'correct':'wrong',xp:current.xp+result.xp};
    setCurrentSession(next);saveDraft(next);
  }
  function finishLesson(snapshot=sessionRef.current) {
    if(!snapshot||snapshot.done||finishedRef.current.has(snapshot.id)||stateRef.current.stats.lessons?.[snapshot.id])return;
    finishedRef.current.add(snapshot.id);
    const spentSeconds=Math.round((snapshot.plannedMs-snapshot.remainingMs)/1000);
    const evaluation=awardRoutine(stateRef.current.wallet,{...snapshot,spentSeconds},snapshot.startedAt);
    const current={...snapshot,done:true,spentSeconds,routineReward:evaluation.awarded,rewardReasons:evaluation.evaluation.reasons};
    const record=lessonRecord(current,snapshot.level),rewardId=`routine:${dayKey(snapshot.startedAt)}:${snapshot.slot}`;
    record.rewardId=evaluation.awarded?rewardId:undefined;
    const beforeAscent=ascentProgress(stateRef.current.stats,snapshot.level);
    const nextWallet={...evaluation.wallet};
    if(evaluation.awarded)nextWallet.earned={...nextWallet.earned,[rewardId]:{...nextWallet.earned[rewardId],level:snapshot.level,sessionId:snapshot.id}};
    storeWallet(nextWallet);
    const st=stateRef.current.stats,key=dayKey(snapshot.startedAt),day=st.byDay?.[key] || {};
    storeStats({...st,lessons:{...st.lessons,[snapshot.id]:record},byDay:{...st.byDay,[key]:{...day,seconds:(day.seconds||0)+spentSeconds,sessions:(day.sessions||0)+1,at:Date.now()}}});
    setCurrentSession({...current,climb:record.climb,ascentBefore:beforeAscent.steps,rewardAlready:Boolean(stateRef.current.wallet.earned?.[rewardId])&&!evaluation.awarded&&evaluation.evaluation.amount>0});
    saveDraft(null);backUpNow();refreshCouple();
  }
  function pauseLesson() {saveDraft(sessionRef.current);backUpNow();setScreen('home');}
  function showNotifications() {setScreen('notifications');const ids=[...new Set([...readNotices,...couple.notifications.map(entry=>entry.id)])];setReadNotices(ids);saveReadNotifications(ids);}

  function createGift(title,cost) {const next=addGoal(stateRef.current.wallet,title,Number(cost),uid('gift'));if(next===stateRef.current.wallet)return false;storeWallet(next);setNotice('Подарок добавлен.');refreshCouple();return true;}
  async function requestGift(goal) {
    if(!couple.paired){setNotice('Свяжи кабинеты один раз в настройках — после этого запросы будут приходить автоматически.');return;}
    const id=uid('request');if(balanceOf(stateRef.current.wallet)<goal.cost)return;
    setCouple(c=>({...c,busy:true}));
    // Publish the pre-reservation balance, then reserve locally only on success.
    await refreshCouple();
    const result=await createCoupleGiftRequest({id,title:goal.title,cost:goal.cost});
    if(result.ok){const next=redeem(stateRef.current.wallet,goal,id);next.spent[id]={...next.spent[id],automatic:true};storeWallet(next);setNotice('Запрос на подарок появился у партнёра.');}
    else setNotice(result.error || 'Запрос не отправлен. Попробуй ещё раз: деньги не списаны.');
    setCouple(c=>({...c,busy:false}));refreshCouple();
  }
  async function resolveGift(id,status) {setCouple(c=>({...c,busy:true}));const result=await resolveCoupleGiftRequest(id,status);if(result.ok){storeWallet(mergeCoupleSnapshot(stateRef.current.wallet,result));setNotice(status==='approved'?'Подарок согласован.':'Запрос отклонён. Сумма вернулась партнёру.');}else setNotice(result.error);setCouple(c=>({...c,busy:false}));refreshCouple();}
  function openCheck(quarter=0) {
    const tasks=quarter?buildCheckpoint(items,progress,quarter,COLLOCATIONS,AUDIO_LESSONS,settings.level):buildFinalCheck(items,progress,COLLOCATIONS,AUDIO_LESSONS,DAILY_GRAMMAR,settings.level);
    if(tasks.length<(quarter?10:20))return;
    setCheckpoint({quarter,tasks,index:0,score:0});setScreen('checkpoint');
  }
  function checkAnswer(value) {
    if(checkpoint.selected!==undefined)return;
    const task=checkpoint.tasks[checkpoint.index];setCheckpoint({...checkpoint,selected:value,score:checkpoint.score+(isAnswerCorrect(task,value)?1:0)});
  }
  function nextCheck() {
    if(checkpoint.index+1<checkpoint.tasks.length){setCheckpoint({...checkpoint,index:checkpoint.index+1,selected:undefined});return;}
    const next=checkpoint.quarter?awardMilestone(wallet,settings.level,checkpoint.quarter,checkpoint.score,path.verified):awardLevelCompletion(wallet,settings.level,checkpoint.score,checkpoint.tasks.length);
    storeWallet(next);setCheckpoint({...checkpoint,done:true,passed:checkpoint.score/checkpoint.tasks.length>=.8});
  }

  if(!ready)return <div className="splash"><img src="/suslik-logo.jpeg" alt=""/><span>English for Two</span><small>Возвращаемся к твоему прогрессу…</small></div>;
  if(screen==='session'&&session)return <div onPointerDown={()=>activityRef.current=Date.now()} onKeyDown={()=>activityRef.current=Date.now()}><Lesson session={session} ascent={ascentProgress(stats,session.level)} onIntro={introduce} onAnswer={answer} onNext={()=>advance()} onFinish={()=>finishLesson()} onBack={pauseLesson} onHome={()=>{setCurrentSession(null);setScreen('home');}} onHint={()=>{setCurrentSession({...sessionRef.current,hintUsed:true});}} onOpenMedia={()=>{const s=sessionRef.current;if(!s.mediaBlock.ready&&!s.mediaBlock.openedAt)setCurrentSession({...s,mediaBlock:{...s.mediaBlock,openedAt:Date.now(),openedRemaining:s.remainingMs}});}} onReadyMedia={()=>{const s=sessionRef.current,block=s.mediaBlock;const elapsed=block.openedAt?Math.min(300000,Date.now()-block.openedAt):0;const counted=block.openedAt?block.openedRemaining-s.remainingMs:0;const remainingMs=Math.max(0,s.remainingMs-Math.max(0,elapsed-counted));const next={...s,remainingMs,mediaBlock:{...block,ready:true}};setCurrentSession(next);saveDraft(next);}} onMore={()=>startLesson(15)}/></div>;
  const today=stats.byDay?.[dayKey()] || {},minutes=Math.round((today.seconds||0)/60),balance=balanceOf(wallet),slot=studySlot();
  return <div className="app v5App">
    <header className="brandbar"><img className="brandmark photo" src="/suslik-logo.jpeg" alt=""/><div><strong>{screen==='home'?`Привет, ${nameRu(settings.profileName)}!`:({progress:'Твоё восхождение',rewards:'Подарки',settings:'Настройки',notifications:'Новости пары',checkpoint:'Проверка знаний'}[screen])}</strong><span>English for Two · {settings.level} → {nextLevel(settings.level)}</span></div><button className="iconButton bell" aria-label={`Новости пары${unread?`, новых: ${unread}`:''}`} onClick={showNotifications}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>{unread>0&&<i>{unread}</i>}</button></header>
    {screen!=='home'&&<button className="textBack" onClick={()=>setScreen('home')}>← На главную</button>}
    {notice&&<button className="notice" onClick={()=>setNotice('')}>{notice}</button>}
    {screen==='home'&&<>
      <Mountain level={settings.level} ascent={ascent}/>
      <section className="todayCard"><div className="todayTop"><div><div className="eyebrow">{slot==='morning'?'УТРЕННИЙ УРОК':'ВЕЧЕРНИЙ УРОК'}</div><h1>Новый шаг сегодня</h1><p>{minutes} из {settings.dailyGoal} минут за день</p></div><div className="dayRing" style={{'--done':`${Math.min(100,minutes/settings.dailyGoal*100)}%`}}><span>{Math.min(100,Math.round(minutes/settings.dailyGoal*100))}%</span></div></div>
        <div className="lessonChips"><span>Фразы и грамматика</span><span>Аудио / видео</span><span>IELTS · {settings.level==='A2'?'основы':settings.level}</span></div>
        <button className="primary big" onClick={()=>startLesson()}>{session&&!session.done?'Продолжить сохранённый урок':`Начать урок · ${settings.minutes} минут`}</button>
        {!session&&<button className="quietButton" onClick={()=>startLesson(5)}>Есть только 5 минут</button>}
        <div className="slotRow">{['morning','evening'].map(part=>{const amount=wallet.earned?.[`routine:${dayKey()}:${part}`]?.amount;return <span key={part} className={amount?'done':''}>{part==='morning'?'☀ Утро':'☾ Вечер'} {amount?`+$${amount}`:'$0–$3'}</span>;})}</div>
        <RewardRules/>
      </section>
      <div className="quickStats two"><button onClick={()=>setScreen('rewards')}><span>В копилке</span><strong>${balance}</strong></button><button onClick={()=>setScreen('progress')}><span>Пройдено уроков</span><strong>{ascent.lessons}</strong></button></div>
      {wallet.partner?<section className="partnerCard"><div><span>{nameRu(wallet.partner.name)}</span><strong>{wallet.partner.level} · {wallet.partner.percent}% пути</strong><small>Сегодня {wallet.partner.todayMinutes||0} мин · в копилке ${wallet.partner.balance}</small></div><button onClick={showNotifications}>Новости {unread?`· ${unread}`:'→'}</button></section>:<button className="referenceButton" onClick={()=>setScreen('settings')}>Связать кабинеты с {settings.profileName==='Anna'?'Артуром':'Аней'} →</button>}
    </>}
    {screen==='progress'&&<><Mountain level={settings.level} ascent={ascent}/><section className="explainCard"><h2>Каждый урок — шаг вверх</h2><p>Полный урок добавляет 1 учебный этап, короткий — треть этапа. Нужно пройти 90% времени и дать 15 проверяемых ответов за 15 минут или 6 за 5 минут. Ошибки влияют на награду, но завершённый урок остаётся в истории.</p><p>80 этапов — ориентир регулярной практики. Владение уровнем подтверждается отдельно: повторением материала и проверками знаний.</p></section><div className="statsGrid"><Stat value={path.introduced} label="Фраз изучается"/><Stat value={path.verified} label="Закреплено надолго"/><Stat value={Math.round(stats.totalMinutes||0)} label="Минут за всё время"/><Stat value={stats.answers?`${Math.round(stats.correct/stats.answers*100)}%`:'—'} label="Точность"/></div><section className="history"><h2>Последние уроки</h2>{Object.values(stats.lessons||{}).filter(r=>r.level===settings.level).sort((a,b)=>b.at-a.at).slice(0,12).map(r=><div key={r.id}><span><strong>{new Date(r.at).toLocaleDateString('ru-RU',{day:'numeric',month:'long'})} · {Math.round(r.seconds/60)} мин</strong><small>{r.completed?'Этап сохранён':'Незавершённая практика'}{r.imported?' · из предыдущей версии':''}</small></span><b>+${r.reward||0}</b></div>)}</section><section className="explainCard"><h2>Проверка знаний {settings.level}</h2><p>Закреплено {path.verified} из {COURSE_SIZE} фраз. Доступно для изучения: {path.available}. Повторы в разные дни проверяют, что материал остался в памяти.</p>{[1,2,3,4].map(q=><button key={q} className="secondary big" disabled={path.verified<q*100||Boolean(wallet.earned?.[`route-2026-1:${settings.level}:${q}`])} onClick={()=>openCheck(q)}>{q*100} фраз · {wallet.earned?.[`route-2026-1:${settings.level}:${q}`]?'проверка пройдена':'проверка 8/10'}</button>)}<button className="primary big" disabled={!finalLevelReady(items,progress,wallet,settings.level)||Boolean(wallet.earned?.[levelCompletionId(settings.level)])} onClick={()=>openCheck()}>Итоговая проверка · 20 заданий</button></section></>}
    {screen==='rewards'&&<Gifts wallet={wallet} couple={couple} profileName={settings.profileName} onCreate={createGift} onRequest={requestGift} onResolve={resolveGift}/>}
    {screen==='notifications'&&<section className="notificationList"><p>Здесь автоматически появляются завершённые уроки и заработок партнёра.</p>{couple.notifications.length?couple.notifications.map(entry=><article key={entry.id}><span className="notificationIcon">🐿</span><div><strong>{nameRu(entry.payload.from)} завершил{entry.payload.from==='Anna'?'а':''} урок {entry.payload.level}</strong><p>{entry.payload.answers} {ruPlural(entry.payload.answers,'ответ','ответа','ответов')} · {entry.payload.accuracy}% верных · +${entry.payload.reward}</p><small>{new Date(entry.created_at).toLocaleString('ru-RU',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})}</small></div></article>):<div className="emptyState">{couple.paired?'После следующего урока партнёра здесь появится первая новость.':'Свяжите кабинеты один раз в настройках.'}</div>}{couple.error&&<p className="errorText">{couple.error}</p>}</section>}
    {screen==='settings'&&<><section className="settingsCard"><label>Твой кабинет</label><div className="segmented two">{['Artur','Anna'].map(name=><button key={name} className={settings.profileName===name?'active':''} onClick={()=>changeSettings({profileName:name})}>{nameRu(name)}</button>)}</div></section><Pairing couple={couple} onConnect={connect} onRefresh={refreshCouple}/><section className="settingsCard"><label>Уровень заданий</label><div className="segmented">{LEVELS.map(level=><button key={level} className={level===settings.level?'active':''} onClick={()=>changeLevel(level)}>{level}</button>)}</div><p>Для каждого уровня — своя программа. Прогресс других уровней сохраняется.</p></section><section className="settingsCard"><label>Продолжительность урока</label><div className="segmented two">{[5,15].map(value=><button key={value} className={settings.minutes===value?'active':''} onClick={()=>changeSettings({minutes:value})}>{value} минут</button>)}</div><label>Цель на день</label><div className="segmented three">{[15,30,45].map(value=><button key={value} className={settings.dailyGoal===value?'active':''} onClick={()=>changeSettings({dailyGoal:value})}>{value} минут</button>)}</div></section><section className="explainCard"><strong>Сохранение прогресса</strong><p>Ответы и начатый урок сохраняются на устройстве. При доступе к интернету создаётся личная резервная копия. В Telegram ключ кабинета также сохраняется в твоём аккаунте.</p><button className="secondary big" onClick={backUpNow}>Сохранить сейчас</button></section><p className="versionLabel">Версия 0.3 · {itemCount(settings.level)} фраз на уровне {settings.level}</p></>}
    {screen==='checkpoint'&&checkpoint&&<CheckScreen value={checkpoint} onAnswer={checkAnswer} onNext={nextCheck} onDone={()=>setScreen('progress')}/>}
    <footer className="saveStatus" role="status"><span className={`syncDot ${backup==='saved'?'synced':backup==='saving'?'syncing':'pending'}`}/>{backup==='saved'?'Прогресс сохранён на устройстве и в личной копии':backup==='saving'?'Сохраняю прогресс…':'Сохранено на устройстве · резервная копия ждёт связи'}</footer>
    <nav className="bottomNav" aria-label="Основные разделы">{[['home','Занятия','⌂'],['progress','Восхождение','↗'],['rewards','Подарки','♢'],['settings','Настройки','⚙']].map(([id,label,icon])=><button key={id} className={screen===id?'active':''} onClick={()=>setScreen(id)}><span>{icon}</span>{label}</button>)}</nav>
  </div>;
}

function Stat({value,label}) {return <div className="stat"><strong>{value}</strong><span>{label}</span></div>;}
function RewardRules(){return <details className="rewardRules"><summary>Как заработать $1, $2 или $3</summary><p><b>$0</b> — урок не завершён или верных ответов меньше 75%.</p><p><b>$1</b> — урок завершён, не менее 75% верных ответов. За 5 минут можно получить максимум $1.</p><p><b>$2</b> — за 15 минут не менее 28 ответов, точность от 95%, 4 типа заданий и 22 самостоятельных ответа на разные задания.</p><p><b>$3</b> — не менее 45 ответов, точность от 98%, 6 типов заданий, 40 самостоятельных ответов. Нужны аудио/видео, IELTS, воспроизведение фраз и быстрый темп: минимум 28 верных ответов за 18 секунд каждый.</p><p>Награда начисляется один раз утром и один раз вечером. Подсказки помогают учиться, но не повышают награду до $2–$3.</p></details>;}

function Lesson({session,ascent,onIntro,onAnswer,onNext,onFinish,onBack,onHome,onHint,onOpenMedia,onReadyMedia,onMore}) {
  if(session.done)return <div className="app lessonFinish"><div className="eyebrow">УРОК ЗАВЕРШЁН</div><h1>{session.climb?'Суслик стал ближе к вершине':'Продолжим в следующий раз'}</h1><Mountain level={session.level} ascent={ascent} celebrate reward={session.routineReward} climb={session.climb}/><div className="resultSummary"><Stat value={`${session.correct}/${session.answers}`} label="Верных ответов"/><Stat value={`+$${session.routineReward||0}`} label="В копилку"/></div><p>{session.rewardAlready?'Награда за эту часть дня уже получена. Учебный прогресс сохранён.':session.rewardReasons?.join(' · ')}</p><p className="helper">{session.climb?'Новости о завершённом уроке и заработке отправляются связанному партнёру автоматически.':'Время практики и ответы сохранены. Для учебного этапа нужно закончить урок.'}</p><button className="primary big" onClick={onHome}>На главную</button><button className="quietButton" onClick={onMore}>Ещё один урок</button></div>;
  const task=session.task,seconds=Math.ceil(session.remainingMs/1000),media=['video','listening'].includes(task.type),showQuestion=!media||session.mediaBlock?.ready;
  return <div className="app sessionApp"><div className="topbar"><button className="back" onClick={onBack} aria-label="Сохранить урок и выйти">←</button><strong>{session.level} · задание {session.step}</strong><span className="timer">{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</span></div><div className="sessionProgress"><i style={{width:`${100-session.remainingMs/session.plannedMs*100}%`}}/></div>{seconds===0&&<p className="notice">Время вышло. Закончи {media?'блок вопросов':'это задание'}, и подведём итог.</p>}<main className="exercise" key={`${session.id}:${session.step}`}>
    {task.recovery&&<div className="recoveryTag">Попробуем ещё раз — в другом контексте</div>}
    {task.type==='intro'?<><div className="eyebrow">НОВОЕ ВЫРАЖЕНИЕ</div><h1 className="phrase">{task.item.phrase}</h1><div className="mainTranslation">{task.item.ru}</div><p className="meaning">{task.item.explanation}</p><Pronounce text={task.item.phrase}/><RuleHelp guide={task.guide} item={task.item} open/><div className="examples">{task.examples.slice(0,3).map(example=><Example key={example.en} example={example}/>)}</div>{task.examples.length>3&&<details className="variationBox"><summary>Ещё {task.examples.length-3} {ruPlural(task.examples.length-3,'пример','примера','примеров')}</summary>{task.examples.slice(3).map(example=><Example key={example.en} example={example}/>)}</details>}<div className="actions twoActions"><button className="primary" onClick={()=>onIntro(false)}>Потренировать</button><button className="secondary" onClick={()=>onIntro(true)}>Уже хорошо знаю</button></div><small className="helper">Знакомую фразу проверим через 35 дней. Текущий урок продолжится с другим материалом.</small></>:<>
      <div className="eyebrow">{media?(task.type==='video'?'ВИДЕО И ПОНИМАНИЕ РЕЧИ':'IELTS LISTENING · ТРЕНИРОВКА'):task.type==='ielts'?`IELTS · ${task.skill.toUpperCase()} · ${task.level}`:({grammar:'ГРАММАТИКА В КОНТЕКСТЕ',recognition:'ЗНАЧЕНИЕ',meaning:'СМЫСЛ В КОНТЕКСТЕ',context:'ФРАЗА В ПРЕДЛОЖЕНИИ',recall:'ВСПОМНИ И НАПИШИ',order:'СОБЕРИ ПРЕДЛОЖЕНИЕ'}[task.type])}</div>
      {media&&<section className="mediaBlock"><h1>{task.lesson.title}</h1><p>{task.lesson.note}</p><a className="audioLink" href={task.lesson.url} onClick={onOpenMedia} target="_blank" rel="noreferrer">{task.type==='video'?'Смотреть учебную сцену':'Слушать запись'} · {task.lesson.source} ↗</a><small>Один материал → {task.questionCount} вопроса. Сначала послушай без текста, затем вернись сюда.</small>{!showQuestion&&<button className="primary big" onClick={onReadyMedia}>Готово — перейти к вопросам</button>}</section>}
      {showQuestion&&<>
        {media&&<p className="questionCounter">Вопрос {task.questionIndex+1} из {task.questionCount} по этой записи</p>}
        {task.passage&&<div className="examPassage">{task.passage}</div>}
        <h1 className="contextTitle">{task.prompt}</h1>{task.subPrompt&&<p className="meaning">{task.subPrompt}</p>}<p className="prompt">{task.instruction || (task.practice?task.ru:task.type==='grammar'?'Выбери правильную форму.':'Выбери ответ.')}</p>
        {task.practice?<SpeakingPractice task={task} completed={Boolean(session.feedback)} onComplete={()=>onAnswer(null)}/>:task.type==='recall'?<TextAnswer disabled={Boolean(session.feedback)} onSubmit={onAnswer}/>:task.type==='order'?<OrderAnswer task={task} disabled={Boolean(session.feedback)} onSubmit={onAnswer}/>:<div className="options">{task.options?.map(option=><button key={option} disabled={Boolean(session.feedback)} className={session.feedback?(option===task.answer?'correct':session.selected===option?'wrong':''):''} onClick={()=>onAnswer(option)}>{option}</button>)}</div>}
        {!session.feedback&&<details className="taskHint" onToggle={event=>{if(event.currentTarget.open)onHint();}}><summary>Подсказка: слова и правило</summary><RuleHelp guide={task.guide || guideFor(task.item,task.prompt)} item={task.item} open/><WordHelp text={`${task.passage||''} ${task.prompt}`} /><TranslateButton text={task.prompt}/></details>}
        {session.feedback&&<section className={`feedback ${session.feedback}`} aria-live="polite"><strong>{session.feedback==='practice'?'Речевая практика выполнена':session.feedback==='correct'?'Верно!':'Разберём ответ'}</strong>{!task.practice&&<div className="answerReveal">{task.answer}</div>}{task.explanation&&<p>{task.explanation}</p>}{task.ru&&task.ru!==task.prompt&&<p className="ruExplanation">{task.ru}</p>}{!media&&!task.practice&&<RuleHelp guide={task.guide||guideFor(task.item,task.example?.en)} item={task.item} open/>}{task.example&&<Example example={task.example}/>}<button className="primary big" onClick={onNext}>{media&&task.questionIndex+1<task.questionCount?'Следующий вопрос':seconds===0?'Завершить урок':'Дальше'}</button></section>}
      </>}
    </>}
  </main><button className="quietButton endLesson" onClick={onFinish}>Завершить сейчас</button></div>;
}

function Pronounce({text}) {
  const [message,setMessage]=useState('');
  function speak(rate){if(!window.speechSynthesis){setMessage('Озвучивание недоступно в этом браузере.');return;}window.speechSynthesis.cancel();const speech=new SpeechSynthesisUtterance(text);speech.lang='en-GB';speech.rate=rate;const voice=window.speechSynthesis.getVoices().find(v=>v.lang==='en-GB') || window.speechSynthesis.getVoices().find(v=>v.lang.startsWith('en'));if(voice)speech.voice=voice;speech.onerror=()=>setMessage('Не удалось включить голос. Попробуй открыть приложение в браузере.');window.speechSynthesis.speak(speech);}
  return <div className="pronounce"><button onClick={()=>speak(.9)}>◖ Слушать фразу</button><button onClick={()=>speak(.65)} aria-label="Произнести медленнее">Медленнее</button><small>{message||'Голос устройства · озвучивается только этот текст'}</small></div>;
}
function TranslateButton({text}){const [value,setValue]=useState(''),[loading,setLoading]=useState(false);async function translate(){setLoading(true);try{setValue(await translateToRussian(text));}catch{setValue('Перевод сейчас недоступен. Значение выражения и правило остаются в карточке.');}setLoading(false);}return <div className="optionalTranslation">{value?<p>{value}</p>:<button onClick={translate} disabled={loading}>{loading?'Загружаю…':'Показать перевод предложения'}</button>}</div>;}
function Example({example}){return <div className="examplePair"><strong>{example.en}</strong>{example.ru?<span>{example.ru}</span>:<TranslateButton text={example.en}/>}</div>;}
function WordHelp({text}){const hints=wordHints(text);return hints.length?<div className="wordGlossary">{hints.map(item=><div key={item.word}><b>{item.word}</b><span>{item.en}</span><small>{item.ru}</small></div>)}</div>:null;}
function RuleHelp({guide=GUIDES.phrase,item,open=false}){return <details className="ruleHelp" open={open}><summary>{guide.title}</summary><code>{guide.formula}</code><p lang="en">{guide.en}</p><p className="ruExplanation">{guide.ru}</p>{item?.phrase&&<div className="phraseMeaning"><b>{item.phrase}</b><span>{item.explanation}</span><small>{item.ru}</small></div>}{guide.example&&<Example example={{en:guide.example,ru:guide.translation}}/>}<WordHelp text={`${item?.phrase||''} ${guide.example||''}`}/></details>;}
function TextAnswer({onSubmit,disabled}){const [value,setValue]=useState('');return <form className="typedAnswer" onSubmit={event=>{event.preventDefault();if(value.trim())onSubmit(value);}}><input aria-label="Ответ по-английски" value={value} onChange={event=>setValue(event.target.value)} placeholder="Напиши по-английски" autoComplete="off" autoCapitalize="off" spellCheck="false" disabled={disabled}/><button className="primary big" disabled={disabled||!value.trim()}>Проверить</button></form>;}
function OrderAnswer({task,onSubmit,disabled}){const [chosen,setChosen]=useState([]);const available=task.tokens.filter(token=>!chosen.includes(token.id));return <div className="orderTask"><div className="sentenceAssembly">{chosen.length?chosen.map(id=>{const token=task.tokens.find(t=>t.id===id);return <button key={id} disabled={disabled} onClick={()=>setChosen(chosen.filter(value=>value!==id))}>{token.text}</button>}):<span>Нажимай на слова в нужном порядке</span>}</div><div className="wordBank">{available.map(token=><button key={token.id} disabled={disabled} onClick={()=>setChosen([...chosen,token.id])}>{token.text}</button>)}</div><button className="primary big" disabled={disabled||available.length>0} onClick={()=>onSubmit(chosen.map(id=>task.tokens.find(t=>t.id===id).text).join(' '))}>Проверить предложение</button></div>;}
function SpeakingPractice({task,onComplete,completed}){const [remaining,setRemaining]=useState(task.seconds),[running,setRunning]=useState(false);useEffect(()=>{if(!running||remaining<=0)return;const timer=setTimeout(()=>setRemaining(value=>value-1),1000);return()=>clearTimeout(timer);},[remaining,running]);return <section className="speakingPractice"><p>{task.structure}</p><div><strong>{remaining} сек</strong><button className="secondary" onClick={()=>setRunning(!running)} disabled={completed||remaining===0}>{running?'Пауза':'Говорить вслух'}</button></div><details><summary>Пример и самопроверка</summary><p>{task.model}</p><p>{task.strategyRu}</p></details><button className="primary big" onClick={onComplete} disabled={completed||remaining>0}>Ответил вслух</button></section>;}

function Gifts({wallet,couple,profileName,onCreate,onRequest,onResolve}) {
  const [title,setTitle]=useState(''),[cost,setCost]=useState(''),[tab,setTab]=useState('mine');const balance=balanceOf(wallet);
  const mine=Object.entries(wallet.goals||{}).map(([id,item])=>({id,...item})),partner=wallet.partner?.goals||[];
  return <><section className="walletCard"><div className="eyebrow">ТВОЯ КОПИЛКА</div><h1>${balance}</h1><p>Накопления на подарки друг другу за занятия английским.</p></section><div className="segmented two giftTabs"><button className={tab==='mine'?'active':''} onClick={()=>setTab('mine')}>Мои подарки</button><button className={tab==='partner'?'active':''} onClick={()=>setTab('partner')}>{nameRu(other(profileName))}</button></div>{tab==='mine'&&<form className="goalForm" onSubmit={event=>{event.preventDefault();if(onCreate(title,cost)){setTitle('');setCost('');}}}><h2>Какой подарок хочешь?</h2><input aria-label="Название подарка" value={title} onChange={event=>setTitle(event.target.value)} maxLength={60} placeholder="Название подарка" required/><div><input aria-label="Стоимость подарка" value={cost} onChange={event=>setCost(event.target.value.replace(/\D/g,''))} inputMode="numeric" placeholder="Стоимость в $" required/><button className="primary">Добавить</button></div></form>}<div className="giftList">{(tab==='mine'?mine:partner).filter(goal=>goal.active!==false).map(goal=>{const funds=tab==='mine'?balance:wallet.partner?.balance||0;return <section className="giftCard" key={goal.id}><div><strong>{goal.title}</strong><p>${Math.min(funds,goal.cost)} из ${goal.cost}</p></div><div className="goalBar"><i style={{width:`${Math.min(100,funds/goal.cost*100)}%`}}/></div>{tab==='mine'&&<button disabled={funds<goal.cost||couple.busy} onClick={()=>onRequest(goal)}>{funds<goal.cost?`Осталось накопить $${goal.cost-funds}`:'Попросить подарок'}</button>}</section>;})}</div>{tab==='partner'&&!partner.length&&<div className="emptyState">{couple.paired?'Партнёр пока не добавил подарки.':'Подарки партнёра появятся после однократного связывания кабинетов в настройках.'}</div>}<section className="history"><h2>Запросы на подарки</h2>{Object.entries(wallet.incoming||{}).map(([id,entry])=><div key={id}><span><strong>{nameRu(entry.from)} · {entry.title}</strong><small>${entry.cost} · {entry.status==='pending'?'Ждёт твоего решения':entry.status==='approved'?'Согласовано':'Отклонено'}</small></span>{entry.status==='pending'&&<div className="decisionButtons"><button disabled={couple.busy} onClick={()=>onResolve(id,'approved')}>Согласовать</button><button disabled={couple.busy} onClick={()=>onResolve(id,'rejected')}>Отклонить</button></div>}</div>)}{Object.entries(wallet.spent||{}).sort((a,b)=>b[1].at-a[1].at).map(([id,entry])=><div key={id}><span><strong>{entry.title} · ${entry.cost}</strong><small>{entry.status==='approved'?'Партнёр согласовал':entry.status==='rejected'?'Отклонено · сумма возвращена':'Ожидает решения партнёра'}</small></span></div>)}</section><p className="helper">Доллары здесь — ваша договорённость о подарках, а не денежный счёт.</p></>;
}
function Pairing({couple,onConnect,onRefresh}){const [code,setCode]=useState('');return <section className="settingsCard pairCard"><label>{couple.paired?'Кабинеты связаны ✓':'Связать кабинеты один раз'}</label>{couple.paired?<><p>Новости о занятиях, заработок и подарки приходят автоматически. Отправлять друг другу ссылки больше не нужно.</p><small>{couple.telegramNotifications?'Уведомления Telegram доступны при открытии через бота.':'Новости приходят внутри приложения. Для уведомлений при закрытом приложении ещё требуется подключение Telegram-бота.'}</small><button className="secondary big" onClick={onRefresh}>Обновить связь</button></>:<><p>На одном устройстве создай код, на другом введи его. Код нужен только при первом подключении.</p>{couple.code&&<div className="pairCode"><strong>{couple.code}</strong><small>Действует 15 минут</small></div>}<button className="secondary big" disabled={couple.busy} onClick={()=>onConnect()}>Создать код</button><form className="pairJoin" onSubmit={event=>{event.preventDefault();onConnect(code);}}><input aria-label="Код пары" value={code} maxLength={6} placeholder="Код из 6 символов" onChange={event=>setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g,''))}/><button className="primary" disabled={code.length!==6||couple.busy}>Связать</button></form></>}{couple.error&&<p className="errorText">{couple.error}</p>}</section>;}
function CheckScreen({value,onAnswer,onNext,onDone}){if(value.done)return <section className="finishCard"><h1>{value.score}/{value.tasks.length}</h1><p>{value.passed?'Проверка пройдена. Результат сохранён.':'Пока недостаточно верных ответов. Повтори материал и попробуй снова.'}</p><button className="primary big" onClick={onDone}>К прогрессу</button></section>;const task=value.tasks[value.index];return <section className="checkpointCard" key={value.index}><div className="eyebrow">ВОПРОС {value.index+1} ИЗ {value.tasks.length}</div>{task.lesson&&<><a className="audioLink" href={task.lesson.url} target="_blank" rel="noreferrer">Послушать запись ↗</a><p className="questionCounter">Вопрос {task.questionIndex+1} из {task.questionCount} по этой записи</p></>}<h1>{task.prompt}</h1>{task.type==='recall'?<TextAnswer disabled={value.selected!==undefined} onSubmit={onAnswer}/>:<div className="options">{task.options.map(option=><button key={option} disabled={value.selected!==undefined} onClick={()=>onAnswer(option)}>{option}</button>)}</div>}{value.selected!==undefined&&<button className="primary big" onClick={onNext}>Дальше</button>}</section>;}
