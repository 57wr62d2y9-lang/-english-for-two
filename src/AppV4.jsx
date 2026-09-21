import React, { useEffect, useMemo, useRef, useState } from 'react';
import { COLLOCATIONS, LISTENING_LESSONS, PHRASES, RULES } from './catalog.js';
import {
  COURSE_SIZE, LEVELS, addGoal, awardMilestone, awardRoutine, balanceOf,
  checkpointCandidates, chooseTask, courseProgress, dayKey, isDue, redeem,
  resolveRequest, reviewItem, routineRewardId, shuffle, studySlot
} from './learning.js';
import {
  inTelegram, loadLevelProgress, loadSettings, loadStats, loadWallet,
  saveLevelProgress, saveSettings, saveStats, saveWallet, startParameter,
  subscribeSync, telegramProfile
} from './storage-v3.js';
import { translateToRussian } from './translation.js';

const DEFAULT_SETTINGS = { level: 'B1', minutes: 15, dailyGoal: 30, profileName: '', partnerName: '' };
const EMPTY_STATS = { totalMinutes: 0, sessions: 0, correct: 0, answers: 0, byDay: {}, legacy: { totalMinutes: 0, sessions: 0, correct: 0, answers: 0 } };
const EMPTY_WALLET = { earned: {}, spent: {}, goals: {}, incoming: {}, partner: null };
const BOT_LINK = 'https://t.me/EnglishArturBot';
const GIFT_IDEAS = [
  { id: 'date', title: 'Свидание', cost: 30, detail: 'Выбрать место и провести вечер вдвоём.' },
  { id: 'gift', title: 'Желанный подарок', cost: 60, detail: 'Конкретную вещь вы впишете сами.' },
  { id: 'trip', title: 'Небольшая поездка', cost: 150, detail: 'Большая цель за устойчивую привычку.' }
];

const levelItems = level => PHRASES.filter(item => item.level === level);
const uniqueId = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normaliseWallet = value => ({ ...EMPTY_WALLET, ...(value || {}), earned: value?.earned || {}, spent: value?.spent || {}, goals: value?.goals || {}, incoming: value?.incoming || {} });
const otherName = name => name === 'Anna' ? 'Artur' : 'Anna';

function profileFromTelegram() {
  const first = telegramProfile()?.firstName?.toLocaleLowerCase('ru') || '';
  if (/^(anna|anya|анна|аня)/.test(first)) return 'Anna';
  if (/^(artur|arthur|артур)/.test(first)) return 'Artur';
  return 'Artur';
}

function blankExample(item) {
  const example = item.examples?.find(Boolean) || item.explanation;
  const core = item.phrase.replace(/[.…!?]+$/g, '').trim();
  const pattern = new RegExp(escapeRegExp(core), 'i');
  if (pattern.test(example)) return example.replace(pattern, '_____');
  const words = core.split(/\s+/).filter(Boolean);
  const shorter = words.slice(0, Math.max(2, Math.min(words.length, 4))).join(' ');
  const shortPattern = new RegExp(escapeRegExp(shorter), 'i');
  return shortPattern.test(example) ? example.replace(shortPattern, '_____') : `Which phrase fits? ${item.explanation}`;
}

function taskOptions(item, items, field) {
  const answer = item[field];
  const others = shuffle(items.filter(candidate => candidate.id !== item.id)).slice(0, 3).map(candidate => candidate[field]);
  return shuffle([answer, ...others]);
}

function mixedTask(base, level) {
  const step = base.step;
  if (step > 0 && step % 9 === 0) {
    const levelIndex = LEVELS.indexOf(level);
    const lessons = LISTENING_LESSONS.filter(item => LEVELS.indexOf(item.level) <= levelIndex);
    const lesson = lessons[step % lessons.length];
    const question = lesson.questions[step % lesson.questions.length];
    return { type: 'listening', lesson, question, answer: question.options[question.answer], options: shuffle(question.options) };
  }
  if (step > 0 && step % 5 === 0) {
    const item = COLLOCATIONS[step % COLLOCATIONS.length];
    const options = shuffle([item.phrase, ...shuffle(COLLOCATIONS.filter(x => x.id !== item.id)).slice(0, 3).map(x => x.phrase)]);
    return { type: 'word', item, answer: item.phrase, options };
  }
  return null;
}

function withTask(base, items, progress, level) {
  const mixed = mixedTask(base, level);
  const choice = mixed || chooseTask(items, progress, base);
  if (!choice) return { ...base, done: true };
  const task = mixed || {
    ...choice,
    options: choice.type === 'recognition'
      ? taskOptions(choice.item, items, 'ru')
      : choice.type === 'context' ? taskOptions(choice.item, items, 'phrase') : []
  };
  return {
    ...base,
    step: base.step + 1,
    newCount: base.newCount + (task.type === 'intro' && !progress[task.item.id] ? 1 : 0),
    recent: task.item?.id ? [...base.recent, task.item.id].slice(-5) : base.recent,
    task, selected: null, feedback: null
  };
}

