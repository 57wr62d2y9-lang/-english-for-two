import React, { useEffect, useMemo, useRef, useState } from 'react';
import { lexiconForLevel, progressFor, vocabularyStats, TOTAL_LEXICAL_UNITS } from './lexicon.js';
import { LEVELS, addGoal, removeGoal, ascentProgress, balanceOf, courseProgress, dayKey, redeem, reviewItem } from './learning.js';
import { emptyStats, inTelegram, loadLevelProgress, loadSettings, loadStats, loadWallet, saveLevelProgress, saveSettings, saveStats, saveWallet, loadDraft, saveDraft, telegramProfile, getLocalMeta, setLocalMeta, summariseStats, loadReadNotifications, saveReadNotifications } from './storage-v3.js';
import { coupleSyncConfigured, createPairCode, joinPair, syncCouple, mergeCoupleSnapshot, createCoupleGiftRequest, resolveCoupleGiftRequest, publishLesson } from './couple-sync.js';
import { saveBackup, restoreBackup } from './private-backup.js';
import { makeSession, nextLessonTask, isAnswerCorrect, applySessionEvidence, resumeVocabularySession, extendVocabularySession,reviewActionFor } from './lesson-engine.js';
import {pendingCheckpoint,makeCheckpoint,finishCheckpoint,resumeCheckpoint} from './checkpoint.js';
import {awardAttendanceBonus,finishStudySession,registerDailyVisit,lessonRewardTotal} from './rewards.js';
import Lesson,{OrderAnswer,CheckScreen} from './VocabularyLesson.jsx';
import {themeFor} from './themes.js';
export {Lesson,OrderAnswer,CheckScreen};
import { AttendanceCard, CheckRewardsSection } from './RewardOverview.jsx';
import Mountain from './Mountain.jsx';
import ReminderSettings from './ReminderSettings.jsx';
import DailyLessonCard from './DailyLessonCard.jsx';
import {lessonViewportHeight} from './lesson-layout.js';
import Gifts from './Gifts.jsx';
import {normaliseSpeakingMode} from './quiet-speaking.js';

const defaults={level:'B1',minutes:15,dailyGoal:30,profileName:'Artur',speakingMode:'quiet',vocabPace:'normal'};
const emptyWallet=()=>({earned:{},spent:{},goals:{},incoming:{},partner:null});
const walletShape=value=>({...emptyWallet(),...value});
const nameRu=name=>name === 'Anna' ? 'Аня' : name === 'Artur' ? 'Артур' : name || 'Партнёр';
const other=name=>name === 'Anna' ? 'Artur' : 'Anna';
const nextLevel=level=>({A2:'B1',B1:'B2',B2:'C1',C1:'C1+'}[level]);
const uid=prefix=>`${prefix}-${crypto.randomUUID()}`;
const itemCount=level=>lexiconForLevel(level).length;
const ruPlural=(value,one,few,many)=>{const n=Math.abs(value)%100;return n>=11&&n<=14?many:n%10===1?one:n%10>=2&&n%10<=4?few:many;};

