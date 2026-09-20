import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AVAILABLE_BY_LEVEL, COLLOCATIONS, LISTENING_LESSONS, PHRASES, RULES, VERBS } from './catalog.js';
import {
  COURSE_SIZE,
  LEVELS,
  awardMilestone,
  balanceOf,
  checkpointCandidates,
  chooseTask,
  courseProgress,
  dayKey,
  isDue,
  redeem,
  reviewItem,
  shuffle
} from './learning.js';
import {
  inTelegram,
  loadLevelProgress,
  loadSettings,
  loadStats,
  loadWallet,
  saveLevelProgress,
  saveSettings,
  saveStats,
  saveWallet,
  subscribeSync
} from './storage-v3.js';

const DEFAULT_SETTINGS = { level: 'B1', minutes: 15, dailyGoal: 30 };
const EMPTY_STATS = { totalMinutes: 0, sessions: 0, correct: 0, answers: 0, byDay: {}, legacy: { totalMinutes: 0, sessions: 0, correct: 0, answers: 0 } };
const EMPTY_WALLET = { earned: {}, spent: {} };
const GIFTS = [
  { id: 'date', title: 'A date together', cost: 50, detail: 'Choose a place and plan an evening.' },
  { id: 'gift', title: 'A personal gift', cost: 100, detail: 'Choose a gift together within your agreement.' },
  { id: 'trip', title: 'A special trip', cost: 400, detail: 'A big shared reward after four milestones.' }
];

const levelItems = level => PHRASES.filter(item => item.level === level);
const uniqueId = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const formatMinutes = value => Number(value || 0).toLocaleString('en', { maximumFractionDigits: 0 });
const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function blankExample(item) {
  const example = item.examples?.find(Boolean) || item.explanation;
  const core = item.phrase.replace(/[.…!?]+$/g, '').trim();
  const pattern = new RegExp(escapeRegExp(core), 'i');
  if (pattern.test(example)) return example.replace(pattern, '_____');
  const words = core.split(/\s+/).filter(Boolean);
  const shorter = words.slice(0, Math.max(2, Math.min(words.length, 4))).join(' ');
  const shortPattern = new RegExp(escapeRegExp(shorter), 'i');
  return shortPattern.test(example) ? example.replace(shortPattern, '_____') : `Which phrase fits this idea? ${item.explanation}`;
}

function taskOptions(item, items, field) {
  const answer = field === 'phrase' ? item.phrase : item.explanation;
  const others = shuffle(items.filter(candidate => candidate.id !== item.id)).slice(0, 3).map(candidate => candidate[field]);
  return shuffle([answer, ...others]);
}

function withTask(base, items, progress) {
  const choice = chooseTask(items, progress, base);
  if (!choice) return { ...base, done: true };
  const task = {
    ...choice,
    options: choice.type === 'recognition'
      ? taskOptions(choice.item, items, 'explanation')
      : choice.type === 'context'
        ? taskOptions(choice.item, items, 'phrase')
        : []
  };
  return {
    ...base,
    step: base.step + 1,
    newCount: base.newCount + (task.type === 'intro' && !progress[task.item.id] ? 1 : 0),
    recent: [...base.recent, task.item.id].slice(-5),
    task,
    selected: null,
    feedback: null
  };
}