function encodePayload(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function decodePayload(value) {
  if (!value || value.length > 700 || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    const data = JSON.parse(new TextDecoder().decode(bytes));
    return data?.v === 1 ? data : null;
  } catch { return null; }
}

function importShared(wallet, payload) {
  if (!payload || !['Artur', 'Anna'].includes(payload.from)) return { wallet, notice: '' };
  if (payload.type === 'progress' && LEVELS.includes(payload.level)) {
    const partner = {
      name: payload.from, level: payload.level,
      percent: Math.max(0, Math.min(100, Number(payload.percent) || 0)),
      balance: Math.max(0, Number(payload.balance) || 0), at: Number(payload.at) || Date.now()
    };
    return { wallet: { ...wallet, partner }, notice: `Прогресс ${payload.from} обновлён.` };
  }
  if (payload.type === 'request' && /^[A-Za-z0-9:_-]{4,100}$/.test(payload.id || '') && Number.isInteger(payload.cost) && payload.cost > 0 && payload.cost <= 10000) {
    if (wallet.incoming?.[payload.id]) return { wallet, notice: 'Этот запрос уже сохранён.' };
    const incoming = { title: String(payload.title || '').slice(0, 60), cost: payload.cost, from: payload.from, at: Number(payload.at) || Date.now(), status: 'pending' };
    return { wallet: { ...wallet, incoming: { ...wallet.incoming, [payload.id]: incoming } }, notice: `${payload.from} прислал запрос на подарок.` };
  }
  if (payload.type === 'result' && wallet.spent?.[payload.id] && ['approved', 'rejected'].includes(payload.status)) {
    return { wallet: resolveRequest(wallet, payload.id, payload.status, Number(payload.at) || Date.now()), notice: payload.status === 'approved' ? `${payload.from} согласовал подарок.` : `${payload.from} отклонил запрос — баллы возвращены.` };
  }
  return { wallet, notice: '' };
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
      const profileName = ['Artur', 'Anna'].includes(saved?.profileName) ? saved.profileName : profileFromTelegram();
      const merged = { ...DEFAULT_SETTINGS, ...(saved || {}), profileName, partnerName: otherName(profileName) };
      if (!saved?.level || !LEVELS.includes(merged.level)) merged.level = profileName === 'Anna' ? 'A2' : 'B1';
      if (![5, 15].includes(Number(merged.minutes))) merged.minutes = 15;
      if (![15, 30, 45].includes(Number(merged.dailyGoal))) merged.dailyGoal = 30;
      const [loadedProgress, loadedStats, loadedWalletRaw] = await Promise.all([
        loadLevelProgress(merged.level), loadStats(), loadWallet()
      ]);
      if (!active) return;
      const loadedWallet = normaliseWallet(loadedWalletRaw);
      const imported = importShared(loadedWallet, decodePayload(startParameter()));
      setSettings(merged);
      setProgress(loadedProgress);
      setStats(loadedStats || EMPTY_STATS);
      setWallet(imported.wallet);
      walletRef.current = imported.wallet;
      if (imported.wallet !== loadedWallet) saveWallet(imported.wallet);
      saveSettings(merged);
      setNotice(imported.notice);
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
  const morningDone = Boolean(wallet.earned?.[`routine:${dayKey()}:morning`]);
  const eveningDone = Boolean(wallet.earned?.[`routine:${dayKey()}:evening`]);

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

  function persistWallet(next) {
    walletRef.current = next;
    setWallet(next);
    saveWallet(next);
  }

  async function changeLevel(level) {
    if (level === settings.level || !LEVELS.includes(level)) return;
    const token = ++loadToken.current;
    setNotice('Загружаю маршрут…');
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
    if (patch.profileName) next.partnerName = otherName(patch.profileName);
    setSettings(next);
    saveSettings(next);
  }

  function startSession(minutes = settings.minutes) {
    const base = {
      id: uniqueId('session'), minutes, plannedMs: minutes * 60000,
      remainingMs: minutes * 60000, step: 0, newCount: 0, recent: [],
      answers: 0, correct: 0, xp: 0, done: false
    };
    tickRef.current = Date.now();
    setSession(withTask(base, items, progressRef.current, settings.level));
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
        byDay: { ...current.byDay, [key]: { ...before, answers: (before.answers || 0) + 1, correct: (before.correct || 0) + (ok ? 1 : 0), at: Date.now() } }
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
          byDay: { ...current.byDay, [key]: { ...before, seconds: (before.seconds || 0) + seconds, sessions: (before.sessions || 0) + 1, at: Date.now() } }
        };
      });
    }
    const completed = { ...snapshot, spentSeconds: seconds };
    const reward = awardRoutine(walletRef.current, completed);
    if (reward.wallet !== walletRef.current) persistWallet(reward.wallet);
    setSession(current => current?.id === snapshot.id ? {
      ...current, done: true, remainingMs: snapshot.remainingMs,
      spentSeconds: seconds, routineReward: reward.awarded, rewardSlot: reward.slot
    } : current);
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
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisibility); };
  }, [screen, session?.id, session?.done]);

  function nextTask(base = session, nextProgress = progressRef.current) {
    setSession(withTask({ ...base, selected: null, feedback: null }, items, nextProgress, settings.level));
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
    if (['word', 'listening'].includes(task.type)) {
      const ok = value === task.answer;
      recordAnswer(ok);
      setSession({ ...current, selected: value, feedback: ok ? 'correct' : 'wrong', answers: current.answers + 1, correct: current.correct + (ok ? 1 : 0), xp: current.xp + (ok ? 2 : 0) });
      return;
    }
    const answer = task.type === 'recognition' ? task.item.ru : task.item.phrase;
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
    nextTask({ ...current, answers: current.answers + 1, correct: current.correct + (ok ? 1 : 0), xp: current.xp + result.xp }, nextProgress);
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
    if (awarded) persistWallet(nextWallet);
    setCheckpoint({ ...checkpoint, done: true, awarded });
  }

  async function sharePayload(payload, text) {
    const url = `${BOT_LINK}?startapp=${encodePayload({ v: 1, ...payload })}`;
    try {
      if (navigator.share) await navigator.share({ title: 'English for Two', text, url });
      else {
        const share = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
        if (window.Telegram?.WebApp?.openTelegramLink) window.Telegram.WebApp.openTelegramLink(share);
        else window.open(share, '_blank', 'noopener,noreferrer');
      }
    } catch {}
  }

  function shareProgress() {
    sharePayload(
      { type: 'progress', from: settings.profileName, level: settings.level, percent: path.percent, balance: giftBalance, at: Date.now() },
      `${settings.profileName}: уровень ${settings.level}, прогресс ${path.percent}%, баланс подарков $${giftBalance}. Открой ссылку, чтобы обновить мой прогресс.`
    );
  }

  function createGoal(title, cost) {
    const next = addGoal(walletRef.current, title, Math.round(Number(cost)), uniqueId('goal'));
    if (next === walletRef.current) return false;
    persistWallet(next);
    setNotice('Личная цель добавлена.');
    return true;
  }

  function sendRequest(id, entry) {
    sharePayload(
      { type: 'request', id, title: entry.title, cost: entry.cost, from: settings.profileName, at: entry.at || Date.now() },
      `${settings.profileName} накопил(а) $${entry.cost} и хочет подарок «${entry.title}». Открой ссылку, чтобы согласовать.`
    );
  }

  function requestGoal(goal) {
    const id = uniqueId('request');
    let next = redeem(walletRef.current, goal, id);
    if (next === walletRef.current) return;
    next = { ...next, spent: { ...next.spent, [id]: { ...next.spent[id], from: settings.profileName } } };
    persistWallet(next);
    sendRequest(id, next.spent[id]);
  }

  function resolveIncoming(id, status) {
    const entry = walletRef.current.incoming?.[id];
    if (!entry || !['approved', 'rejected'].includes(status)) return;
    const next = { ...walletRef.current, incoming: { ...walletRef.current.incoming, [id]: { ...entry, status, resolvedAt: Date.now() } } };
    persistWallet(next);
    sharePayload(
      { type: 'result', id, status, from: settings.profileName, at: Date.now() },
      status === 'approved' ? `${settings.profileName} согласовал(а) подарок «${entry.title}».` : `${settings.profileName} пока не согласовал(а) подарок «${entry.title}». Баллы вернутся после открытия ссылки.`
    );
  }

  if (!ready) return <div className="splash"><img src="/suslik-logo.jpeg" alt=""/><span>English for Two</span><small>Возвращаю твой прогресс…</small></div>;

  if (screen === 'session' && session) return <SessionScreen session={session} level={settings.level} onIntro={applyIntro} onAnswer={answerTask} onRecall={answerRecall} onNext={() => nextTask()} onFinish={() => finishSession(session)} onLeave={leaveSession} onMore={startSession} onShare={shareProgress} />;
  if (screen === 'progress') return <Page title="Мой прогресс" onBack={() => setScreen('home')}><ProgressScreen level={settings.level} path={path} progress={progress} practiceXp={practiceXp} stats={stats} wallet={wallet} items={items} onCheckpoint={openCheckpoint} /></Page>;
  if (screen === 'rewards') return <Page title="Подарки" onBack={() => setScreen('home')}><RewardsScreen profileName={settings.profileName} wallet={wallet} ideas={GIFT_IDEAS} onCreate={createGoal} onRequest={requestGoal} onResend={sendRequest} onResolve={resolveIncoming} onShareProgress={shareProgress} /></Page>;
  if (screen === 'rules') return <Page title="Справочник" onBack={() => setScreen('home')}><RulesScreen level={settings.level} /></Page>;
  if (screen === 'settings') return <Page title="Личный кабинет" onBack={() => setScreen('home')}><SettingsScreen settings={settings} onLevel={changeLevel} onChange={updateSettings} /></Page>;
  if (screen === 'checkpoint' && checkpoint) return <Page title="Проверка этапа" onBack={() => setScreen('progress')}><CheckpointScreen checkpoint={checkpoint} onAnswer={answerCheckpoint} onNext={advanceCheckpoint} onDone={() => setScreen(checkpoint.awarded ? 'rewards' : 'progress')} /></Page>;

  const slot = studySlot();
  const slotDone = slot === 'morning' ? morningDone : eveningDone;
  const nextMini = Math.min(COURSE_SIZE, Math.max(20, Math.ceil((path.introduced + 1) / 20) * 20));
  const miniLeft = Math.max(0, nextMini - path.introduced);
  return <div className="app homeApp">
    <header className="brandbar">
      <img className="brandmark photo" src="/suslik-logo.jpeg" alt="Суслик English for Two" />
      <div><strong>Привет, {settings.profileName}!</strong><span>English for Two · личный кабинет</span></div>
      <button className="iconButton" onClick={() => setScreen('settings')} aria-label="Настройки">⚙</button>
    </header>

    {notice && <button className="notice" onClick={() => setNotice('')}>{notice}</button>}
    <section className="profileLine"><span><b>{settings.level}</b> текущий уровень</span><button onClick={() => setScreen('progress')}>{COURSE_SIZE - path.verified} до полного маршрута →</button></section>

    <section className="todayCard">
      <div className="todayTop">
        <div><div className="eyebrow">СЕГОДНЯ · {slot === 'morning' ? 'УТРО' : 'ВЕЧЕР'}</div><h1>{Math.max(0, settings.dailyGoal - todayMinutes)} минут</h1><p>{todayMinutes} из {settings.dailyGoal} · повторений: {dueCount}</p></div>
        <div className="dayRing" style={{ '--done': `${Math.min(100, todayMinutes / settings.dailyGoal * 100)}%` }}><span>{Math.min(100, Math.round(todayMinutes / settings.dailyGoal * 100))}%</span></div>
      </div>
      <div className="slotRow"><span className={morningDone ? 'done' : ''}>☀ Утро {morningDone ? '+$1 ✓' : '$1'}</span><span className={eveningDone ? 'done' : ''}>☾ Вечер {eveningDone ? '+$1 ✓' : '$1'}</span></div>
      <button className="primary big" onClick={() => startSession(settings.minutes)}>{slotDone ? `Заниматься ${settings.minutes} минут` : `Начать ${settings.minutes} минут · заработать $1`}</button>
      <button className="quietButton" onClick={() => startSession(5)}>Короткое занятие на 5 минут</button>
      <small>$1 начисляется один раз утром и один раз вечером, если пройти не меньше 80% занятия и дать минимум 5 ответов. После цели можно продолжать без ограничений.</small>
    </section>

    <button className="routeCard" onClick={() => setScreen('progress')}>
      <div className="routeHeader"><div><span>Ближайшая понятная цель</span><strong>{miniLeft ? `Ещё ${miniLeft} новых единиц до ${nextMini}` : 'Цель выполнена'}</strong></div><b>{path.percent}%</b></div>
      <div className="routeBar"><i style={{ width: `${Math.min(100, path.introduced / nextMini * 100)}%` }} /></div>
      <div className="routeMeta"><span>{path.introduced} встречено</span><span>{path.verified} закреплено надолго</span></div>
      <div className="releaseNote">Реалистичный темп: 2 новых единицы за поездку, около 80–120 в месяц. Повторы автоматически идут на 1, 3, 5, 8, 12, 30, 60 и 90-й день.</div>
    </button>

    {wallet.partner && <section className="partnerCard"><div><span>{wallet.partner.name}</span><strong>{wallet.partner.level} · {wallet.partner.percent}%</strong><small>Баланс целей ${wallet.partner.balance} · обновлено {new Date(wallet.partner.at).toLocaleDateString('ru')}</small></div><button onClick={shareProgress}>Обновить мой</button></section>}
    <div className="quickStats">
      <button onClick={() => setScreen('rewards')}><span>Подарки</span><strong>${giftBalance}</strong></button>
      <button onClick={() => setScreen('progress')}><span>Очки практики</span><strong>{practiceXp}</strong></button>
      <button onClick={shareProgress}><span>Для {settings.partnerName}</span><strong>↗</strong></button>
    </div>
    <button className="referenceButton" onClick={() => setScreen('rules')}><span>Грамматический справочник</span><b>→</b></button>
    <footer><span className={`syncDot ${sync}`} />{sync === 'synced' ? 'Прогресс сохранён в Telegram' : sync === 'syncing' ? 'Сохраняю…' : sync === 'pending' ? 'Сохранено на телефоне; Telegram повторит синхронизацию' : sync === 'error' ? 'На телефоне закончилось место' : inTelegram() ? 'Хранится в твоём Telegram' : 'Хранится на этом устройстве'}</footer>
  </div>;
}