export default function App() {
  const [ready,setReady]=useState(false),[settings,setSettings]=useState(defaults),[progress,setProgress]=useState({}),[stats,setStats]=useState(emptyStats),[wallet,setWallet]=useState(emptyWallet);
  const [screen,setScreen]=useState('home'),[session,setSession]=useState(null),[checkpoint,setCheckpoint]=useState(null),[notice,setNotice]=useState(''),[backup,setBackup]=useState('local');
  const [couple,setCouple]=useState({paired:false,notifications:[],code:'',busy:false}),[readNotices,setReadNotices]=useState(loadReadNotifications);
  const [saveMessage,setSaveMessage]=useState(''),[theme,setTheme]=useState(()=>themeFor());
  const stateRef=useRef({settings,progress,stats,wallet}),sessionRef=useRef(null),busyRef=useRef(false),finishedRef=useRef(new Set()),levelToken=useRef(0),activityRef=useRef(Date.now());
  stateRef.current={settings,progress,stats,wallet};
  const items=useMemo(()=>lexiconForLevel(settings.level),[settings.level]);
  const vocab=useMemo(()=>vocabularyStats(items,progress),[items,progress]);
  const path=useMemo(()=>courseProgress(items,progress),[items,progress]);
  const ascent=useMemo(()=>ascentProgress(stats,settings.level),[stats,settings.level]);
  const unread=couple.notifications.filter(entry=>!readNotices.includes(entry.id)).length;
  const scheduledCheck=useMemo(()=>pendingCheckpoint(items,progress,wallet,stats,settings.level),[items,progress,wallet,stats,settings.level,theme.date]);
  useEffect(()=>{
    function update(){if(document.hidden)return;const next=themeFor();setTheme(old=>old.date===next.date?old:next);document.documentElement.dataset.season=next.season;document.documentElement.dataset.holiday=next.holiday;
      const tg=window.Telegram?.WebApp;try{tg?.setHeaderColor?.(getComputedStyle(document.documentElement).getPropertyValue('--page-bg').trim()||'#fffdfb');}catch{}
      document.documentElement.style.setProperty('--lesson-height',lessonViewportHeight(window)+'px');}
    update();const timer=setInterval(update,60000);window.addEventListener('resize',update);window.visualViewport?.addEventListener('resize',update);document.addEventListener('visibilitychange',update);window.Telegram?.WebApp?.onEvent?.('viewportChanged',update);
    return()=>{clearInterval(timer);window.removeEventListener('resize',update);window.visualViewport?.removeEventListener('resize',update);document.removeEventListener('visibilitychange',update);window.Telegram?.WebApp?.offEvent?.('viewportChanged',update);};
  },[]);

  function setCurrentSession(next) { sessionRef.current=next;setSession(next); }
  function storeProgress(next,level=stateRef.current.settings.level) { stateRef.current={...stateRef.current,progress:next};setProgress(next);saveLevelProgress(level,next); }
  function storeStats(next) { const value=summariseStats(next);stateRef.current={...stateRef.current,stats:value};setStats(value);saveStats(value);return value; }
  function storeWallet(next) { stateRef.current={...stateRef.current,wallet:next};setWallet(next);saveWallet(next); }
  function recordVisit() {
    if(document.hidden)return;
    const s=stateRef.current,visited=registerDailyVisit(s.stats),bonus=awardAttendanceBonus(s.wallet,visited);
    if(visited!==s.stats)storeStats(visited);
    if(bonus.awarded){storeWallet(bonus.wallet);setNotice(`+$${bonus.awarded} за 30 дней входов подряд!`);}
  }
  function bundle(draft=loadDraft()) { const s=stateRef.current;return {settings:s.settings,level:s.settings.level,progress:s.progress,stats:s.stats,wallet:s.wallet,draft}; }
  async function backUpNow({manual=false}={}) {
    setBackup('saving');if(manual)setSaveMessage('Сохраняю ответы, урок и настройки…');
    if(sessionRef.current && !sessionRef.current.done)saveDraft(sessionRef.current);
    try {
      const result=await saveBackup(bundle(),{force:manual});
      setBackup(result.ok?'saved':'pending');
      if(manual)setSaveMessage(result.ok?`Готово! Личная копия обновлена в ${new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}.`:result.disabled?'На устройстве сохранено. Сервер резервных копий ещё не подключён.':'На устройстве сохранено, но сервер пока не подтвердил копию. Проверь интернет и нажми «Повторить сохранение».');
      return result;
    } catch {
      setBackup('pending');if(manual)setSaveMessage('Не удалось подтвердить личную копию. Данные на устройстве не удалены. Попробуй сохранить ещё раз.');
      return {ok:false};
    }
  }

  useEffect(()=>{
    let active=true;
    (async()=>{
      const saved=await loadSettings();
      const first=telegramProfile()?.firstName?.toLowerCase() || '';
      const profileName=['Artur','Anna'].includes(saved?.profileName) ? saved.profileName : /^(anna|anya|аня|анна)/.test(first)?'Anna':'Artur';
      let config={...defaults,...saved,profileName};
      if(!LEVELS.includes(saved?.level))config.level=profileName==='Anna'?'A2':'B1';
      if(![5,15].includes(Number(config.minutes)))config.minutes=15;
      const [p,s,w]=await Promise.all([loadLevelProgress(config.level),loadStats(),loadWallet()]);
      let loaded=await restoreBackup({settings:config,level:config.level,progress:p,stats:s,wallet:walletShape(w),draft:loadDraft()});
      if(loaded.settings && LEVELS.includes(loaded.settings.level)) {
        const restoredLevel=loaded.settings.level;
        config={...defaults,...loaded.settings};
        if(restoredLevel!==loaded.level)loaded=await restoreBackup({...loaded,level:restoredLevel,progress:await loadLevelProgress(restoredLevel)});
      }
      // Existing paid lessons are evidence of completed practice. Import once,
      // retaining every existing reward and every old SRS identifier.
      config.speakingMode=normaliseSpeakingMode(config.speakingMode);
      const lessons={...(loaded.stats.lessons || {})};
      for(const [id,earned] of Object.entries(loaded.wallet.earned || {})) if(id.startsWith('routine:') && !lessons[`import-${id}`] && !Object.values(lessons).some(record=>record.rewardId===id)) {
        lessons[`import-${id}`]={id:`import-${id}`,level:earned.level || config.level,at:earned.at,seconds:900,completed:true,completionVerified:earned.completed===true,studyDay:earned.day,slot:earned.slot,climb:1,reward:earned.amount,imported:true,rewardId:id};
      }
      loaded.stats={...loaded.stats,lessons};
      if(!document.hidden)loaded.stats=registerDailyVisit(loaded.stats);
      const attendance=awardAttendanceBonus(loaded.wallet,loaded.stats);
      loaded.wallet=attendance.wallet;
      if(active && attendance.awarded)setNotice(`Бонус за 30 дней без пропусков: +$${attendance.awarded}. Уже в копилке.`);
      if(!active)return;
      stateRef.current={settings:config,progress:loaded.progress,stats:loaded.stats,wallet:loaded.wallet};
      setSettings(config);storeProgress(loaded.progress,config.level);storeStats(loaded.stats);storeWallet(loaded.wallet);
      const draft=loaded.draft?.data;
      if([4,5,6].includes(draft?.version)&&draft.kind==='checkpoint'&&draft.level===config.level&&!loaded.stats.lessons?.[draft.id]&&!draft.done){const resumed=resumeCheckpoint(draft,lexiconForLevel(config.level));setCheckpoint(resumed);saveDraft(resumed);}
      else if(draft?.version===3 && !loaded.stats.lessons?.[draft.id] && !draft.done){const resumed=resumeVocabularySession(draft,loaded.progress,config);setCurrentSession(resumed);saveDraft(resumed);}
      else saveDraft(null);
      setBackup(loaded.backupOk?'saved':'pending');setReady(true);saveSettings(config);
    })().catch(()=>{if(active){setNotice('Не удалось загрузить все данные. Обнови страницу: сохранённые уроки не удалены.');setReady(true);}});
    return()=>{active=false;};
  },[]);

  useEffect(()=>{
    if(!ready)return;
    recordVisit();
  },[ready,theme.date]);

  useEffect(()=>{
    if(!ready)return;
    const timer=setTimeout(()=>backUpNow(),1500);
    return()=>clearTimeout(timer);
  },[ready,progress,stats,wallet,settings]);

  useEffect(()=>{
    if(!ready)return;
    const start=setTimeout(()=>refreshCouple(),600);
    const timer=setInterval(()=>{if(!document.hidden){recordVisit();refreshCouple();if(backup==='pending')backUpNow();}},20000);
    const wake=()=>{activityRef.current=Date.now();if(!document.hidden){recordVisit();refreshCouple();backUpNow();}};
    window.addEventListener('online',wake);document.addEventListener('visibilitychange',wake);
    return()=>{clearTimeout(start);clearInterval(timer);window.removeEventListener('online',wake);document.removeEventListener('visibilitychange',wake);};
  },[ready,backup]);

  useEffect(()=>{
    if(screen!=='session' || !session || session.done)return;
    let last=Date.now(),lastSave=0;
    const tick=setInterval(()=>{
      const now=Date.now(),delta=now-last;last=now;
      const current=sessionRef.current;
      if(!current || current.done || document.hidden || current.paused || now-activityRef.current>300000)return;
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
      const s=stateRef.current,day=s.stats.byDay?.[dayKey()] || {},route=courseProgress(lexiconForLevel(s.settings.level),s.progress,s.settings.level);
      const result=await syncCouple({displayName:s.settings.profileName,level:s.settings.level,percent:route.percent,vocabulary:{version:route.version,total:route.total,verified:route.verified,introduced:route.introduced,ready:route.ready},balance:balanceOf(s.wallet),todayMinutes:Math.round((day.seconds||0)/60),morningDone:Boolean(s.wallet.earned?.[`routine:${dayKey()}:morning`]),eveningDone:Boolean(s.wallet.earned?.[`routine:${dayKey()}:evening`]),goals:Object.entries(s.wallet.goals || {}).filter(([,goal])=>goal.active!==false).sort((a,b)=>(b[1].at||0)-(a[1].at||0)).map(([id,goal])=>({id,...goal}))});
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
    if((sessionRef.current&&!sessionRef.current.done)||(checkpoint&&!checkpoint.done)){setNotice('Сначала заверши начатый урок или контрольную. Прогресс сохранён.');return;}
    const token=++levelToken.current;
    setNotice('Загружаю твой прогресс…');
    await backUpNow();
    const local=await loadLevelProgress(level);
    const loaded=await restoreBackup({...bundle(),level,progress:local});
    if(token!==levelToken.current)return;
    const config={...stateRef.current.settings,level,updatedAt:Date.now()};stateRef.current={...stateRef.current,settings:config};setSettings(config);saveSettings(config);storeProgress(loaded.progress,level);setNotice('');
  }
  function changeSettings(patch) {const next={...stateRef.current.settings,...patch,updatedAt:Date.now()};stateRef.current={...stateRef.current,settings:next};setSettings(next);saveSettings(next);}

  function addNewBatch() {advance(extendVocabularySession(sessionRef.current));}
  function startLesson(minutes=settings.minutes) {
    if(sessionRef.current&&!sessionRef.current.done){setScreen('session');return;}
    if(checkpoint&&!checkpoint.done){setScreen('checkpoint');return;}
    const pending=pendingCheckpoint(items,stateRef.current.progress,stateRef.current.wallet,stateRef.current.stats,stateRef.current.settings.level);
    if(pending){openCheck(pending);return;}
    const s=stateRef.current,index=Object.values(s.stats.lessons || {}).filter(record=>record.level===s.settings.level).length;
    const next=nextLessonTask(makeSession(s.settings.level,minutes,index,Date.now(),s.settings.speakingMode,s.settings.vocabPace),s.progress);
    activityRef.current=Date.now();setCurrentSession(next);saveDraft(next);setScreen('session');
  }
  function advance(base=sessionRef.current) {
    if(base.remainingMs<=0){finishLesson(base);return;}
    const next=nextLessonTask(base,stateRef.current.progress);
    setCurrentSession(next);saveDraft(next);
  }
  function introduce(known=false) {
    if(known){markKnown();return;}
    const current=sessionRef.current;if(!current?.task)return;
    const item=current.task.item,result=reviewItem(progressFor(item,stateRef.current.progress),'intro',Date.now(),`${current.id}:${current.step}:intro`);
    storeProgress({...stateRef.current.progress,[item.id]:result.item});advance(current);
  }
  function markKnown() {
    const current=sessionRef.current;if(!current?.task)return;
    const item=current.task.item,result=reviewItem(progressFor(item,stateRef.current.progress),'known',Date.now(),`${current.id}:${current.step}:known`);
    storeProgress({...stateRef.current.progress,[item.id]:result.item});
    const identities=new Set([item.id,...(item.aliases||[])]);
    advance({...current,newCount:Math.max(0,current.newCount-(current.task.type==='intro'?1:0)),
      introducedIds:(current.introducedIds||[]).filter(id=>!identities.has(id)),recoveryQueue:(current.recoveryQueue||[]).filter(e=>!identities.has(e.id)&&!identities.has(e.sourceId))});
  }
  function answer(value) {
    const current=sessionRef.current;if(!current||current.feedback)return;
    const task=current.task,ok=!task.practice&&isAnswerCorrect(task,value);
    const action=reviewActionFor(task,ok);
    const result=reviewItem(progressFor(task.item,stateRef.current.progress),action,Date.now(),`${current.id}:${current.step}`,{unaided:!current.hintUsed,typed:Boolean(task.typed)});
    storeProgress({...stateRef.current.progress,[task.progressId]:result.item});
    const st=stateRef.current.stats,key=dayKey(),day=st.byDay?.[key] || {};
    let nextDay={...day,at:Date.now()};
    if(!task.practice){nextDay.answers=(day.answers||0)+1;nextDay.correct=(day.correct||0)+(ok?1:0);}

    storeStats({...st,byDay:{...st.byDay,[key]:nextDay}});
    const next={...applySessionEvidence(current,task,ok),selected:value,feedback:task.practice?'practice':ok?'correct':'wrong',xp:current.xp+result.xp};
    setCurrentSession(next);saveDraft(next);
  }
  function finishLesson(snapshot=sessionRef.current) {
    if(!snapshot||snapshot.done||finishedRef.current.has(snapshot.id)||stateRef.current.stats.lessons?.[snapshot.id])return;
    finishedRef.current.add(snapshot.id);
    const result=finishStudySession(stateRef.current.wallet,stateRef.current.stats,snapshot);
    if(result.duplicate)return;
    storeStats(result.stats);storeWallet(result.wallet);setCurrentSession(result.session);
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
  function saveCheck(next){setCheckpoint(next);saveDraft(next);activityRef.current=Date.now();}
  function openCheck(quarter=0) {
    if(sessionRef.current&&!sessionRef.current.done){setNotice('Сначала заверши сохранённый урок.');return;}
    if(checkpoint&&!checkpoint.done){setScreen('checkpoint');return;}
    const current=stateRef.current,next=makeCheckpoint(items,current.progress,current.settings.level,quarter);
    if(!next)return;
    saveCheck(next);setScreen('checkpoint');
  }
  function checkAnswer(value) {
    if(!checkpoint||checkpoint.done||checkpoint.selected!==undefined)return;
    const task=checkpoint.tasks[checkpoint.index],ok=isAnswerCorrect(task,value);
    const action=reviewActionFor(task,ok);
    const result=reviewItem(progressFor(task.item,stateRef.current.progress),action,Date.now(),`${checkpoint.id}:check:${checkpoint.index}`,{unaided:true,typed:Boolean(task.typed),checkpoint:true});
    storeProgress({...stateRef.current.progress,[task.item.id]:result.item},checkpoint.level);
    const st=stateRef.current.stats,key=dayKey(),day=st.byDay?.[key]||{};
    storeStats({...st,byDay:{...st.byDay,[key]:{...day,answers:(day.answers||0)+1,correct:(day.correct||0)+(ok?1:0),at:Date.now()}}});
    saveCheck({...checkpoint,selected:value,score:checkpoint.score+(ok?1:0),responses:[...(checkpoint.responses||[]),{index:checkpoint.index,value,correct:ok}]});
  }
  function nextCheck() {
    if(!checkpoint||checkpoint.done||checkpoint.selected===undefined)return;
    if(checkpoint.index+1<checkpoint.tasks.length){saveCheck({...checkpoint,index:checkpoint.index+1,selected:undefined});return;}
    const current=stateRef.current,result=finishCheckpoint(current.wallet,current.stats,checkpoint,items,current.progress);
    if(result.duplicate)return;
    storeStats(result.stats);storeWallet(result.wallet);setCheckpoint(result.check);saveDraft(null);
    backUpNow();refreshCouple();
  }
  function pauseCheck(){saveDraft(checkpoint);backUpNow();setScreen('home');}


  if(!ready)return <div className="splash" role="status"><img src="/english-for-two-splash.jpeg" alt="English for Two"/><small>Возвращаемся к твоему прогрессу…</small></div>;
  if(screen==='session'&&session)return <div onPointerDown={()=>activityRef.current=Date.now()} onKeyDown={()=>activityRef.current=Date.now()} onScrollCapture={()=>activityRef.current=Date.now()}><Lesson session={session} course={path} ascent={ascentProgress(stats,session.level)} onIntro={introduce} onKnown={markKnown} onAnswer={answer} onNext={()=>advance()} onFinish={()=>finishLesson()} onBack={pauseLesson} onHome={()=>{setCurrentSession(null);setScreen('home');}} onHint={()=>{setCurrentSession({...sessionRef.current,hintUsed:true});}} onMore={()=>startLesson(15)} onAddNew={addNewBatch}/></div>;
  if(screen==='checkpoint'&&checkpoint)return <CheckScreen value={checkpoint} onAnswer={checkAnswer} onNext={nextCheck} onBack={pauseCheck} onDone={()=>{setCheckpoint(null);setScreen('home');}}/>;
  const balance=balanceOf(wallet);
  return <div className="app v5App">
    <header className="brandbar"><img className="brandmark mascot" src="/suslik-mascot-v2.webp" alt=""/><div><strong>{screen==='home'?`Привет, ${nameRu(settings.profileName)}!`:({progress:'Твоё восхождение',rewards:'Подарки',settings:'Настройки',notifications:'Новости пары',checkpoint:'Проверка знаний'}[screen])}</strong><span>English for Two · словарь {settings.level}</span></div><button className="iconButton bell" aria-label={`Новости пары${unread?`, новых: ${unread}`:''}`} onClick={showNotifications}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>{unread>0&&<i>{unread}</i>}</button></header>
    {screen!=='home'&&<button className="textBack" onClick={()=>setScreen('home')}>← На главную</button>}
    {notice&&<button className="notice" onClick={()=>setNotice('')}>{notice}</button>}
    {screen==='home'&&<>
      {theme.holiday&&<div className="holidayRibbon">{theme.decoration} {theme.label}</div>}
      <DailyLessonCard settings={settings} stats={stats} wallet={wallet} session={session} checkpoint={checkpoint} scheduledCheck={scheduledCheck} onStart={startLesson}/>
      <Mountain level={settings.level} ascent={ascent} course={path} compact/>
      <AttendanceCard stats={stats} wallet={wallet}/>
      <div className="quickStats two"><button onClick={()=>setScreen('rewards')}><span>В копилке</span><strong>${balance}</strong></button><button onClick={()=>setScreen('progress')}><span>Пройдено уроков</span><strong>{ascent.lessons}</strong></button></div>
      {wallet.partner?<section className="partnerCard"><div><span>{nameRu(wallet.partner.name)}</span><strong>{wallet.partner.level} · {wallet.partner.vocabulary?.version===1?`${wallet.partner.vocabulary.verified} / ${wallet.partner.vocabulary.total} закреплено`:'ждем новую проверку словаря'}</strong><small>Сегодня {wallet.partner.todayMinutes||0} мин · в копилке ${wallet.partner.balance}</small></div><button onClick={showNotifications}>Новости {unread?`· ${unread}`:'→'}</button></section>:<button className="referenceButton" onClick={()=>setScreen('settings')}>Связать кабинеты с {settings.profileName==='Anna'?'Артуром':'Аней'} →</button>}
    </>}
    {screen==='progress'&&<>
      <Mountain level={settings.level} ascent={ascent} course={path}/><VocabularyProgress vocab={vocab} level={settings.level}/>
      <section className="explainCard"><h2>Знакомство не равно закреплению</h2><p>Путь растет только от подтвержденных слов: три самостоятельных письменных повтора в разные дни, минимум неделя между первым и последним, затем верный ответ в контрольной. Выбор из вариантов и кнопка «знаю» не подтверждают закрепление.</p><p>Старые проценты считали даже первый ответ с ошибкой. Теперь этот охват показан как «встречалось», а не «пройдено полуровня». Все уроки, ответы, расписание повторов и деньги сохранены. Прежние данные без подтверждения самостоятельного ответа проходят новую проверку.</p><p>Ошибка при отдельной проверке слова возвращает его к повторениям и снимает подтверждение до новой проверки, но не отнимает деньги. Несовпадение свободного перевода с образцом не сбрасывает закрепление: после него проверим само слово. Контрольные содержат только слова и выражения, без перевода целого предложения. Это доля освоенных карточек этого словаря, не официальная оценка CEFR.</p></section>
      <div className="statsGrid"><Stat value={path.introduced} label="Встречалось слов и фраз"/><Stat value={path.verified} label="Подтверждено контрольной"/><Stat value={Math.round(stats.totalMinutes||0)} label="Минут за всё время"/><Stat value={stats.answers?`${Math.round(stats.correct/stats.answers*100)}%`:'—'} label="Совпало с учебным ответом"/></div>
      <section className="history"><h2>Последние уроки</h2>{Object.values(stats.lessons||{}).filter(r=>r.level===settings.level).sort((a,b)=>b.at-a.at).slice(0,12).map(r=><div key={r.id}><span><strong>{new Date(r.at).toLocaleDateString('ru-RU',{day:'numeric',month:'long'})} · {Math.round(r.seconds/60)} мин</strong><small>{r.kind==='checkpoint'?`${r.quarter?`${r.retest?'Повторная проверка':'Контрольная'} ${r.quarter}`:'Итоговая проверка'} · ${r.passed?'пройдена':'попытка сохранена'}`:r.completed?'Практика сохранена':'Незавершённая практика'}{r.imported?' · из предыдущей версии':''}</small></span><b>+${lessonRewardTotal(r)}</b></div>)}</section>
      <AttendanceCard stats={stats} wallet={wallet}/><CheckRewardsSection level={settings.level} path={path} items={items} progress={progress} wallet={wallet} stats={stats} onCheck={openCheck}/>
    </>}
    {screen==='rewards'&&<Gifts wallet={wallet} couple={couple} profileName={settings.profileName} onCreate={createGift} onRemove={id=>{storeWallet(removeGoal(stateRef.current.wallet,id));refreshCouple();}} onRequest={requestGift} onResolve={resolveGift}/>}
    {screen==='settings'&&<ReminderSettings/>}
    {screen==='notifications'&&<section className="notificationList"><p>Здесь автоматически появляются завершённые уроки и заработок партнёра.</p>{couple.notifications.length?couple.notifications.map(entry=><article key={entry.id}><span className="notificationIcon">🐿</span><div><strong>{nameRu(entry.payload.from)} завершил{entry.payload.from==='Anna'?'а':''} {entry.payload.kind==='checkpoint'?entry.payload.quarter?`контрольную ${entry.payload.quarter}`:'итоговую проверку':'урок'} {entry.payload.level}</strong><p>{entry.payload.answers} {ruPlural(entry.payload.answers,'ответ','ответа','ответов')} · {entry.payload.accuracy}% верных · +${entry.payload.reward}</p><small>{new Date(entry.created_at).toLocaleString('ru-RU',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})}</small></div></article>):<div className="emptyState">{couple.paired?'После следующего урока партнёра здесь появится первая новость.':'Свяжите кабинеты один раз в настройках.'}</div>}{couple.error&&<p className="errorText">{couple.error}</p>}</section>}
    {screen==='settings'&&<><section className="settingsCard"><label>Твой кабинет</label><div className="segmented two">{['Artur','Anna'].map(name=><button key={name} className={settings.profileName===name?'active':''} onClick={()=>changeSettings({profileName:name})}>{nameRu(name)}</button>)}</div></section><Pairing couple={couple} onConnect={connect} onRefresh={refreshCouple}/><section className="settingsCard"><label>Уровень заданий</label><div className="segmented">{LEVELS.map(level=><button key={level} className={level===settings.level?'active':''} onClick={()=>changeLevel(level)}>{level}</button>)}</div><p>Для каждого уровня — своя программа. Прогресс других уровней сохраняется.</p></section><section className="settingsCard"><label>Новых слов и фраз за 15 минут</label><div className="segmented three">{[['gentle','До 8'],['normal','До 12'],['more','До 16']].map(([value,label])=><button key={value} className={(settings.vocabPace||'normal')===value?'active':''} onClick={()=>changeSettings({vocabPace:value})}>{label}</button>)}</div><p>Настройка для следующего урока: предел, а не обязательная норма. В коротком уроке — до 4. Если справишься раньше, можно добавить ещё. Уже знакомые слова не занимают лимит.</p></section><section className="settingsCard"><label>Продолжительность урока</label><div className="segmented two">{[5,15].map(value=><button key={value} className={settings.minutes===value?'active':''} onClick={()=>changeSettings({minutes:value})}>{value} минут</button>)}</div><label>Цель на день</label><div className="segmented three">{[15,30,45].map(value=><button key={value} className={settings.dailyGoal===value?'active':''} onClick={()=>changeSettings({dailyGoal:value})}>{value} минут</button>)}</div></section><section className="explainCard"><strong>Сохранение прогресса</strong><p>Ответы и начатый урок сохраняются на устройстве. При доступе к интернету создаётся личная резервная копия. В Telegram ключ кабинета также сохраняется в твоём аккаунте.</p><button className="secondary big" onClick={()=>backUpNow({manual:true})} disabled={backup==='saving'}>{backup==='saving'?'Сохраняю…':saveMessage&&backup==='pending'?'Повторить сохранение':'Сохранить сейчас'}</button><p className={`manualSaveStatus ${backup}`} role="status" aria-live="polite">{saveMessage || 'Изменения сохраняются автоматически. Здесь можно вручную обновить и проверить личную копию.'}</p></section><p className="versionLabel">Версия 0.7.4 · {itemCount(settings.level)} слов и фраз на уровне {settings.level}</p></>}

    <footer className="saveStatus" role="status"><span className={`syncDot ${backup==='saved'?'synced':backup==='saving'?'syncing':'pending'}`}/>{backup==='saved'?'Прогресс сохранён на устройстве и в личной копии':backup==='saving'?'Сохраняю прогресс…':'Сохранено на устройстве · резервная копия ждёт связи'}</footer>
    <nav className="bottomNav" aria-label="Основные разделы">{[['home','Занятия','⌂'],['progress','Восхождение','↗'],['rewards','Подарки','♢'],['settings','Настройки','⚙']].map(([id,label,icon])=><button key={id} className={screen===id?'active':''} onClick={()=>setScreen(id)}><span>{icon}</span>{label}</button>)}</nav>
  </div>;
}

function Stat({value,label}) {return <div className="stat"><strong>{value}</strong><span>{label}</span></div>;}


export function VocabularyProgress({vocab,level}) {
  return <section className="vocabularyProgress"><div className="eyebrow">МОЙ СЛОВАРНЫЙ ЗАПАС · {level}</div><h2>{vocab.verified} <small>из {vocab.available} закреплено</small></h2>{vocab.verified===0&&vocab.introduced>0&&<p className="helper">Повторения сохранены. Ноль означает, что закрепление еще не подтверждено по новым правилам. Контрольная учтет подходящие прежние повторения.</p>}<div className="vocabularyMeter" role="progressbar" aria-label="Подтвержденное закрепление слов и фраз" aria-valuenow={vocab.verified} aria-valuemin={0} aria-valuemax={vocab.available}><i style={{width:(vocab.verified/Math.max(1,vocab.available)*100)+'%'}}/></div><div className="vocabularyNumbers"><span><b>{vocab.introduced}</b> встречалось в уроках</span><span><b>{vocab.remaining}</b> еще не встречалось</span><span><b>{vocab.ready || 0}</b> подготовлено к проверке</span><span><b>{vocab.due}</b> пора повторить</span></div><p>В словаре: {vocab.words} слов и {vocab.phrases} выражений. Во всей базе — {TOTAL_LEXICAL_UNITS} разных единиц; примеры и повторные задания не увеличивают это число.</p><p className="helper">Увидеть слово — еще не значит знать его. Для закрепления нужны самостоятельные ответы в разные дни и контрольная. База пока не охватывает словарный запас носителя: количество карточек не является оценкой уровня владения языком.</p></section>;
}




function Pairing({couple,onConnect,onRefresh}){const [code,setCode]=useState('');return <section className="settingsCard pairCard"><label>{couple.paired?'Кабинеты связаны ✓':'Связать кабинеты один раз'}</label>{couple.paired?<><p>Новости о занятиях, заработок и подарки приходят автоматически. Отправлять друг другу ссылки больше не нужно.</p><small>{couple.telegramNotifications?'Уведомления Telegram доступны при открытии через бота.':'Новости приходят внутри приложения. Для уведомлений при закрытом приложении ещё требуется подключение Telegram-бота.'}</small><button className="secondary big" onClick={onRefresh}>Обновить связь</button></>:<><p>На одном устройстве создай код, на другом введи его. Код нужен только при первом подключении.</p>{couple.code&&<div className="pairCode"><strong>{couple.code}</strong><small>Действует 15 минут</small></div>}<button className="secondary big" disabled={couple.busy} onClick={()=>onConnect()}>Создать код</button><form className="pairJoin" onSubmit={event=>{event.preventDefault();onConnect(code);}}><input aria-label="Код пары" value={code} maxLength={6} placeholder="Код из 6 символов" onChange={event=>setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g,''))}/><button className="primary" disabled={code.length!==6||couple.busy}>Связать</button></form></>}{couple.error&&<p className="errorText">{couple.error}</p>}</section>;}
