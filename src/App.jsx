import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LEVELS, PHRASES, VIDEOS, COLLOCATIONS, VERBS } from './data.js';
import { loadSettings, saveSettings, loadLevelProgress, saveLevelProgress, loadStats, saveStats } from './storage.js';

const ORDER = Object.fromEntries(LEVELS.map((x,i)=>[x,i]));
const now = () => Date.now();
const dayKey = () => new Date().toISOString().slice(0,10);
const shuffle = (a) => [...a].sort(() => Math.random() - .5);

function statusOf(p) { return p?.s || 'NEW'; }
function due(p) { return !p?.n || p.n <= now(); }

function updateItem(prev, id, result, mastered = false) {
  const old = prev[id] || { s:'NEW', c:0, w:0, n:0, l:0 };
  const correct = result === 'correct';
  let c = old.c + (correct ? 1 : 0), w = old.w + (correct ? 0 : 1);
  let s = mastered ? 'MASTERED' : old.s;
  if (!mastered) {
    if (!correct) s = 'LEARNING';
    else if (c >= 5 && w <= 1) s = 'MASTERED';
    else if (c >= 3) s = 'STABLE';
    else s = 'LEARNING';
  }
  const days = s === 'MASTERED' ? 21 : s === 'STABLE' ? 7 : correct ? 2 : 1;
  return { ...prev, [id]: { s, c, w, l: now(), n: now() + days*86400000 } };
}