function Page({ title, onBack, children }) {
  return <div className="app"><div className="topbar"><button className="back" onClick={onBack}>←</button><strong>{title}</strong><span /></div>{children}</div>;
}

function SessionScreen({ session, level, onIntro, onAnswer, onRecall, onNext, onFinish, onLeave, onMore, onShare }) {
  if (session.done) {
    const qualified = (session.spentSeconds || 0) >= (session.plannedMs / 1000) * .8 && session.answers >= 5;
    return <div className="app"><section className="finishCard"><div className="finishIcon">✓</div><div className="eyebrow">ЗАНЯТИЕ ЗАВЕРШЕНО</div><h1>{Math.max(1, Math.round((session.spentSeconds || 0) / 60))} мин</h1><p>{session.answers} ответов · {session.correct} верных · +{session.xp} очков</p>{session.routineReward ? <div className="rewardWon">+$1 в копилку за {session.rewardSlot === 'morning' ? 'утреннее' : 'вечернее'} занятие</div> : !qualified ? <div className="rewardHint">Для $1 нужно пройти 80% времени и дать минимум 5 ответов.</div> : <div className="rewardHint">Награда за эту часть дня уже была получена.</div>}<button className="primary big" onClick={() => onMore(15)}>Продолжить ещё 15 минут</button><button className="secondary big" onClick={onShare}>Показать прогресс партнёру</button><button className="quietButton" onClick={onLeave}>На главную</button></section></div>;
  }
  const task = session.task;
  if (!task) return <div className="splash">Готовлю задание…</div>;
  const totalSeconds = Math.ceil(session.remainingMs / 1000);
  const mm = Math.floor(totalSeconds / 60);
  const ss = String(totalSeconds % 60).padStart(2, '0');
  return <div className="app sessionApp">
    <div className="topbar"><button className="back" onClick={onLeave}>×</button><strong>{level} · ежедневный микс</strong><button className="timer" onClick={onFinish}>{mm}:{ss}</button></div>
    <div className="sessionProgress"><i style={{ width: `${100 - session.remainingMs / session.plannedMs * 100}%` }} /></div>
    <main className="exercise">
      {task.early && <div className="earlyTag">ДОПОЛНИТЕЛЬНЫЙ ПОВТОР · БЕЗ НОВЫХ ОЧКОВ</div>}
      {task.type === 'intro' && <>
        <div className="eyebrow">НОВАЯ ФРАЗА · {task.item.topic}</div>
        <h1 className="phrase">{task.item.phrase}</h1>
        <div className="translation mainTranslation">{task.item.ru}</div>
        <p className="meaning">{task.item.explanation}</p>
        <div className="speakPrompt">Произнеси фразу вслух и просмотри три жизненных примера.</div>
        <div className="examples">{task.item.examples.map((example, index) => <TranslatedExample key={index} text={example} />)}</div>
        <div className="actions twoActions"><button className="primary" onClick={() => onIntro('intro')}>Далее — учить</button><button className="secondary dangerText" onClick={() => onIntro('known')}>Очень хорошо знаю</button></div>
        <small className="helper">«Очень хорошо знаю» навсегда уберёт фразу из повторений и не добавит её в подтверждённый прогресс.</small>
      </>}
      {task.type === 'recognition' && <ChoiceTask eyebrow="УЗНАЙ ЗНАЧЕНИЕ" title={task.item.phrase} prompt="Выбери русский перевод." task={task} answer={task.item.ru} onAnswer={onAnswer} onNext={onNext} session={session} />}
      {task.type === 'context' && <ChoiceTask eyebrow="ФРАЗА В СИТУАЦИИ" title={blankExample(task.item)} prompt={`Подсказка: ${task.item.ru}`} task={task} answer={task.item.phrase} onAnswer={onAnswer} onNext={onNext} session={session} />}
      {task.type === 'recall' && <RecallTask item={task.item} onAnswer={onRecall} />}
      {task.type === 'word' && <ChoiceTask eyebrow="СЛОВА ВМЕСТЕ" title={task.item.ru} prompt={task.item.explanation} task={task} answer={task.answer} onAnswer={onAnswer} onNext={onNext} session={session} />}
      {task.type === 'listening' && <ListeningTask task={task} session={session} onAnswer={onAnswer} onNext={onNext} />}
    </main>
  </div>;
}