function App() {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [progress, setProgress] = useState({});
  const [stats, setStats] = useState(EMPTY_STATS);
  const [wallet, setWallet] = useState(EMPTY_WALLET);
  const [screen, setScreen] = useState('home');
  const [session, setSession] = useState(null);
  const [sync, setSync] = useState('local');
  const [checkpoint, setCheckpoint] = useState(null);
  const [notice, setNotice] = useState('');
  const progressRef = useRef(progress);
  const statsRef = useRef(stats);
  const walletRef = useRef(wallet);
  const loadToken = useRef(0);
  const tickRef = useRef(Date.now());
  const finishRef = useRef(null);
  const recordedSessions = useRef(new Set());

  useEffect(() => { progressRef.current = progress; }, [progress]);
  useEffect(() => { statsRef.current = stats; }, [stats]);
  useEffect(() => { walletRef.current = wallet; }, [wallet]);
  useEffect(() => subscribeSync(setSync), []);

  useEffect(() => {
    let active = true;
    (async () => {
      const saved = await loadSettings();
      const merged = { ...DEFAULT_SETTINGS, ...(saved || {}) };
      if (!LEVELS.includes(merged.level)) merged.level = 'B1';
      if (![5, 15].includes(Number(merged.minutes))) merged.minutes = 15;
      if (![15, 30, 45].includes(Number(merged.dailyGoal))) merged.dailyGoal = 30;
      const [loadedProgress, loadedStats, loadedWallet] = await Promise.all([
        loadLevelProgress(merged.level), loadStats(), loadWallet()
      ]);
      if (!active) return;
      setSettings(merged);
      setProgress(loadedProgress);
      setStats(loadedStats || EMPTY_STATS);
      setWallet(loadedWallet || EMPTY_WALLET);
      setReady(true);
    })();
    return () => { active = false; };
  }, []);

  const items = useMemo(() => levelItems(settings.level), [settings.level]);
  const path = useMemo(() => courseProgress(items, progress), [items, progress]);
  const practiceXp = useMemo(() => Object.values(progress).reduce((sum, item) => sum + (item?.xp || 0), 0), [progress]);
  const dueCount = useMemo(() => items.filter(item => isDue(progress[item.id])).length, [items, progress]);
  const today = stats.byDay?.[dayKey()] || {};
  const todayMinutes = Math.round((today.seconds || 0) / 60);
  const giftBalance = balanceOf(wallet);

  function commitStats(build) {
    const next = build(statsRef.current || EMPTY_STATS);
    statsRef.current = next;
    setStats(next);
    saveStats(next);
    return next;
  }

  function persistProgress(next) {
    progressRef.current = next;
    setProgress(next);
    saveLevelProgress(settings.level, next);
  }

  async function changeLevel(level) {
    if (level === settings.level || !LEVELS.includes(level)) return;
    const token = ++loadToken.current;
    setNotice('Loading your level…');
    const loaded = await loadLevelProgress(level);
    if (token !== loadToken.current) return;
    const next = { ...settings, level };
    setSettings(next);
    setProgress(loaded);
    progressRef.current = loaded;
    saveSettings(next);
    setNotice('');
  }

  function updateSettings(patch) {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
  }

  function startSession(minutes = settings.minutes) {
    const base = {
      id: uniqueId('session'),
      minutes,
      plannedMs: minutes * 60000,
      remainingMs: minutes * 60000,
      step: 0,
      newCount: 0,
      recent: [],
      answers: 0,
      correct: 0,
      xp: 0,
      done: false
    };
    tickRef.current = Date.now();
    setSession(withTask(base, items, progressRef.current));
    setScreen('session');
  }

  function recordAnswer(ok) {
    commitStats(current => {
      const key = dayKey();
      const before = current.byDay?.[key] || {};
      return {
        ...current,
        answers: (current.answers || 0) + 1,
        correct: (current.correct || 0) + (ok ? 1 : 0),
        byDay: {
          ...current.byDay,
          [key]: { ...before, answers: (before.answers || 0) + 1, correct: (before.correct || 0) + (ok ? 1 : 0), at: Date.now() }
        }
      };
    });
  }

  function finishSession(snapshot = session) {
    if (!snapshot || recordedSessions.current.has(snapshot.id)) return;
    recordedSessions.current.add(snapshot.id);
    const seconds = Math.max(0, Math.round((snapshot.plannedMs - snapshot.remainingMs) / 1000));
    if (seconds >= 20 || snapshot.answers > 0) {
      commitStats(current => {
        const key = dayKey();
        const before = current.byDay?.[key] || {};
        return {
          ...current,
          totalMinutes: (current.totalMinutes || 0) + seconds / 60,
          sessions: (current.sessions || 0) + 1,
          byDay: {
            ...current.byDay,
            [key]: { ...before, seconds: (before.seconds || 0) + seconds, sessions: (before.sessions || 0) + 1, at: Date.now() }
          }
        };
      });
    }
    setSession(current => current?.id === snapshot.id ? { ...current, done: true, remainingMs: snapshot.remainingMs, spentSeconds: seconds } : current);
  }
  finishRef.current = finishSession;

  useEffect(() => {
    if (screen !== 'session' || !session || session.done) return undefined;
    tickRef.current = Date.now();
    const onVisibility = () => { tickRef.current = Date.now(); };
    document.addEventListener('visibilitychange', onVisibility);
    const timer = window.setInterval(() => {
      const now = Date.now();
      const delta = document.hidden ? 0 : Math.max(0, now - tickRef.current);
      tickRef.current = now;
      if (!delta) return;
      setSession(current => {
        if (!current || current.done) return current;
        const remainingMs = Math.max(0, current.remainingMs - delta);
        const next = { ...current, remainingMs };
        if (remainingMs === 0) queueMicrotask(() => finishRef.current?.(next));
        return next;
      });
    }, 500);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [screen, session?.id, session?.done]);

  function nextTask(base = session, nextProgress = progressRef.current) {
    setSession(withTask({ ...base, selected: null, feedback: null }, items, nextProgress));
  }

  function applyIntro(action) {
    const current = session;
    const result = reviewItem(progressRef.current[current.task.item.id], action, Date.now(), `${current.id}:${current.step}:${action}`);
    const nextProgress = { ...progressRef.current, [current.task.item.id]: result.item };
    persistProgress(nextProgress);
    nextTask(current, nextProgress);
  }

  function answerTask(value) {
    const current = session;
    if (!current?.task || current.feedback) return;
    const { task } = current;
    const answer = task.type === 'recognition' ? task.item.explanation : task.item.phrase;
    const ok = value === answer;
    const action = ok ? task.type : 'wrong';
    const result = reviewItem(progressRef.current[task.item.id], action, Date.now(), `${current.id}:${current.step}:${action}`);
    const nextProgress = { ...progressRef.current, [task.item.id]: result.item };
    persistProgress(nextProgress);
    recordAnswer(ok);
    setSession({ ...current, selected: value, feedback: ok ? 'correct' : 'wrong', answers: current.answers + 1, correct: current.correct + (ok ? 1 : 0), xp: current.xp + result.xp });
  }

  function answerRecall(ok) {
    const current = session;
    const action = ok ? 'recall' : 'wrong';
    const result = reviewItem(progressRef.current[current.task.item.id], action, Date.now(), `${current.id}:${current.step}:${action}`);
    const nextProgress = { ...progressRef.current, [current.task.item.id]: result.item };
    persistProgress(nextProgress);
    recordAnswer(ok);
    const nextSession = { ...current, answers: current.answers + 1, correct: current.correct + (ok ? 1 : 0), xp: current.xp + result.xp };
    nextTask(nextSession, nextProgress);
  }

  function leaveSession() {
    finishSession(session);
    setSession(null);
    setScreen('home');
  }

  function openCheckpoint(quarter) {
    const candidates = checkpointCandidates(items, progress, quarter).map(item => ({ ...item, testOptions: taskOptions(item, items, 'phrase') }));
    if (candidates.length < 10) return;
    setCheckpoint({ quarter, items: candidates, index: 0, score: 0, selected: null, done: false, awarded: false });
    setScreen('checkpoint');
  }

  function answerCheckpoint(value) {
    if (!checkpoint || checkpoint.selected) return;
    const item = checkpoint.items[checkpoint.index];
    setCheckpoint({ ...checkpoint, selected: value, score: checkpoint.score + (value === item.phrase ? 1 : 0) });
  }

  function advanceCheckpoint() {
    if (!checkpoint?.selected) return;
    if (checkpoint.index < checkpoint.items.length - 1) {
      setCheckpoint({ ...checkpoint, index: checkpoint.index + 1, selected: null });
      return;
    }
    const nextWallet = awardMilestone(walletRef.current, settings.level, checkpoint.quarter, checkpoint.score, path.verified);
    const awarded = nextWallet !== walletRef.current;
    if (awarded) {
      walletRef.current = nextWallet;
      setWallet(nextWallet);
      saveWallet(nextWallet);
    }
    setCheckpoint({ ...checkpoint, done: true, awarded });
  }

  function buyGift(gift) {
    if (!window.confirm(`Use $${gift.cost} gift credit for “${gift.title}”?`)) return;
    const id = uniqueId(gift.id);
    const next = redeem(walletRef.current, gift, id);
    if (next === walletRef.current) return;
    walletRef.current = next;
    setWallet(next);
    saveWallet(next);
    setNotice(`${gift.title} added to your reward requests.`);
  }

  async function shareReward(text) {
    const message = `English for Two reward request: ${text}. I earned it with my learning milestones.`;
    try {
      if (navigator.share) await navigator.share({ text: message });
      else window.open(`https://t.me/share/url?url=${encodeURIComponent(location.origin)}&text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    } catch {}
  }

  if (!ready) return <div className="splash"><span>English for Two</span><small>Restoring your progress…</small></div>;

  if (screen === 'session' && session) return <SessionScreen session={session} level={settings.level} onIntro={applyIntro} onAnswer={answerTask} onRecall={answerRecall} onNext={() => nextTask()} onFinish={() => finishSession(session)} onLeave={leaveSession} onMore={startSession} />;
  if (screen === 'progress') return <Page title="Progress" onBack={() => setScreen('home')}><ProgressScreen level={settings.level} path={path} progress={progress} practiceXp={practiceXp} stats={stats} wallet={wallet} items={items} onCheckpoint={openCheckpoint} /></Page>;
  if (screen === 'rewards') return <Page title="Rewards" onBack={() => setScreen('home')}><RewardsScreen wallet={wallet} gifts={GIFTS} onBuy={buyGift} onShare={shareReward} /></Page>;
  if (screen === 'library') return <Page title="Phrase library" onBack={() => setScreen('home')}><LibraryScreen items={items} progress={progress} /></Page>;
  if (screen === 'rules') return <Page title="Grammar reference" onBack={() => setScreen('home')}><RulesScreen level={settings.level} /></Page>;
  if (screen === 'drills') return <Page title="Word practice" onBack={() => setScreen('home')}><DrillsScreen /></Page>;
  if (screen === 'listening') return <Page title="Listening" onBack={() => setScreen('home')}><ListeningScreen level={settings.level} /></Page>;
  if (screen === 'settings') return <Page title="Your plan" onBack={() => setScreen('home')}><SettingsScreen settings={settings} onLevel={changeLevel} onChange={updateSettings} /></Page>;
  if (screen === 'checkpoint' && checkpoint) return <Page title="Milestone check" onBack={() => setScreen('progress')}><CheckpointScreen checkpoint={checkpoint} onAnswer={answerCheckpoint} onNext={advanceCheckpoint} onDone={() => setScreen(checkpoint.awarded ? 'rewards' : 'progress')} /></Page>;

  return <div className="app homeApp">
    <header className="brandbar">
      <div className="brandmark">E2</div>
      <div><strong>English for Two</strong><span>{inTelegram() ? 'Personal Telegram course' : 'Browser practice mode'}</span></div>
      <button className="iconButton" onClick={() => setScreen('settings')} aria-label="Settings">⚙</button>
    </header>

    {notice && <button className="notice" onClick={() => setNotice('')}>{notice}</button>}

    <section className="levelStrip" aria-label="English level">
      {LEVELS.map(level => <button key={level} className={settings.level === level ? 'active' : ''} onClick={() => changeLevel(level)}>{level}</button>)}
    </section>

    <section className="todayCard">
      <div className="todayTop">
        <div><div className="eyebrow">TODAY</div><h1>{Math.max(0, settings.dailyGoal - todayMinutes)} min left</h1><p>{todayMinutes} of {settings.dailyGoal} min · {dueCount} reviews ready</p></div>
        <div className="dayRing" style={{ '--done': `${Math.min(100, todayMinutes / settings.dailyGoal * 100)}%` }}><span>{Math.min(100, Math.round(todayMinutes / settings.dailyGoal * 100))}%</span></div>
      </div>
      <div className="dailyBar"><i style={{ width: `${Math.min(100, todayMinutes / settings.dailyGoal * 100)}%` }} /></div>
      <button className="primary big" onClick={() => startSession(settings.minutes)}>Start {settings.minutes}-minute session</button>
      <button className="quietButton" onClick={() => startSession(settings.minutes === 15 ? 5 : 15)}>I only have {settings.minutes === 15 ? 5 : 15} minutes</button>
      <small>Finishing the daily goal never locks practice. You can continue as long as you want.</small>
    </section>

    <button className="routeCard" onClick={() => setScreen('progress')}>
      <div className="routeHeader"><div><span>{settings.level} route</span><strong>{path.points.toLocaleString()} / {path.targetPoints.toLocaleString()} course points</strong></div><b>{path.percent}%</b></div>
      <div className="routeBar"><i style={{ width: `${path.percent}%` }} /></div>
      <div className="routeMeta"><span>{path.verified} verified phrases</span><span>{path.verified >= COURSE_SIZE ? 'route complete' : `${Math.max(0, (Math.floor(path.verified / 100) + 1) * 100 - path.verified)} to next 25%`}</span></div>
      <div className="releaseNote">{path.available} of {COURSE_SIZE} planned units are currently published for {settings.level}.</div>
    </button>

    <div className="quickStats">
      <button onClick={() => setScreen('rewards')}><span>Gift balance</span><strong>${giftBalance}</strong></button>
      <button onClick={() => setScreen('progress')}><span>Practice XP</span><strong>{practiceXp}</strong></button>
      <button onClick={() => setScreen('library')}><span>Introduced</span><strong>{path.introduced}</strong></button>
    </div>

    <section className="menuList">
      <MenuButton icon="Aa" title="Phrase library" text={`${AVAILABLE_BY_LEVEL[settings.level]} real-life phrases with three examples`} onClick={() => setScreen('library')} />
      <MenuButton icon="▶" title="Listening" text="Human recordings and comprehension checks" onClick={() => setScreen('listening')} />
      <MenuButton icon="W" title="Words & verbs" text="Collocations and irregular verbs in active drills" onClick={() => setScreen('drills')} />
      <MenuButton icon="R" title="Grammar reference" text="Rules stay here, outside your normal sessions" onClick={() => setScreen('rules')} />
    </section>
    <footer><span className={`syncDot ${sync}`} />{sync === 'synced' ? 'Saved in Telegram' : sync === 'syncing' ? 'Saving…' : sync === 'pending' ? 'Saved on this phone; cloud retry pending' : sync === 'error' ? 'This phone is out of storage' : 'Saved on this device'}</footer>
  </div>;
}

function Page({ title, onBack, children }) {
  return <div className="app"><div className="topbar"><button className="back" onClick={onBack}>←</button><strong>{title}</strong><span /></div>{children}</div>;
}

function MenuButton({ icon, title, text, onClick }) {
  return <button className="menuButton" onClick={onClick}><span className="menuIcon">{icon}</span><span><strong>{title}</strong><small>{text}</small></span><b>›</b></button>;
}

function SessionScreen({ session, level, onIntro, onAnswer, onRecall, onNext, onFinish, onLeave, onMore }) {
  const [translation, setTranslation] = useState(false);
  useEffect(() => setTranslation(false), [session.task?.item.id, session.step]);
  if (session.done) return <div className="app"><section className="finishCard"><div className="finishIcon">✓</div><div className="eyebrow">SESSION COMPLETE</div><h1>{Math.max(1, Math.round((session.spentSeconds || 0) / 60))} minutes</h1><p>{session.answers} answers · {session.correct} correct · +{session.xp} practice XP</p><button className="primary big" onClick={() => onMore(15)}>Continue for 15 min</button><button className="secondary big" onClick={() => onMore(5)}>Another 5 min</button><button className="quietButton" onClick={onLeave}>Back home</button></section></div>;
  const task = session.task;
  if (!task) return <div className="splash">Preparing…</div>;
  const totalSeconds = Math.ceil(session.remainingMs / 1000);
  const mm = Math.floor(totalSeconds / 60);
  const ss = String(totalSeconds % 60).padStart(2, '0');
  return <div className="app sessionApp">
    <div className="topbar"><button className="back" onClick={onLeave}>×</button><strong>{level} · mixed practice</strong><button className="timer" onClick={onFinish}>{mm}:{ss}</button></div>
    <div className="sessionProgress"><i style={{ width: `${100 - session.remainingMs / session.plannedMs * 100}%` }} /></div>
    <main className="exercise">
      {task.early && <div className="earlyTag">EXTRA PRACTICE · NO COURSE POINTS YET</div>}
      {task.type === 'intro' && <>
        <div className="eyebrow">NEW PHRASE · {task.item.topic}</div>
        <h1 className="phrase">{task.item.phrase}</h1>
        <p className="meaning">{task.item.explanation}</p>
        <div className="speakPrompt">Say the phrase aloud. Then read the three real-life examples.</div>
        <div className="examples">{task.item.examples.map((example, index) => <div key={index}>{example}</div>)}</div>
        <button className="textButton" onClick={() => setTranslation(value => !value)}>{translation ? 'Hide Russian' : 'Show Russian'}</button>
        {translation && <div className="translation">{task.item.ru}</div>}
        <div className="actions twoActions"><button className="secondary" onClick={() => onIntro('intro')}>Continue</button><button className="primary" onClick={() => onIntro('known')}>I already know it very well</button></div>
        <small className="helper">“Already know” skips routine practice now, but schedules a control check in 30 days. It does not award course points.</small>
      </>}
      {task.type === 'recognition' && <ChoiceTask eyebrow="RECOGNITION" title={task.item.phrase} prompt="Choose the closest meaning." task={task} answer={task.item.explanation} onAnswer={onAnswer} onNext={onNext} session={session} />}
      {task.type === 'context' && <ChoiceTask eyebrow="CONTEXT" title={blankExample(task.item)} prompt="Choose the phrase that completes this real-life situation." task={task} answer={task.item.phrase} onAnswer={onAnswer} onNext={onNext} session={session} />}
      {task.type === 'recall' && <RecallTask item={task.item} onAnswer={onRecall} />}
    </main>
  </div>;
}

function ChoiceTask({ eyebrow, title, prompt, task, answer, onAnswer, onNext, session }) {
  return <>
    <div className="eyebrow">{eyebrow}</div><h1 className={eyebrow === 'CONTEXT' ? 'contextTitle' : 'phrase'}>{title}</h1><p className="prompt">{prompt}</p>
    <div className="options">{task.options.map(option => <button key={option} className={session.feedback ? option === answer ? 'correct' : session.selected === option ? 'wrong' : '' : ''} onClick={() => onAnswer(option)}>{option}</button>)}</div>
    {session.feedback && <div className={`feedback ${session.feedback}`}><strong>{session.feedback === 'correct' ? 'Correct.' : 'Not yet.'}</strong><span>{answer}</span><button className="primary" onClick={onNext}>Next</button></div>}
  </>;
}

function RecallTask({ item, onAnswer }) {
  const [revealed, setRevealed] = useState(false);
  const [translation, setTranslation] = useState(false);
  return <><div className="eyebrow">SPEAK & RECALL</div><p className="prompt">Say a natural English phrase aloud for this idea:</p><h1 className="recallCue">{item.explanation}</h1>{!revealed ? <button className="primary big" onClick={() => setRevealed(true)}>Reveal answer</button> : <><div className="reveal">{item.phrase}</div><div className="exampleAfter">{item.examples[0]}</div><button className="textButton" onClick={() => setTranslation(value => !value)}>{translation ? 'Hide Russian' : 'Show Russian'}</button>{translation && <div className="translation">{item.ru}</div>}<div className="actions twoActions"><button className="secondary" onClick={() => onAnswer(false)}>I didn’t remember</button><button className="primary" onClick={() => onAnswer(true)}>I remembered it</button></div></>}</>;
}

function ProgressScreen({ level, path, progress, practiceXp, stats, wallet, items, onCheckpoint }) {
  const earned = wallet.earned || {};
  const accuracy = stats.answers ? Math.round(stats.correct / stats.answers * 100) : 0;
  const nextQuarter = [1, 2, 3, 4].find(quarter => !earned[`route-2026-1:${level}:${quarter}`]);
  const checkpointReady = nextQuarter && checkpointCandidates(items, progress, nextQuarter).length === 10;
  return <>
    <section className="courseHero"><div className="eyebrow">{level} COURSE ROUTE</div><h1>{path.points.toLocaleString()} <small>/ {path.targetPoints.toLocaleString()}</small></h1><p>course points · {path.verified} knowledge units verified</p><div className="routeBar"><i style={{ width: `${path.percent}%` }} /></div><div className="routeMeta"><span>{path.percent}% of the full route</span><span>{path.available}/{path.total} content published</span></div></section>
    <section className="explainCard"><strong>What counts as learned?</strong><p>A phrase earns 10 course points only after correct recalls on at least four different days, two context checks, and a long-term check around day 30. Practice XP is separate.</p></section>
    <div className="statsGrid"><Stat value={practiceXp} label="Practice XP"/><Stat value={`${accuracy}%`} label="Accuracy"/><Stat value={Math.round(stats.totalMinutes || 0)} label="Total min"/><Stat value={Math.round(stats.sessions || 0)} label="Sessions"/></div>
    <section className="milestones">
      {[1,2,3,4].map(quarter => {
        const event = earned[`route-2026-1:${level}:${quarter}`];
        const needed = Math.max(0, quarter * 100 - path.verified);
        return <div className={event ? 'milestone earned' : 'milestone'} key={quarter}><span>{quarter * 25}%</span><div><strong>{event ? '$100 gift credit earned' : `${needed} verified units left`}</strong><small>{quarter * 100} units + an 8/10 checkpoint</small></div><b>{event ? '✓' : `$100`}</b></div>;
      })}
    </section>
    {checkpointReady && <button className="primary big" onClick={() => onCheckpoint(nextQuarter)}>Take the {nextQuarter * 25}% checkpoint</button>}
    {!checkpointReady && nextQuarter && <div className="lockedNote">Next checkpoint unlocks at {nextQuarter * 100} verified units. Repeating one easy card cannot move this number.</div>}
  </>;
}

function Stat({ value, label }) { return <div className="stat"><strong>{value}</strong><span>{label}</span></div>; }

function RewardsScreen({ wallet, gifts, onBuy, onShare }) {
  const balance = balanceOf(wallet);
  const history = Object.entries(wallet.spent || {}).sort((a,b) => b[1].at - a[1].at);
  return <>
    <section className="walletCard"><div className="eyebrow">PERSONAL GIFT BALANCE</div><h1>${balance}</h1><p>Gift dollars are a promise between Artur and Anya. They are not real money, a bank account, or an automatic payment.</p></section>
    <div className="giftList">{gifts.map(gift => <section className="giftCard" key={gift.id}><div><strong>{gift.title}</strong><p>{gift.detail}</p></div><span>${gift.cost}</span><button disabled={balance < gift.cost} onClick={() => onBuy(gift)}>{balance >= gift.cost ? 'Request reward' : `$${gift.cost - balance} more needed`}</button></section>)}</div>
    {history.length > 0 && <section className="history"><h2>Requests</h2>{history.map(([id, entry]) => <div key={id}><span><strong>{entry.title}</strong><small>Requested · {new Date(entry.at).toLocaleDateString()}</small></span><button onClick={() => onShare(entry.title)}>Share</button></div>)}</section>}
    <div className="lockedNote">A request is saved in this learner’s Telegram storage. Use Share to send it to the other person. The app cannot charge a card or transfer money.</div>
  </>;
}

function LibraryScreen({ items, progress }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(null);
  const filtered = items.filter(item => `${item.phrase} ${item.explanation} ${item.ru}`.toLowerCase().includes(query.toLowerCase()));
  return <><input className="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={`Search ${items.length} phrases`} /><div className="libraryList">{filtered.map(item => <button key={item.id} className="libraryItem" onClick={() => setOpen(open === item.id ? null : item.id)}><div><strong>{item.phrase}</strong><span>{item.explanation}</span></div><StatusPill item={progress[item.id]} />{open === item.id && <div className="libraryDetails"><em>{item.ru}</em>{item.examples.map((example,index) => <p key={index}>{example}</p>)}</div>}</button>)}</div></>;
}

function StatusPill({ item }) {
  if (!item) return <small className="pill new">New</small>;
  if (item.v) return <small className="pill verified">Verified</small>;
  if (item.known || item.s === 'MASTERED') return <small className="pill known">Self-known</small>;
  return <small className="pill learning">Learning</small>;
}

function RulesScreen({ level }) {
  const order = Object.fromEntries(LEVELS.map((item,index) => [item,index]));
  const visible = RULES.filter(rule => order[rule.level] <= order[level]);
  const [open, setOpen] = useState(visible[0]?.id);
  return <><div className="introText">This is a reference library. Grammar rules do not interrupt your normal phrase sessions.</div><div className="rulesList">{visible.map(rule => <button key={rule.id} onClick={() => setOpen(open === rule.id ? null : rule.id)}><span>{rule.level}</span><strong>{rule.title}</strong>{open === rule.id && <div><p>{rule.summary}</p>{rule.examples.map(example => <em key={example}>{example}</em>)}<small>{rule.note}</small></div>}</button>)}</div></>;
}

function DrillsScreen() {
  const [mode, setMode] = useState('collocations');
  return <><div className="segmented two"><button className={mode === 'collocations' ? 'active' : ''} onClick={() => setMode('collocations')}>Collocations</button><button className={mode === 'verbs' ? 'active' : ''} onClick={() => setMode('verbs')}>Irregular verbs</button></div>{mode === 'collocations' ? <MiniQuiz items={COLLOCATIONS} question={item => item.explanation} answer={item => item.phrase} /> : <VerbQuiz />}</>;
}

function MiniQuiz({ items, question, answer }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const item = items[index % items.length];
  const options = useMemo(() => shuffle([answer(item), ...shuffle(items.filter(candidate => candidate.id !== item.id)).slice(0,3).map(answer)]), [item.id]);
  const correct = answer(item);
  function next() { setIndex(value => value + 1); setSelected(null); }
  return <section className="drillCard"><div className="eyebrow">CHOOSE THE ENGLISH</div><h2>{question(item)}</h2><div className="options">{options.map(option => <button key={option} className={selected ? option === correct ? 'correct' : selected === option ? 'wrong' : '' : ''} onClick={() => setSelected(option)}>{option}</button>)}</div>{selected && <button className="primary big" onClick={next}>Next</button>}</section>;
}

function VerbQuiz() {
  const items = VERBS.flatMap(verb => ([
    { id:`${verb.id}-past`, prompt:`Past form of “${verb.base}”`, answer:verb.past },
    { id:`${verb.id}-part`, prompt:`Past participle of “${verb.base}”`, answer:verb.participle }
  ]));
  return <MiniQuiz items={items} question={item => item.prompt} answer={item => item.answer} />;
}

function ListeningScreen({ level }) {
  const order = Object.fromEntries(LEVELS.map((item,index) => [item,index]));
  const lessons = LISTENING_LESSONS.filter(lesson => order[lesson.level] <= order[level]);
  const [open, setOpen] = useState(null);
  const [answers, setAnswers] = useState({});
  return <><div className="introText">These lessons use real human recordings from the British Council. Open the audio, listen without reading first, then return for the checks.</div><div className="listeningList">{lessons.map(lesson => <section key={lesson.id} className="listeningCard"><div className="eyebrow">{lesson.level} · {lesson.source}</div><h2>{lesson.title}</h2><p>{lesson.note}</p><a href={lesson.url} target="_blank" rel="noreferrer">Open human recording ↗</a><button className="secondary" onClick={() => setOpen(open === lesson.id ? null : lesson.id)}>{open === lesson.id ? 'Hide checks' : 'I listened — check understanding'}</button>{open === lesson.id && <div className="listenQuestions">{lesson.questions.map((question,qIndex) => <div key={question.prompt}><strong>{qIndex + 1}. {question.prompt}</strong>{question.options.map((option,oIndex) => { const key=`${lesson.id}:${qIndex}`; const chosen=answers[key]; return <button key={option} className={chosen !== undefined ? oIndex === question.answer ? 'correct' : chosen === oIndex ? 'wrong' : '' : ''} onClick={() => setAnswers(current => ({...current,[key]:oIndex}))}>{option}</button>; })}</div>)}</div>}</section>)}</div></>;
}

function SettingsScreen({ settings, onLevel, onChange }) {
  return <><section className="settingsCard"><label>Current route</label><div className="segmented">{LEVELS.map(level => <button key={level} className={settings.level === level ? 'active' : ''} onClick={() => onLevel(level)}>{level}</button>)}</div></section><section className="settingsCard"><label>Default session</label><div className="segmented two">{[5,15].map(minutes => <button key={minutes} className={settings.minutes === minutes ? 'active' : ''} onClick={() => onChange({minutes})}>{minutes} min</button>)}</div></section><section className="settingsCard"><label>Daily target</label><div className="segmented three">{[15,30,45].map(minutes => <button key={minutes} className={settings.dailyGoal === minutes ? 'active' : ''} onClick={() => onChange({dailyGoal:minutes})}>{minutes} min</button>)}</div><p>30 minutes means two focused 15-minute sessions, for example during both commutes.</p></section><section className="explainCard"><strong>How the route works</strong><p>Each level is planned as 400 verified knowledge units. The progress bar is not an official CEFR certificate. It measures this course’s published and retained material.</p></section></>;
}

function CheckpointScreen({ checkpoint, onAnswer, onNext, onDone }) {
  if (checkpoint.done) return <section className="finishCard"><div className={checkpoint.awarded ? 'finishIcon' : 'finishIcon retry'}>{checkpoint.awarded ? '$' : '↻'}</div><div className="eyebrow">CHECKPOINT RESULT</div><h1>{checkpoint.score}/10</h1><p>{checkpoint.awarded ? '$100 gift credit has been added once to your personal balance.' : 'You need 8/10. Review the phrases and try again when you are ready.'}</p><button className="primary big" onClick={onDone}>{checkpoint.awarded ? 'Open rewards' : 'Back to progress'}</button></section>;
  const item = checkpoint.items[checkpoint.index];
  return <section className="checkpointCard"><div className="eyebrow">QUESTION {checkpoint.index + 1} OF 10</div><h2>{blankExample(item)}</h2><div className="options">{item.testOptions.map(option => <button key={option} className={checkpoint.selected ? option === item.phrase ? 'correct' : checkpoint.selected === option ? 'wrong' : '' : ''} onClick={() => onAnswer(option)}>{option}</button>)}</div>{checkpoint.selected && <button className="primary big" onClick={onNext}>{checkpoint.index === 9 ? 'Finish checkpoint' : 'Next question'}</button>}</section>;
}

export default App;