function App() {
  const [ready,setReady] = useState(false);
  const [level,setLevel] = useState('B1');
  const [minutes,setMinutes] = useState(5);
  const [screen,setScreen] = useState('home');
  const [progress,setProgress] = useState({});
  const [stats,setStats] = useState({ totalMinutes:0,sessions:0,correct:0,answers:0,byDay:{} });
  const [session,setSession] = useState(null);
  const [translation,setTranslation] = useState(false);
  const [feedback,setFeedback] = useState(null);
  const [selected,setSelected] = useState(null);
  const timerRef = useRef(null);

  useEffect(()=>{ (async()=>{
    const s = await loadSettings();
    const lvl = s?.level || 'B1';
    setLevel(lvl); setMinutes(s?.minutes || 5);
    setProgress(await loadLevelProgress(lvl));
    setStats(await loadStats()); setReady(true);
  })(); },[]);

  useEffect(()=>{ if (!ready) return; (async()=>{
    await saveSettings({level,minutes});
    setProgress(await loadLevelProgress(level));
  })(); },[level,ready]);

  useEffect(()=>{ if (!session) return;
    timerRef.current = setInterval(()=>{
      setSession(s => {
        if (!s) return s;
        const left = Math.max(0, s.endsAt - now());
        if (left <= 0) {
          clearInterval(timerRef.current);
          const doneState={...s,left:0,done:true,recorded:true};
          queueMicrotask(()=>recordSession(doneState));
          return doneState;
        }
        return {...s,left};
      });
    },250);
    return ()=>clearInterval(timerRef.current);
  },[session?.startedAt]);

  const levelPhrases = useMemo(()=>PHRASES.filter(p=>p.level===level),[level]);
  const mastered = levelPhrases.filter(p=>statusOf(progress[p.id])==='MASTERED').length;
  const learning = levelPhrases.filter(p=>['LEARNING','STABLE'].includes(statusOf(progress[p.id]))).length;
  const reviewDue = levelPhrases.filter(p=>progress[p.id] && due(progress[p.id]) && statusOf(progress[p.id])!=='MASTERED').length;
  const today = stats.byDay?.[dayKey()] || {minutes:0,answers:0,correct:0};

  async function persist(next) { setProgress(next); await saveLevelProgress(level,next); }
  async function addAnswer(ok) {
    const d = dayKey();
    const next = {...stats, answers:stats.answers+1, correct:stats.correct+(ok?1:0), byDay:{...stats.byDay,[d]:{...(stats.byDay[d]||{minutes:0,answers:0,correct:0}),answers:(stats.byDay[d]?.answers||0)+1,correct:(stats.byDay[d]?.correct||0)+(ok?1:0)}}};
    setStats(next); await saveStats(next);
  }

  function choosePhrase(pmap=progress) {
    const dueItems = levelPhrases.filter(p=>pmap[p.id] && due(pmap[p.id]) && statusOf(pmap[p.id])!=='MASTERED');
    const fresh = levelPhrases.filter(p=>!pmap[p.id]);
    const learningItems = levelPhrases.filter(p=>pmap[p.id] && statusOf(pmap[p.id])!=='MASTERED');
    const pool = dueItems.length ? dueItems : fresh.length ? fresh : learningItems.length ? learningItems : levelPhrases;
    return shuffle(pool)[0];
  }

  function nextTask(s=session,pmap=progress) {
    const phrase = choosePhrase(pmap);
    const isNew = !pmap[phrase.id];
    const type = isNew ? 'intro' : (Math.random()>.5 ? 'recognition' : 'recall');
    setTranslation(false); setFeedback(null); setSelected(null);
    setSession({...s, item:phrase, type, step:(s?.step||0)+1});
  }

  function startSession(mode='mixed') {
    const startedAt = now();
    const base = {mode,startedAt,endsAt:startedAt+minutes*60000,left:minutes*60000,done:false,answers:0,correct:0,mastered:0,step:0};
    setScreen('session'); setSession(base);
    setTimeout(()=>nextTask(base),0);
  }

  async function markIntro(master) {
    const next = updateItem(progress, session.item.id, 'correct', master);
    await persist(next);
    setSession(s=>({...s,mastered:s.mastered+(master?1:0)}));
    nextTask({...session,mastered:session.mastered+(master?1:0)}, next);
  }

  function recognitionOptions(item) {
    const other = shuffle(levelPhrases.filter(p=>p.id!==item.id)).slice(0,3).map(x=>x.explanation);
    return shuffle([item.explanation,...other]);
  }
  const options = useMemo(()=>session?.item ? recognitionOptions(session.item) : [],[session?.item?.id, session?.step]);

  async function answerRecognition(opt) {
    if (feedback) return;
    const ok = opt===session.item.explanation;
    setSelected(opt); setFeedback(ok?'correct':'wrong');
    const next = updateItem(progress,session.item.id,ok?'correct':'wrong'); await persist(next); await addAnswer(ok);
    setSession(s=>({...s,answers:s.answers+1,correct:s.correct+(ok?1:0)}));
  }

  async function answerRecall(ok) {
    const next = updateItem(progress,session.item.id,ok?'correct':'wrong'); await persist(next); await addAnswer(ok);
    const s2={...session,answers:session.answers+1,correct:session.correct+(ok?1:0)}; setSession(s2); nextTask(s2,next);
  }

  async function recordSession(s) {
    const spent = Math.max(1, Math.round((now()-s.startedAt)/60000));
    const d=dayKey();
    setStats(prev=>{
      const next={...prev,totalMinutes:prev.totalMinutes+spent,sessions:prev.sessions+1,byDay:{...prev.byDay,[d]:{...(prev.byDay[d]||{minutes:0,answers:0,correct:0}),minutes:(prev.byDay[d]?.minutes||0)+spent}}};
      saveStats(next);
      return next;
    });
  }

  async function finishSession() {
    clearInterval(timerRef.current);
    await recordSession(session);
    setSession(s=>({...s,done:true,left:0,recorded:true}));
  }

  if (!ready) return <div className="splash">English for Two</div>;

  if (screen==='progress') return <Shell title="Progress" onBack={()=>setScreen('home')}><Progress level={level} stats={stats} phrases={levelPhrases} progress={progress}/></Shell>;
  if (screen==='videos' || screen==='listening') return <Shell title={screen==='videos'?'Video':'Listening'} onBack={()=>setScreen('home')}><VideoScreen level={level} listening={screen==='listening'}/></Shell>;
  if (screen==='words') return <Shell title="Words & Collocations" onBack={()=>setScreen('home')}><SimpleCards items={COLLOCATIONS}/></Shell>;
  if (screen==='verbs') return <Shell title="Irregular Verbs" onBack={()=>setScreen('home')}><VerbCards/></Shell>;
  if (screen==='session' && session) return <Session session={session} level={level} translation={translation} setTranslation={setTranslation} feedback={feedback} selected={selected} options={options} onRecognition={answerRecognition} onRecall={answerRecall} onIntro={markIntro} onNext={()=>nextTask()} onFinish={finishSession} onHome={()=>{clearInterval(timerRef.current);setScreen('home');setSession(null)}}/>;

  return <div className="app">
    <header className="hero">
      <div><div className="eyebrow">ENGLISH FOR TWO</div><h1>Build real English.</h1><p>Short, focused practice with phrases people actually use.</p></div>
      <button className="profile" aria-label="Profile">A+A</button>
    </header>

    <section className="card compact">
      <div className="sectionTitle">Your level</div>
      <div className="segmented">{LEVELS.map(l=><button key={l} onClick={()=>setLevel(l)} className={l===level?'active':''}>{l}</button>)}</div>
    </section>

    <section className="card compact">
      <div className="row between"><div className="sectionTitle">Session</div><span className="muted">Choose your pace</span></div>
      <div className="segmented two"><button onClick={()=>setMinutes(5)} className={minutes===5?'active':''}>5 min</button><button onClick={()=>setMinutes(15)} className={minutes===15?'active':''}>15 min</button></div>
      <button className="primary big" onClick={()=>startSession('mixed')}>Continue Learning</button>
    </section>

    <button className="progressCard" onClick={()=>setScreen('progress')}>
      <div><div className="eyebrow">PROGRESS</div><strong>{mastered}/{levelPhrases.length}</strong><span> mastered</span></div>
      <div className="progressRight"><span>Today {today.minutes||0} min</span><span>{reviewDue} review</span></div>
      <div className="bar"><i style={{width:`${Math.round(mastered/Math.max(1,levelPhrases.length)*100)}%`}}/></div>
    </button>

    <section className="modes">
      <Mode title="Phrases" text="Chunks in context" onClick={()=>startSession('phrases')}/>
      <Mode title="Listening" text="Real human speech" onClick={()=>setScreen('listening')}/>
      <Mode title="Words & Collocations" text="Useful combinations" onClick={()=>setScreen('words')}/>
      <Mode title="Irregular Verbs" text="Forms in context" onClick={()=>setScreen('verbs')}/>
      <Mode title="Video" text="Curated YouTube" onClick={()=>setScreen('videos')}/>
    </section>

    <div className="bottomNote">{learning} items in learning · Russian translation stays hidden until you ask for it.</div>
  </div>;
}