function ChoiceTask({ eyebrow, title, prompt, task, answer, onAnswer, onNext, session }) {
  return <><div className="eyebrow">{eyebrow}</div><h1 className={eyebrow === 'ФРАЗА В СИТУАЦИИ' ? 'contextTitle' : 'phrase'}>{title}</h1><p className="prompt">{prompt}</p><div className="options">{task.options.map(option => <button key={option} className={session.feedback ? option === answer ? 'correct' : session.selected === option ? 'wrong' : '' : ''} onClick={() => onAnswer(option)}>{option}</button>)}</div>{session.feedback && <div className={`feedback ${session.feedback}`}><strong>{session.feedback === 'correct' ? 'Верно.' : 'Пока нет.'}</strong><span>{answer}</span><button className="primary" onClick={onNext}>Далее</button></div>}</>;
}

function RecallTask({ item, onAnswer }) {
  const [revealed, setRevealed] = useState(false);
  return <><div className="eyebrow">СКАЖИ ВСЛУХ</div><p className="prompt">Как сказать по-английски?</p><h1 className="recallCue">{item.ru}</h1>{!revealed ? <button className="primary big" onClick={() => setRevealed(true)}>Показать ответ</button> : <><div className="reveal">{item.phrase}</div><TranslatedExample text={item.examples[0]} /><div className="actions twoActions"><button className="secondary" onClick={() => onAnswer(false)}>Не вспомнил</button><button className="primary" onClick={() => onAnswer(true)}>Вспомнил</button></div></>}</>;
}

function TranslatedExample({ text }) {
  const [ru, setRu] = useState('Перевожу пример…');
  useEffect(() => {
    let active = true;
    translateToRussian(text).then(value => { if (active) setRu(value); }).catch(() => { if (active) setRu('Русский перевод временно недоступен. Основное значение фразы указано выше.'); });
    return () => { active = false; };
  }, [text]);
  return <div className="examplePair"><strong>{text}</strong><span>{ru}</span></div>;
}

function ListeningTask({ task, session, onAnswer, onNext }) {
  return <><div className="eyebrow">АУДИРОВАНИЕ · {task.lesson.source}</div><h1 className="contextTitle">{task.lesson.title}</h1><p className="prompt">Открой аудио, послушай без текста и вернись к вопросу.</p><a className="audioLink" href={task.lesson.url} target="_blank" rel="noreferrer">Открыть живую запись ↗</a><TranslatedText text={task.question.prompt} /><div className="options">{task.options.map(option => <button key={option} className={session.feedback ? option === task.answer ? 'correct' : session.selected === option ? 'wrong' : '' : ''} onClick={() => onAnswer(option)}>{option}</button>)}</div>{session.feedback && <div className={`feedback ${session.feedback}`}><strong>{session.feedback === 'correct' ? 'Верно.' : 'Правильный ответ:'}</strong><span>{task.answer}</span><button className="primary" onClick={onNext}>Далее</button></div>}</>;
}