function Shell({title,onBack,children}) { return <div className="app"><div className="topbar"><button className="back" onClick={onBack}>←</button><strong>{title}</strong><span/></div>{children}</div>; }
function Mode({title,text,onClick}) { return <button className="mode" onClick={onClick}><div className="modeIcon">{title[0]}</div><div><strong>{title}</strong><span>{text}</span></div><b>›</b></button>; }

function Session({session,level,translation,setTranslation,feedback,selected,options,onRecognition,onRecall,onIntro,onNext,onFinish,onHome}) {
  if (session.done) return <div className="app"><div className="complete card"><div className="doneMark">✓</div><h1>Session complete</h1><p>{Math.max(1,Math.round((Date.now()-session.startedAt)/60000))} min · {session.answers} answers · {session.correct} correct · {session.mastered} mastered</p><button className="primary big" onClick={onHome}>Back home</button></div></div>;
  if (!session.item) return <div className="splash">Preparing...</div>;
  const mm=Math.floor(session.left/60000), ss=Math.floor((session.left%60000)/1000);
  return <div className="app sessionApp">
    <div className="topbar"><button className="back" onClick={onHome}>×</button><strong>{level} · {session.mode==='mixed'?'Mixed practice':'Phrases'}</strong><button className="timer" onClick={onFinish}>{mm}:{String(ss).padStart(2,'0')}</button></div>
    <div className="sessionProgress"><i style={{width:`${Math.min(100,100-session.left/(session.endsAt-session.startedAt)*100)}%`}}/></div>
    <main className="exercise">
      {session.type==='intro' && <>
        <div className="eyebrow">NEW PHRASE</div><h2 className="phrase">{session.item.phrase}</h2><p className="meaning">{session.item.explanation}</p>
        <div className="examples">{session.item.examples.map((e,i)=><div key={i}>{e}</div>)}</div>
        <button className="textButton" onClick={()=>setTranslation(!translation)}>{translation?'Hide translation':'Show translation'}</button>
        {translation && <div className="translation">{session.item.ru}</div>}
        <div className="actions twoActions"><button className="secondary" onClick={()=>onIntro(false)}>Continue</button><button className="primary" onClick={()=>onIntro(true)}>Already know it very well</button></div>
      </>}
      {session.type==='recognition' && <>
        <div className="eyebrow">RECOGNITION</div><h2 className="phrase">{session.item.phrase}</h2><p className="prompt">Choose the closest meaning.</p>
        <div className="options">{options.map((o,i)=><button key={i} className={`${selected===o?'selected ':''}${feedback?(o===session.item.explanation?'correct':selected===o?'wrong':''):''}`} onClick={()=>onRecognition(o)}>{o}</button>)}</div>
        {feedback && <div className={`feedback ${feedback}`}>{feedback==='correct'?'Correct.':'Not quite.'}<span>{session.item.explanation}</span><button className="primary" onClick={onNext}>Next</button></div>}
      </>}
      {session.type==='recall' && <Recall key={`${session.item.id}-${session.step}`} item={session.item} onAnswer={onRecall}/>}    
    </main>
  </div>;
}