function TranslatedText({ text }) {
  const [ru, setRu] = useState('Перевожу…');
  useEffect(() => {
    let active = true;
    translateToRussian(text).then(value => { if (active) setRu(value); }).catch(() => { if (active) setRu(text); });
    return () => { active = false; };
  }, [text]);
  return <div className="listeningPrompt"><strong>{text}</strong><span>{ru}</span></div>;
}

function ProgressScreen({ level, path, progress, practiceXp, stats, wallet, items, onCheckpoint }) {
  const earned = wallet.earned || {};
  const accuracy = stats.answers ? Math.round(stats.correct / stats.answers * 100) : 0;
  const nextQuarter = [1, 2, 3, 4].find(quarter => !earned[`route-2026-1:${level}:${quarter}`]);
  const checkpointReady = nextQuarter && checkpointCandidates(items, progress, nextQuarter).length === 10;
  const nextLevel = { A2: 'B1', B1: 'B2', B2: 'C1', C1: 'Свободное владение' }[level];
  return <>
    <section className="courseHero"><div className="eyebrow">МАРШРУТ {level} → {nextLevel}</div><h1>{path.points.toLocaleString()} <small>/ {path.targetPoints.toLocaleString()}</small></h1><p>очков курса · {path.verified} единиц закреплено</p><div className="routeBar"><i style={{ width: `${path.percent}%` }} /></div><div className="routeMeta"><span>{path.percent}% маршрута</span><span>ещё {Math.max(0, COURSE_SIZE - path.verified)}</span></div></section>
    <section className="explainCard"><strong>Понятная ближайшая цель</strong><p>Каждые 20 новых единиц — маленький этап. Два новых элемента за поездку дают устойчивый темп около 80–120 в месяц; точное число зависит от очереди повторений.</p></section>
    <div className="statsGrid"><Stat value={practiceXp} label="Очки практики"/><Stat value={`${accuracy}%`} label="Точность"/><Stat value={Math.round(stats.totalMinutes || 0)} label="Всего минут"/><Stat value={Math.round(stats.sessions || 0)} label="Занятий"/></div>
    <section className="milestones">{[1,2,3,4].map(quarter => { const event = earned[`route-2026-1:${level}:${quarter}`]; const needed = Math.max(0, quarter * 100 - path.verified); return <div className={event ? 'milestone earned' : 'milestone'} key={quarter}><span>{quarter * 25}%</span><div><strong>{event ? '$100 уже начислены' : `Ещё ${needed} закреплённых единиц`}</strong><small>{quarter * 100} единиц + проверка 8/10</small></div><b>{event ? '✓' : '$100'}</b></div>; })}</section>
    {checkpointReady && <button className="primary big" onClick={() => onCheckpoint(nextQuarter)}>Пройти проверку этапа {nextQuarter * 25}%</button>}
    {!checkpointReady && nextQuarter && <div className="lockedNote">Проверка откроется после {nextQuarter * 100} действительно закреплённых единиц. Повторение одной лёгкой карточки не накручивает прогресс.</div>}
  </>;
}

function Stat({ value, label }) { return <div className="stat"><strong>{value}</strong><span>{label}</span></div>; }

function RewardsScreen({ profileName, wallet, ideas, onCreate, onRequest, onResend, onResolve, onShareProgress }) {
  const [title, setTitle] = useState('');
  const [cost, setCost] = useState('');
  const balance = balanceOf(wallet);
  const goals = Object.entries(wallet.goals || {}).sort((a,b) => b[1].at - a[1].at);
  const history = Object.entries(wallet.spent || {}).sort((a,b) => b[1].at - a[1].at);
  const incoming = Object.entries(wallet.incoming || {}).sort((a,b) => b[1].at - a[1].at);
  function submit(event) {
    event.preventDefault();
    if (onCreate(title, cost)) { setTitle(''); setCost(''); }
  }
  return <>
    <section className="walletCard"><div className="eyebrow">КОПИЛКА {profileName.toUpperCase()}</div><h1>${balance}</h1><p>Это игровые доллары — обещание между вами, а не настоящие деньги и не банковский счёт.</p></section>
    {wallet.partner && <section className="partnerCard"><div><span>{wallet.partner.name}</span><strong>{wallet.partner.level} · {wallet.partner.percent}%</strong><small>В копилке ${wallet.partner.balance}</small></div><button onClick={onShareProgress}>Мой прогресс</button></section>}
    <form className="goalForm" onSubmit={submit}><h2>Моя цель</h2><p>Впиши конкретную вещь, свидание или поездку.</p><input value={title} onChange={event => setTitle(event.target.value)} maxLength="60" placeholder="Например: наушники" required/><div><input value={cost} onChange={event => setCost(event.target.value.replace(/\D/g,''))} inputMode="numeric" placeholder="Цена в $" required/><button className="primary" type="submit">Добавить</button></div></form>
    {goals.length > 0 && <div className="giftList">{goals.map(([id, goal]) => <section className="giftCard" key={id}><div><strong>{goal.title}</strong><p>Накоплено ${Math.min(balance, goal.cost)} из ${goal.cost}</p></div><span>${goal.cost}</span><div className="goalBar"><i style={{width:`${Math.min(100,balance/goal.cost*100)}%`}}/></div><button disabled={balance < goal.cost} onClick={() => onRequest(goal)}>{balance >= goal.cost ? `Запросить у ${otherName(profileName)}` : `Осталось $${goal.cost - balance}`}</button></section>)}</div>}
    <details className="ideaBox"><summary>Идеи целей</summary><div className="giftList">{ideas.map(idea => <section className="giftCard compact" key={idea.id}><div><strong>{idea.title}</strong><p>{idea.detail}</p></div><span>${idea.cost}</span><button onClick={() => onCreate(idea.title, idea.cost)}>Добавить цель</button></section>)}</div></details>
    {incoming.length > 0 && <section className="history"><h2>Нужно согласовать</h2>{incoming.map(([id, entry]) => <div className="incomingRequest" key={id}><span><strong>{entry.from}: {entry.title} · ${entry.cost}</strong><small>{entry.status === 'pending' ? 'Ожидает твоего решения' : entry.status === 'approved' ? 'Согласовано' : 'Отклонено'}</small></span>{entry.status === 'pending' && <div><button onClick={() => onResolve(id,'approved')}>Да</button><button onClick={() => onResolve(id,'rejected')}>Нет</button></div>}</div>)}</section>}
    {history.length > 0 && <section className="history"><h2>Мои запросы</h2>{history.map(([id, entry]) => <div key={id}><span><strong>{entry.title} · ${entry.cost}</strong><small>{entry.status === 'approved' ? 'Согласовано' : entry.status === 'rejected' ? 'Отклонено, баллы возвращены' : 'Отправь ссылку партнёру'}</small></span>{entry.status === 'pending' && <button onClick={() => onResend(id, entry)}>Отправить</button>}</div>)}</section>}
    <div className="lockedNote">Запрос передаётся бесплатной ссылкой через Telegram. Партнёр открывает её, выбирает «Да» или «Нет» и отправляет ответ обратно. Платный сервер не нужен.</div>
  </>;
}