function Recall({item,onAnswer}) {
  const [revealed,setRevealed]=useState(false); const [showRu,setShowRu]=useState(false);
  return <><div className="eyebrow">RECALL</div><p className="prompt">Think of a natural phrase for this idea:</p><h2 className="recallCue">{item.explanation}</h2><div className="examples faded">{item.examples.slice(0,1).map((e,i)=><div key={i}>{e.replace(item.phrase,'_____')}</div>)}</div>{!revealed?<button className="primary big" onClick={()=>setRevealed(true)}>Reveal answer</button>:<><div className="reveal">{item.phrase}</div><button className="textButton" onClick={()=>setShowRu(!showRu)}>{showRu?'Hide translation':'Show translation'}</button>{showRu&&<div className="translation">{item.ru}</div>}<div className="actions twoActions"><button className="secondary" onClick={()=>onAnswer(false)}>I didn’t remember</button><button className="primary" onClick={()=>onAnswer(true)}>I knew it</button></div></>}</>;
}

function Progress({level,stats,phrases,progress}) {
  const mastered=phrases.filter(p=>statusOf(progress[p.id])==='MASTERED').length;
  const stable=phrases.filter(p=>statusOf(progress[p.id])==='STABLE').length;
  const learning=phrases.filter(p=>statusOf(progress[p.id])==='LEARNING').length;
  const d=stats.byDay?.[dayKey()]||{}; const acc=stats.answers?Math.round(stats.correct/stats.answers*100):0;
  return <><section className="card progressHero"><div className="eyebrow">{level} LEVEL</div><h1>{mastered}/{phrases.length}</h1><p>phrases mastered</p><div className="bar bigbar"><i style={{width:`${mastered/phrases.length*100}%`}}/></div></section><div className="statsGrid"><Stat n={`${d.minutes||0}m`} t="Today"/><Stat n={`${stats.totalMinutes||0}m`} t="Total"/><Stat n={`${acc}%`} t="Accuracy"/><Stat n={stats.sessions||0} t="Sessions"/></div><section className="card"><div className="statusRow"><span>Mastered</span><b>{mastered}</b></div><div className="statusRow"><span>Stable</span><b>{stable}</b></div><div className="statusRow"><span>Learning</span><b>{learning}</b></div><div className="statusRow"><span>New</span><b>{phrases.length-mastered-stable-learning}</b></div></section></>;
}
function Stat({n,t}){return <div className="stat"><strong>{n}</strong><span>{t}</span></div>}

function VideoScreen({level,listening}) {
  const candidates=VIDEOS.filter(v=>ORDER[v.level]<=ORDER[level] || v.level===level);
  return <><div className="introText">{listening?'Listen to real human speech. After watching, come back and recall one phrase you heard.':'Curated English videos. No robotic TTS.'}</div><div className="videoList">{candidates.map(v=><a className="videoCard" key={v.id} href={v.url} target="_blank" rel="noreferrer"><div className="videoThumb">▶</div><div><div className="videoMeta">{v.level} · {v.accent} · {v.duration}</div><strong>{v.title}</strong><span>{v.channel}</span><p>{v.note}</p></div></a>)}</div></>;
}

function SimpleCards({items}) { const [open,setOpen]=useState(null); return <div className="simpleList">{items.map(x=><button className="simpleCard" key={x.id} onClick={()=>setOpen(open===x.id?null:x.id)}><strong>{x.phrase}</strong><span>{x.explanation}</span>{open===x.id&&<em>{x.ru}</em>}</button>)}</div>; }
function VerbCards(){return <div className="simpleList">{VERBS.map(v=><div className="verbCard" key={v.id}><strong>{v.base}</strong><span>{v.past}</span><span>{v.participle}</span></div>)}</div>}

export default App;