function RulesScreen({ level }) {
  const order = Object.fromEntries(LEVELS.map((item,index) => [item,index]));
  const visible = RULES.filter(rule => order[rule.level] <= order[level]);
  const [open, setOpen] = useState(visible[0]?.id);
  return <><div className="introText">Правила остаются отдельным подробным справочником и не прерывают ежедневные упражнения.</div><div className="rulesList">{visible.map(rule => <button key={rule.id} onClick={() => setOpen(open === rule.id ? null : rule.id)}><span>{rule.level}</span><strong>{rule.title}</strong>{open === rule.id && <RuleDetails rule={rule}/>}</button>)}</div></>;
}

function RuleDetails({ rule }) {
  return <div><TranslatedText text={rule.summary}/>{rule.examples.map(example => <div className="ruleExample" key={example}><em>{example}</em><TranslatedText text={example}/></div>)}<TranslatedText text={rule.note}/></div>;
}

function SettingsScreen({ settings, onLevel, onChange }) {
  return <>
    <section className="settingsCard"><label>Чей это кабинет</label><div className="segmented two">{['Artur','Anna'].map(name => <button key={name} className={settings.profileName === name ? 'active' : ''} onClick={() => onChange({profileName:name,partnerName:otherName(name)})}>{name}</button>)}</div><p>В Telegram прогресс всё равно привязан к личному аккаунту каждого человека.</p></section>
    <section className="settingsCard"><label>Текущий маршрут</label><div className="segmented">{LEVELS.map(level => <button key={level} className={settings.level === level ? 'active' : ''} onClick={() => onLevel(level)}>{level}</button>)}</div></section>
    <section className="settingsCard"><label>Обычное занятие</label><div className="segmented two">{[5,15].map(minutes => <button key={minutes} className={settings.minutes === minutes ? 'active' : ''} onClick={() => onChange({minutes})}>{minutes} мин</button>)}</div></section>
    <section className="settingsCard"><label>Цель на день</label><div className="segmented three">{[15,30,45].map(minutes => <button key={minutes} className={settings.dailyGoal === minutes ? 'active' : ''} onClick={() => onChange({dailyGoal:minutes})}>{minutes} мин</button>)}</div><p>30 минут — два занятия по 15 минут: утром и вечером в дороге.</p></section>
    <section className="explainCard"><strong>Как считается уровень</strong><p>В маршруте 400 единиц. Единица засчитывается после повторений в разные дни и долгой проверки примерно через 30 дней. Это честный прогресс внутри курса, а не официальный сертификат CEFR.</p></section>
  </>;
}

function CheckpointScreen({ checkpoint, onAnswer, onNext, onDone }) {
  if (checkpoint.done) return <section className="finishCard"><div className={checkpoint.awarded ? 'finishIcon' : 'finishIcon retry'}>{checkpoint.awarded ? '$' : '↻'}</div><div className="eyebrow">РЕЗУЛЬТАТ ПРОВЕРКИ</div><h1>{checkpoint.score}/10</h1><p>{checkpoint.awarded ? '$100 добавлены в личную копилку один раз.' : 'Нужно 8/10. Повтори фразы и вернись к проверке.'}</p><button className="primary big" onClick={onDone}>{checkpoint.awarded ? 'Открыть подарки' : 'К прогрессу'}</button></section>;
  const item = checkpoint.items[checkpoint.index];
  return <section className="checkpointCard"><div className="eyebrow">ВОПРОС {checkpoint.index + 1} ИЗ 10</div><h2>{blankExample(item)}</h2><p className="prompt">{item.ru}</p><div className="options">{item.testOptions.map(option => <button key={option} className={checkpoint.selected ? option === item.phrase ? 'correct' : checkpoint.selected === option ? 'wrong' : '' : ''} onClick={() => onAnswer(option)}>{option}</button>)}</div>{checkpoint.selected && <button className="primary big" onClick={onNext}>{checkpoint.index === 9 ? 'Завершить' : 'Далее'}</button>}</section>;
}

export default App;
