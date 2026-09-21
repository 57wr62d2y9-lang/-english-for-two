import React, { useEffect, useMemo, useRef, useState } from 'react';
import { COLLOCATIONS, GRAMMAR_TASKS, LISTENING_LESSONS, PHRASES, RULES, VERBS, VIDEOS } from './catalog.js';
import {
  COURSE_SIZE, LEVELS, addGoal, awardLevelCompletion, awardMilestone, awardRoutine,
  balanceOf, checkpointCandidates, chooseTask, courseProgress, dayKey,
  finalLevelReady, isDue, levelCompletionId, queueRecovery, redeem,
  resolveRequest, reviewItem, routineRewardId, settleRecovery, shuffle,
  rotatingExample, studySlot
} from './learning.js';
import {
  inTelegram, loadLevelProgress, loadSettings, loadStats, loadWallet,
  saveLevelProgress, saveSettings, saveStats, saveWallet, startParameter,
  subscribeSync, telegramProfile
} from './storage-v3.js';
import {
  coupleSyncAvailable, coupleSyncConfigured, createCoupleGiftRequest,
  createPairCode, joinPair, mergeCoupleSnapshot, resolveCoupleGiftRequest,
  syncCouple
} from './couple-sync.js';
import { translateToRussian } from './translation.js';
import { IELTS_SKILLS, recommendTaskType, tasksForMode } from './ielts.js';
import { chooseListeningLesson, leastRecentlyUsed } from './scheduler.js';
import { buildCheckpoint, buildFinalCheck } from './checkpoint.js';

const DEFAULT_SETTINGS = { level: 'B1', minutes: 15, dailyGoal: 30, profileName: '', partnerName: '', examType: 'Academic' };
const EMPTY_STATS = { totalMinutes: 0, sessions: 0, correct: 0, answers: 0, byDay: {}, ielts: {}, legacy: { totalMinutes: 0, sessions: 0, correct: 0, answers: 0 } };
const EMPTY_WALLET = { earned: {}, spent: {}, goals: {}, incoming: {}, partner: null };
const EMPTY_COUPLE = { mode: coupleSyncConfigured() ? 'idle' : 'off', paired: false, code: '', error: '' };
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

function exampleAt(item, seed = 0) {
  return rotatingExample(item, seed);
}

function blankExample(item, seed = 0) {
  const example = exampleAt(item, seed);
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
  const close = items.filter(candidate => candidate.id !== item.id && candidate.level === item.level && candidate.topic === item.topic);
  const sameLevel = items.filter(candidate => candidate.id !== item.id && candidate.level === item.level && !close.includes(candidate));
  const rest = items.filter(candidate => candidate.id !== item.id && !close.includes(candidate) && !sameLevel.includes(candidate));
  const others = [...shuffle(close), ...shuffle(sameLevel), ...shuffle(rest)].map(candidate => candidate[field]).filter(Boolean).filter((value, index, all) => all.indexOf(value) === index).slice(0, 3);
  return shuffle([answer, ...others]);
}

function levelIndex(level) { return LEVELS.indexOf(level); }
function availableCollocations(level) {
  const exact = COLLOCATIONS.filter(item => item.level === level);
  const lower = COLLOCATIONS.filter(item => levelIndex(item.level) < levelIndex(level));
  return exact.length ? [...exact, ...lower] : lower;
}
function availableGrammar(level) {
  const position = levelIndex(level);
  return GRAMMAR_TASKS.filter(item => levelIndex(item.level) <= position);
}
function mixedTask(base, level, progress) {
  if (base.step < 2) return null;
  const counts = base.taskCounts || {};
  const grammarTarget = base.minutes >= 15 ? 2 : 1;
  const grammarWindow = (counts.grammar || 0) === 0 ? base.step >= 3 : base.step >= 8;
  if ((counts.grammar || 0) < grammarTarget && grammarWindow) {
    const pool = availableGrammar(level);
    const item = leastRecentlyUsed(pool, progress, base.recentSpecial || []);
    if (item) return { type:'grammar', family:'grammar', progressId:item.id, item, answer:item.answer, options:shuffle(item.options) };
  }
  const listeningTarget = base.minutes >= 15 ? 1 : 0;
  if ((counts.listening || 0) < listeningTarget && base.step >= 5) {
    const lesson = chooseListeningLesson(LISTENING_LESSONS, level, progress, base.recentListening || []);
    if (lesson) {
      const questionIndex = (progress[lesson.id]?.c || 0) % lesson.questions.length;
      const question = lesson.questions[questionIndex];
      return { type:'listening', family:'listening', progressId:lesson.id, item:lesson, lesson, question, answer:question.options[question.answer], options:shuffle(question.options) };
    }
  }
  const collocationTarget = Math.max(1, Math.floor((base.answers || 0) / 5));
  if ((counts.collocation || 0) < collocationTarget) {
    const pool = availableCollocations(level);
    const item = leastRecentlyUsed(pool, progress, base.recentSpecial || []);
    if (item) return { type:'collocation', family:'collocation', progressId:item.id, item, answer:item.phrase, options:taskOptions(item, pool, 'phrase') };
  }
  if (levelIndex(level) <= levelIndex('B1') && (counts.irregular || 0) < Math.floor((base.answers || 0) / 7)) {
    const verb = leastRecentlyUsed(VERBS, progress, base.recentSpecial || []);
    if (verb) {
      const participle = ((progress[verb.id]?.c || 0) + base.step) % 2 === 0;
      const answer = participle ? verb.participle : verb.past;
      const distractors = shuffle([verb.base, verb.past, verb.participle, ...VERBS.filter(item => item.id !== verb.id).flatMap(item => [item.past,item.participle])]).filter((value,index,all) => value !== answer && all.indexOf(value) === index).slice(0,3);
      return { type:'irregular', family:'irregular', progressId:verb.id, item:verb, form:participle ? 'participle' : 'past', answer, options:shuffle([answer,...distractors]) };
    }
  }
  return null;
}

function withTask(base, items, progress, level) {
  const dueRecovery = (base.recoveryQueue || []).find(entry => entry.dueStep <= base.step && !(base.recent || []).slice(-2).includes(entry.id));
  const recoveryItem = dueRecovery && [...items, ...availableCollocations(level), ...availableGrammar(level)].find(item => item.id === dueRecovery.id);
  const recoveryFamily = recoveryItem && GRAMMAR_TASKS.some(item => item.id === recoveryItem.id) ? 'grammar'
    : recoveryItem && COLLOCATIONS.some(item => item.id === recoveryItem.id) ? 'collocation' : 'phrase';
  const recovery = recoveryItem ? { item:recoveryItem, progressId:recoveryItem.id, type:dueRecovery.nextType, family:recoveryFamily, answer:recoveryFamily === 'grammar' ? recoveryItem.answer : recoveryItem.phrase, recovery:true, early:true } : null;
  const phraseChoice = recovery || chooseTask(items, progress, base);
  const mixed = recovery ? null : mixedTask(base, level, progress);
  const choice = mixed || phraseChoice;
  if (!choice) return { ...base, done: true };
  const task = mixed || {
    ...choice,
    options: choice.type === 'recognition'
      ? taskOptions(choice.item, items, 'ru')
      : choice.type === 'context' ? taskOptions(choice.item, choice.family === 'collocation' ? availableCollocations(level) : items, 'phrase')
        : choice.type === 'grammar' ? shuffle(choice.item.options) : []
  };
  const progressId = task.progressId || task.item?.id;
  const previous = progress[progressId];
  const exampleIndex = ((previous?.c || 0) + (previous?.w || 0) + base.step) % Math.max(1, task.item?.examples?.length || 1);
  return {
    ...base,
    step: base.step + 1,
    newCount: base.newCount + (task.type === 'intro' && !progress[task.item.id] ? 1 : 0),
    recent: task.item?.id ? [...base.recent, task.item.id].slice(-5) : base.recent,
    recentListening: task.type === 'listening' ? [...(base.recentListening || []), task.lesson.id].slice(-4) : base.recentListening || [],
    recentSpecial: ['collocation','irregular','grammar'].includes(task.family) ? [...(base.recentSpecial || []), task.item.id].slice(-6) : base.recentSpecial || [],
    task: { ...task, progressId, exampleIndex, wasDue:Boolean(previous && isDue(previous)), verification:Boolean(previous?.known) },
    selected: null, feedback: null
  };
}

function taskCategory(task) {
  return task.family || (['context','recall','recognition'].includes(task.type) ? task.type : task.type);
}

function sessionEvidence(current, task, correct) {
  const category = taskCategory(task);
  const taskCounts = { ...(current.taskCounts || {}), [category]: Number(current.taskCounts?.[category] || 0) + 1 };
  const successByType = { ...(current.successByType || {}) };
  if (correct) successByType[category] = Number(successByType[category] || 0) + 1;
  let recoveryQueue = current.recoveryQueue || [];
  let recovered = Number(current.recovered || 0);
  const retrievable = (['recognition','context','recall'].includes(task.type) && ['phrase','collocation'].includes(task.family || 'phrase')) || task.type === 'grammar';
  if (task.recovery) {
    recoveryQueue = settleRecovery(recoveryQueue, task.progressId, correct, task.type, current.step);
    if (correct) recovered += 1;
  } else if (!correct && retrievable) {
    recoveryQueue = queueRecovery(recoveryQueue, task.progressId, task.type, current.step);
  }
  return {
    taskCounts,
    successByType,
    recoveryQueue,
    recovered,
    dueSuccess: Number(current.dueSuccess || 0) + (correct && task.wasDue ? 1 : 0)
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
  const [couple, setCouple] = useState(EMPTY_COUPLE);
  const [checkpoint, setCheckpoint] = useState(null);
  const [notice, setNotice] = useState('');
  const progressRef = useRef(progress);
  const statsRef = useRef(stats);
  const walletRef = useRef(wallet);
  const loadToken = useRef(0);
  const tickRef = useRef(Date.now());
  const finishRef = useRef(null);
  const coupleBusyRef = useRef(false);
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
  const morningReward = Number(wallet.earned?.[`routine:${dayKey()}:morning`]?.amount || 0);
  const eveningReward = Number(wallet.earned?.[`routine:${dayKey()}:evening`]?.amount || 0);

  useEffect(() => {
    if (!ready || !coupleSyncConfigured()) return undefined;
    const first = window.setTimeout(() => refreshCouple({ quiet: true }), 500);
    const timer = window.setInterval(() => {
      if (!document.hidden) refreshCouple({ quiet: true });
    }, 60000);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, [ready, settings.profileName, settings.level, path.percent, giftBalance]);

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

  async function refreshCouple({ quiet = false } = {}) {
    if (!coupleSyncConfigured()) return null;
    if (!coupleSyncAvailable()) {
      setCouple(current => ({ ...current, mode: 'telegram', error: 'Браузер не смог создать защищённый ключ кабинета.' }));
      return null;
    }
    if (coupleBusyRef.current) return null;
    coupleBusyRef.current = true;
    setCouple(current => ({ ...current, mode: 'syncing', error: '' }));
    const currentWallet = walletRef.current;
    const currentToday = statsRef.current?.byDay?.[dayKey()] || {};
    const result = await syncCouple({
      displayName: settings.profileName,
      level: settings.level,
      percent: path.percent,
      balance: balanceOf(currentWallet),
      todayMinutes: Math.round((currentToday.seconds || 0) / 60),
      morningDone: Boolean(currentWallet.earned?.[`routine:${dayKey()}:morning`]),
      eveningDone: Boolean(currentWallet.earned?.[`routine:${dayKey()}:evening`]),
      goals: Object.entries(currentWallet.goals || {}).map(([id, goal]) => ({ id, title:goal.title, cost:goal.cost, active:goal.active !== false, at:goal.at || 0 }))
    });
    coupleBusyRef.current = false;
    if (!result.ok) {
      setCouple(current => ({ ...current, mode: 'error', error: result.error || 'Не удалось обновить связь.' }));
      if (!quiet) setNotice(result.error || 'Не удалось обновить связь с партнёром.');
      return result;
    }
    const nextWallet = mergeCoupleSnapshot(walletRef.current, result);
    if (JSON.stringify(nextWallet) !== JSON.stringify(walletRef.current)) persistWallet(nextWallet);
    setCouple(current => ({
      ...current,
      mode: result.paired ? 'paired' : 'unpaired',
      paired: Boolean(result.paired),
      error: '',
      partnerName: result.partner?.displayName || current.partnerName || ''
    }));
    return result;
  }

  async function generatePairCode() {
    setCouple(current => ({ ...current, mode: 'syncing', error: '' }));
    const result = await createPairCode();
    if (!result.ok) {
      setCouple(current => ({ ...current, mode: 'error', error: result.error || 'Не удалось создать код.' }));
      return false;
    }
    setCouple(current => ({ ...current, mode: 'unpaired', paired: false, code: result.code || '', error: '' }));
    return true;
  }

  async function connectPartner(code) {
    setCouple(current => ({ ...current, mode: 'syncing', error: '' }));
    const result = await joinPair(code);
    if (!result.ok) {
      setCouple(current => ({ ...current, mode: 'error', error: result.error || 'Не удалось принять код.' }));
      return false;
    }
    setCouple(current => ({ ...current, mode: 'paired', paired: true, code: '', error: '' }));
    await refreshCouple({ quiet: true });
    setNotice('Кабинеты связаны. Прогресс и подарки теперь обновляются автоматически.');
    return true;
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
      slot: studySlot(),
      recentListening: [], recentSpecial: [], recoveryQueue: [],
      taskCounts: {}, successByType: {}, recovered: 0, dueSuccess: 0,
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

  function recordIelts(skill, taskType, correct = null) {
    commitStats(current => {
      const key = dayKey();
      const before = current.byDay?.[key] || {};
      const beforeSkill = before.ielts?.[skill] || { attempts:0, correct:0, scored:0, last:0, taskTypes:{} };
      const scored = typeof correct === 'boolean';
      const oldTypeRaw = beforeSkill.taskTypes?.[taskType];
      const oldType = typeof oldTypeRaw === 'number'
        ? { attempts:oldTypeRaw, correct:0, scored:0 }
        : { attempts:0, correct:0, scored:0, ...(oldTypeRaw || {}) };
      return {
        ...current,
        byDay: {
          ...current.byDay,
          [key]: {
            ...before,
            ielts: {
              ...(before.ielts || {}),
              [skill]: {
                ...beforeSkill,
                attempts:(beforeSkill.attempts || 0) + 1,
                correct:(beforeSkill.correct || 0) + (correct === true ? 1 : 0),
                scored:(beforeSkill.scored || 0) + (scored ? 1 : 0),
                last:Date.now(),
                taskTypes:{
                  ...beforeSkill.taskTypes,
                  [taskType]:{
                    attempts:oldType.attempts + 1,
                    correct:oldType.correct + (correct === true ? 1 : 0),
                    scored:oldType.scored + (scored ? 1 : 0)
                  }
                }
              }
            },
            at:Date.now()
          }
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
          byDay: { ...current.byDay, [key]: { ...before, seconds: (before.seconds || 0) + seconds, sessions: (before.sessions || 0) + 1, at: Date.now() } }
        };
      });
    }
    const completed = { ...snapshot, spentSeconds: seconds };
    const reward = awardRoutine(walletRef.current, completed);
    if (reward.wallet !== walletRef.current) persistWallet(reward.wallet);
    setSession(current => current?.id === snapshot.id ? {
      ...current, done: true, remainingMs: snapshot.remainingMs,
      spentSeconds: seconds, routineReward: reward.awarded, rewardSlot: reward.slot,
      rewardReasons: reward.evaluation?.reasons || []
    } : current);
    if (couple.paired) queueMicrotask(() => refreshCouple({ quiet:true }));
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
    const answer = task.answer || (task.type === 'recognition' ? task.item.ru : task.item.phrase);
    const ok = value === answer;
    const action = ok ? task.type === 'recognition' ? 'recognition' : task.type === 'listening' ? 'listening' : 'context' : 'wrong';
    const progressId = task.progressId || task.item.id;
    const result = reviewItem(progressRef.current[progressId], action, Date.now(), `${current.id}:${current.step}:${action}`);
    const nextProgress = { ...progressRef.current, [progressId]: result.item };
    persistProgress(nextProgress);
    recordAnswer(ok);
    setSession({ ...current, ...sessionEvidence(current, task, ok), selected: value, feedback: ok ? 'correct' : 'wrong', answers: current.answers + 1, correct: current.correct + (ok ? 1 : 0), xp: current.xp + result.xp });
  }

  function answerRecall(ok) {
    const current = session;
    const action = ok ? 'recall' : 'wrong';
    const progressId = current.task.progressId || current.task.item.id;
    const result = reviewItem(progressRef.current[progressId], action, Date.now(), `${current.id}:${current.step}:${action}`);
    const nextProgress = { ...progressRef.current, [progressId]: result.item };
    persistProgress(nextProgress);
    recordAnswer(ok);
    nextTask({ ...current, ...sessionEvidence(current, current.task, ok), answers: current.answers + 1, correct: current.correct + (ok ? 1 : 0), xp: current.xp + result.xp }, nextProgress);
  }

  function leaveSession() {
    finishSession(session);
    setSession(null);
    setScreen('home');
  }

  function openCheckpoint(quarter) {
    const tasks = buildCheckpoint(items, progress, quarter, COLLOCATIONS, LISTENING_LESSONS, settings.level);
    if (tasks.length < 10) return;
    setCheckpoint({ quarter, items: tasks, index: 0, score: 0, selected: null, revealed:false, done: false, awarded: false });
    setScreen('checkpoint');
  }

  function openFinalCheck() {
    if (!finalLevelReady(items, progress, wallet, settings.level)) return;
    const tasks = buildFinalCheck(items, progress, COLLOCATIONS, LISTENING_LESSONS, GRAMMAR_TASKS, settings.level);
    if (tasks.length < 20) return;
    setCheckpoint({ kind:'final', quarter:0, items:tasks, index:0, score:0, selected:null, revealed:false, done:false, awarded:false });
    setScreen('checkpoint');
  }

  function answerCheckpoint(value) {
    if (!checkpoint || checkpoint.selected) return;
    const task = checkpoint.items[checkpoint.index];
    const correct = task.type === 'recall' ? value === true : value === task.answer;
    setCheckpoint({ ...checkpoint, selected: task.type === 'recall' ? (value ? 'remembered' : 'missed') : value, score: checkpoint.score + (correct ? 1 : 0) });
  }

  function revealCheckpoint() {
    if (!checkpoint || checkpoint.selected) return;
    setCheckpoint({ ...checkpoint, revealed:true });
  }

  function advanceCheckpoint() {
    if (!checkpoint?.selected) return;
    if (checkpoint.index < checkpoint.items.length - 1) {
      setCheckpoint({ ...checkpoint, index: checkpoint.index + 1, selected: null, revealed:false });
      return;
    }
    const nextWallet = checkpoint.kind === 'final'
      ? awardLevelCompletion(walletRef.current, settings.level, checkpoint.score, checkpoint.items.length)
      : awardMilestone(walletRef.current, settings.level, checkpoint.quarter, checkpoint.score, path.verified);
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
    if (couple.paired) queueMicrotask(() => refreshCouple({ quiet:true }));
    return true;
  }

  function sendRequest(id, entry) {
    sharePayload(
      { type: 'request', id, title: entry.title, cost: entry.cost, from: settings.profileName, at: entry.at || Date.now() },
      `${settings.profileName} накопил(а) $${entry.cost} и хочет подарок «${entry.title}». Открой ссылку, чтобы согласовать.`
    );
  }

  async function requestGoal(goal) {
    const id = uniqueId('request');
    let next = redeem(walletRef.current, goal, id);
    if (next === walletRef.current) return;
    next = { ...next, spent: { ...next.spent, [id]: { ...next.spent[id], from: settings.profileName } } };
    persistWallet(next);
    if (couple.paired && coupleSyncAvailable()) {
      const result = await createCoupleGiftRequest({ id, title: goal.title, cost: goal.cost });
      if (result.ok) {
        const synced = { ...walletRef.current, spent: { ...walletRef.current.spent, [id]: { ...walletRef.current.spent[id], automatic: true, updatedAt: Date.now() } } };
        persistWallet(synced);
        setNotice(`Запрос отправлен ${settings.partnerName} автоматически.`);
        await refreshCouple({ quiet: true });
        return;
      }
      setNotice('Автоматическая отправка не сработала — открываю обычную Telegram-ссылку.');
    }
    sendRequest(id, next.spent[id]);
  }

  async function resolveIncoming(id, status) {
    const entry = walletRef.current.incoming?.[id];
    if (!entry || !['approved', 'rejected'].includes(status)) return;
    const next = { ...walletRef.current, incoming: { ...walletRef.current.incoming, [id]: { ...entry, status, resolvedAt: Date.now() } } };
    persistWallet(next);
    if (entry.automatic && couple.paired && coupleSyncAvailable()) {
      const result = await resolveCoupleGiftRequest(id, status);
      if (result.ok) {
        setNotice(status === 'approved' ? 'Подарок согласован.' : 'Запрос отклонён, баллы вернутся партнёру автоматически.');
        await refreshCouple({ quiet: true });
        return;
      }
      setNotice('Не удалось отправить решение автоматически — открываю Telegram-ссылку.');
    }
    sharePayload(
      { type: 'result', id, status, from: settings.profileName, at: Date.now() },
      status === 'approved' ? `${settings.profileName} согласовал(а) подарок «${entry.title}».` : `${settings.profileName} пока не согласовал(а) подарок «${entry.title}». Баллы вернутся после открытия ссылки.`
    );
  }

  if (!ready) return <div className="splash"><img src="/suslik-logo.jpeg" alt=""/><span>English for Two</span><small>Возвращаю твой прогресс…</small></div>;

  if (screen === 'session' && session) return <SessionScreen session={session} level={settings.level} onIntro={applyIntro} onAnswer={answerTask} onRecall={answerRecall} onNext={() => nextTask()} onFinish={() => finishSession(session)} onLeave={leaveSession} onMore={startSession} onShare={shareProgress} />;
  if (screen === 'progress') return <Page title="Мой прогресс" onBack={() => setScreen('home')}><ProgressScreen level={settings.level} path={path} progress={progress} practiceXp={practiceXp} stats={stats} wallet={wallet} items={items} onCheckpoint={openCheckpoint} onFinal={openFinalCheck} /></Page>;
  if (screen === 'rewards') return <Page title="Подарки" onBack={() => setScreen('home')}><RewardsScreen profileName={settings.profileName} wallet={wallet} couple={couple} ideas={GIFT_IDEAS} onCreate={createGoal} onRequest={requestGoal} onResend={sendRequest} onResolve={resolveIncoming} onShareProgress={shareProgress} onRefresh={() => refreshCouple()} /></Page>;
  if (screen === 'rules') return <Page title="Справочник" onBack={() => setScreen('home')}><RulesScreen level={settings.level} /></Page>;
  if (screen === 'exam') return <Page title="IELTS · Exam Prep" onBack={() => setScreen('home')}><ExamPrepScreen mode={settings.examType} stats={stats.ielts || {}} onMode={examType => updateSettings({examType})} onComplete={recordIelts}/></Page>;
  if (screen === 'settings') return <Page title="Личный кабинет" onBack={() => setScreen('home')}><SettingsScreen settings={settings} couple={couple} onLevel={changeLevel} onChange={updateSettings} onCreatePairCode={generatePairCode} onJoinPair={connectPartner} onRefreshPair={() => refreshCouple()} /></Page>;
  if (screen === 'checkpoint' && checkpoint) return <Page title={checkpoint.kind === 'final' ? 'Итоговая проверка' : 'Проверка этапа'} onBack={() => setScreen('progress')}><CheckpointScreen checkpoint={checkpoint} onAnswer={answerCheckpoint} onReveal={revealCheckpoint} onNext={advanceCheckpoint} onDone={() => setScreen(checkpoint.kind === 'final' ? 'progress' : checkpoint.awarded ? 'rewards' : 'progress')} /></Page>;

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
        <div><div className="eyebrow">СЕГОДНЯ · {slot === 'morning' ? 'УТРО' : 'ВЕЧЕР'}</div><h1>{Math.max(0, settings.dailyGoal - todayMinutes)} минут</h1><p>{todayMinutes} из {settings.dailyGoal} · повторений: {dueCount}</p><small>{slot === 'morning' ? 'Фокус: важные повторы и до двух новых единиц.' : 'Фокус: закрепить утреннее, ошибки и живую речь.'}</small></div>
        <div className="dayRing" style={{ '--done': `${Math.min(100, todayMinutes / settings.dailyGoal * 100)}%` }}><span>{Math.min(100, Math.round(todayMinutes / settings.dailyGoal * 100))}%</span></div>
      </div>
      <div className="slotRow"><span className={morningDone ? 'done' : ''}>☀ Утро {morningDone ? `+$${morningReward} ✓` : '$1–$3'}</span><span className={eveningDone ? 'done' : ''}>☾ Вечер {eveningDone ? `+$${eveningReward} ✓` : '$1–$3'}</span></div>
      <button className="primary big" onClick={() => startSession(settings.minutes)}>{slotDone ? `Заниматься ${settings.minutes} минут` : `Начать ${settings.minutes} минут · до $3`}</button>
      <button className="quietButton" onClick={() => startSession(5)}>Короткое занятие на 5 минут</button>
      <small>$1–$3 начисляются один раз утром и вечером: учитываются время, точность, сложные задания и восстановленные ошибки. После цели можно продолжать без ограничений.</small>
    </section>

    <button className="routeCard" onClick={() => setScreen('progress')}>
      <div className="routeHeader"><div><span>Ближайшая понятная цель</span><strong>{miniLeft ? `Ещё ${miniLeft} новых единиц до ${nextMini}` : 'Цель выполнена'}</strong></div><b>{path.percent}%</b></div>
      <div className="routeBar"><i style={{ width: `${Math.min(100, path.introduced / nextMini * 100)}%` }} /></div>
      <div className="routeMeta"><span>{path.introduced} встречено</span><span>{path.verified} закреплено надолго</span></div>
      <div className="releaseNote">Реалистичный темп: 2 новых единицы за поездку, около 80–120 в месяц. Повторы автоматически идут на 1, 3, 5, 8, 12, 30, 60 и 90-й день.</div>
    </button>

    {wallet.partner && <section className="partnerCard"><div><span>{wallet.partner.name}</span><strong>{wallet.partner.level} · {wallet.partner.percent}%</strong><small>Сегодня {wallet.partner.todayMinutes || 0} мин · баланс ${wallet.partner.balance} · целей {(wallet.partner.goals || []).filter(goal => goal.active).length}</small></div><button onClick={wallet.partner.automatic ? () => refreshCouple() : shareProgress}>{wallet.partner.automatic ? 'Обновить' : 'Показать мой'}</button></section>}
    <div className="quickStats">
      <button onClick={() => setScreen('rewards')}><span>Подарки</span><strong>${giftBalance}</strong></button>
      <button onClick={() => setScreen('progress')}><span>Очки практики</span><strong>{practiceXp}</strong></button>
      <button onClick={couple.paired ? () => refreshCouple() : shareProgress}><span>{couple.paired ? `${settings.partnerName} онлайн` : `Для ${settings.partnerName}`}</span><strong>{couple.paired ? '✓' : '↗'}</strong></button>
    </div>
    <button className="referenceButton examButton" onClick={() => setScreen('exam')}><span><strong>IELTS · Exam Prep</strong><small>Reading, Listening, Writing и Speaking</small></span><b>→</b></button>
    <button className="referenceButton" onClick={() => setScreen('rules')}><span>Грамматический справочник</span><b>→</b></button>
    <footer><span className={`syncDot ${sync}`} />{sync === 'synced' ? 'Прогресс сохранён в Telegram' : sync === 'syncing' ? 'Сохраняю…' : sync === 'pending' ? 'Сохранено на телефоне; Telegram повторит синхронизацию' : sync === 'error' ? 'На телефоне закончилось место' : inTelegram() ? 'Хранится в твоём Telegram' : 'Хранится на этом устройстве'}</footer>
  </div>;
}

function Page({ title, onBack, children }) {
  return <div className="app"><div className="topbar"><button className="back" onClick={onBack}>←</button><strong>{title}</strong><span /></div>{children}</div>;
}

function SessionScreen({ session, level, onIntro, onAnswer, onRecall, onNext, onFinish, onLeave, onMore, onShare }) {
  if (session.done) {
    const minAnswers = session.minutes <= 5 ? 5 : 8;
    const qualified = (session.spentSeconds || 0) >= (session.plannedMs / 1000) * .8 && session.answers >= minAnswers;
    return <div className="app"><section className="finishCard"><div className="finishIcon">✓</div><div className="eyebrow">ЗАНЯТИЕ ЗАВЕРШЕНО</div><h1>{Math.max(1, Math.round((session.spentSeconds || 0) / 60))} мин</h1><p>{session.answers} ответов · {session.correct} верных · +{session.xp} очков</p>{session.routineReward ? <div className="rewardWon"><strong>+${session.routineReward}</strong><span>{session.routineReward === 3 ? 'Отличное занятие' : session.routineReward === 2 ? 'Сильное занятие' : 'Занятие выполнено'}</span>{(session.rewardReasons || []).slice(1).map(reason => <small key={reason}>{reason}</small>)}</div> : !qualified ? <div className="rewardHint">Для награды нужно пройти 80% времени и дать минимум {minAnswers} ответов.</div> : <div className="rewardHint">Награда за эту часть дня уже была получена.</div>}<button className="primary big" onClick={() => onMore(15)}>Продолжить ещё 15 минут</button><button className="secondary big" onClick={onShare}>Показать прогресс партнёру</button><button className="quietButton" onClick={onLeave}>На главную</button></section></div>;
  }
  const task = session.task;
  if (!task) return <div className="splash">Готовлю задание…</div>;
  const totalSeconds = Math.ceil(session.remainingMs / 1000);
  const mm = Math.floor(totalSeconds / 60);
  const ss = String(totalSeconds % 60).padStart(2, '0');
  return <div className="app sessionApp">
    <div className="topbar"><button className="back" onClick={onLeave}>×</button><strong>{level} · {session.slot === 'morning' ? 'новое + повторы' : 'вечернее закрепление'}</strong><button className="timer" onClick={onFinish}>{mm}:{ss}</button></div>
    <div className="sessionProgress"><i style={{ width: `${100 - session.remainingMs / session.plannedMs * 100}%` }} /></div>
    <main className="exercise">
      {task.early && <div className="earlyTag">ДОПОЛНИТЕЛЬНЫЙ ПОВТОР · БЕЗ НОВЫХ ОЧКОВ</div>}
      {task.recovery && <div className="recoveryTag">ВОЗВРАЩАЕМ ОШИБКУ ПОСЛЕ ПАУЗЫ</div>}
      {task.verification && <div className="verificationTag">ПРОВЕРКА «ОЧЕНЬ ХОРОШО ЗНАЮ»</div>}
      {task.type === 'intro' && <>
        <div className="eyebrow">НОВАЯ ФРАЗА · {task.item.topic}</div>
        <h1 className="phrase">{task.item.phrase}</h1>
        <div className="translation mainTranslation">{task.item.ru}</div>
        <p className="meaning">{task.item.explanation}</p>
        <div className="speakPrompt">Произнеси фразу вслух и просмотри жизненные примеры.</div>
        <div className="examples">{task.item.examples.map((example, index) => <TranslatedExample key={index} text={example} />)}</div>
        {task.item.variations?.length > 0 && <details className="variationBox" open><summary>Как ещё говорят</summary>{task.item.variations.map(variation => <TranslatedExample key={variation} text={variation}/>)}</details>}
        {task.item.videoRefs?.length > 0 && <WatchInContext item={task.item}/>} 
        <div className="actions twoActions"><button className="primary" onClick={() => onIntro('intro')}>Далее — учить</button><button className="secondary dangerText" onClick={() => onIntro('known')}>Очень хорошо знаю</button></div>
        <small className="helper">«Очень хорошо знаю» уберёт фразу из обычной очереди, но через 35 дней даст контрольную проверку. Только после неё фраза засчитается.</small>
      </>}
      {task.type === 'recognition' && <ChoiceTask eyebrow="УЗНАЙ ЗНАЧЕНИЕ" title={task.item.phrase} prompt="Выбери русский перевод." task={task} answer={task.item.ru} onAnswer={onAnswer} onNext={onNext} session={session} />}
      {task.type === 'context' && <ChoiceTask eyebrow={task.family === 'collocation' ? 'КОЛЛОКАЦИЯ В СИТУАЦИИ' : 'ФРАЗА В СИТУАЦИИ'} title={blankExample(task.item, task.exampleIndex)} prompt={`Подсказка: ${task.item.ru}`} task={task} answer={task.item.phrase} onAnswer={onAnswer} onNext={onNext} session={session} />}
      {task.type === 'recall' && <RecallTask task={task} onAnswer={onRecall} />}
      {task.type === 'collocation' && <ChoiceTask eyebrow="СЛОВА ВМЕСТЕ" title={task.item.ru} prompt={task.item.explanation} task={task} answer={task.answer} onAnswer={onAnswer} onNext={onNext} session={session} />}
      {task.type === 'irregular' && <ChoiceTask eyebrow="НЕПРАВИЛЬНЫЙ ГЛАГОЛ" title={task.form === 'participle' ? `I have _____ it. · ${task.item.base}` : `Yesterday I _____ it. · ${task.item.base}`} prompt={task.form === 'participle' ? 'Выбери Past Participle.' : 'Выбери Past Simple.'} task={task} answer={task.answer} onAnswer={onAnswer} onNext={onNext} session={session} />}
      {task.type === 'grammar' && <ChoiceTask eyebrow={`ГРАММАТИКА ПО ОШИБКАМ · ${task.item.level}`} title={task.item.prompt} prompt={task.item.title} task={task} answer={task.answer} onAnswer={onAnswer} onNext={onNext} session={session} />}
      {task.type === 'listening' && <ListeningTask task={task} session={session} onAnswer={onAnswer} onNext={onNext} />}
    </main>
  </div>;
}

function ChoiceTask({ eyebrow, title, prompt, task, answer, onAnswer, onNext, session }) {
  return <><div className="eyebrow">{eyebrow}</div><h1 className={eyebrow.includes('СИТУАЦИИ') || task.type === 'grammar' ? 'contextTitle' : 'phrase'}>{title}</h1><p className="prompt">{prompt}</p><div className="options">{task.options.map(option => <button key={option} className={session.feedback ? option === answer ? 'correct' : session.selected === option ? 'wrong' : '' : ''} onClick={() => onAnswer(option)}>{option}</button>)}</div>{session.feedback && <div className={`feedback ${session.feedback}`}><strong>{session.feedback === 'correct' ? 'Верно.' : 'Пока нет — вот правильный ответ.'}</strong><span>{answer}</span>{task.item?.explanation && <TranslatedText text={task.item.explanation}/>} {task.item?.examples?.length > 0 && <TranslatedExample text={exampleAt(task.item, task.exampleIndex + 1)}/>} {task.item?.videoRefs?.length > 0 && <WatchInContext item={task.item}/>}<button className="primary" onClick={onNext}>Далее</button></div>}</>;
}

function RecallTask({ task, onAnswer }) {
  const { item } = task;
  const [revealed, setRevealed] = useState(false);
  const situation = task.exampleIndex % 2 === 1;
  return <><div className="eyebrow">СКАЖИ ВСЛУХ</div><p className="prompt">{situation ? 'Какая фраза естественно подходит к ситуации?' : 'Как сказать по-английски?'}</p>{situation ? <TranslatedText text={item.explanation}/> : <h1 className="recallCue">{item.ru}</h1>}{!revealed ? <button className="primary big" onClick={() => setRevealed(true)}>Показать ответ</button> : <><div className="reveal">{item.phrase}</div><TranslatedExample text={exampleAt(item, task.exampleIndex)} />{item.variations?.length > 0 && <div className="recallVariation">Ещё вариант: <strong>{item.variations[task.exampleIndex % item.variations.length]}</strong></div>}{item.videoRefs?.length > 0 && <WatchInContext item={item}/>}<div className="actions twoActions"><button className="secondary" onClick={() => onAnswer(false)}>Не вспомнил</button><button className="primary" onClick={() => onAnswer(true)}>Вспомнил</button></div></>}</>;
}

function WatchInContext({ item }) {
  const video = VIDEOS.find(entry => item.videoRefs.includes(entry.id));
  if (!video) return null;
  const url = video.startTime ? `${video.url}${video.url.includes('?') ? '&' : '?'}t=${video.startTime}s` : video.url;
  return <a className="videoContext" href={url} target="_blank" rel="noreferrer"><span>▶ В живой речи</span><strong>{video.title}</strong><small>{video.channel} · {video.accent}</small></a>;
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

function ProgressScreen({ level, path, progress, practiceXp, stats, wallet, items, onCheckpoint, onFinal }) {
  const earned = wallet.earned || {};
  const accuracy = stats.answers ? Math.round(stats.correct / stats.answers * 100) : 0;
  const nextQuarter = [1, 2, 3, 4].find(quarter => !earned[`route-2026-1:${level}:${quarter}`]);
  const checkpointReady = nextQuarter && checkpointCandidates(items, progress, nextQuarter).length === 10;
  const completed = Boolean(earned[levelCompletionId(level)]);
  const finalReady = finalLevelReady(items, progress, wallet, level);
  const nextLevel = { A2: 'B1', B1: 'B2', B2: 'C1', C1: 'Свободное владение' }[level];
  return <>
    <section className="courseHero"><div className="eyebrow">ВЫБРАН МАРШРУТ {level} → {nextLevel}</div><h1>{path.points.toLocaleString()} <small>/ {path.targetPoints.toLocaleString()}</small></h1><p>{completed ? `Уровень ${level} подтверждён итоговой проверкой` : `${path.verified} единиц закреплено · уровень ещё не подтверждён`}</p><div className="routeBar"><i style={{ width: `${path.percent}%` }} /></div><div className="routeMeta"><span>{path.percent}% маршрута</span><span>опубликовано {path.available} из {COURSE_SIZE}</span></div></section>
    <section className="explainCard"><strong>Понятная ближайшая цель</strong><p>Каждые 20 новых единиц — маленький этап. Утром появляются до двух новых элементов, вечером — преимущественно закрепление. Точный темп зависит от очереди повторений.</p></section>
    <div className="statsGrid"><Stat value={practiceXp} label="Очки практики"/><Stat value={`${accuracy}%`} label="Точность"/><Stat value={Math.round(stats.totalMinutes || 0)} label="Всего минут"/><Stat value={Math.round(stats.sessions || 0)} label="Занятий"/></div>
    <section className="milestones">{[1,2,3,4].map(quarter => { const event = earned[`route-2026-1:${level}:${quarter}`]; const needed = Math.max(0, quarter * 100 - path.verified); return <div className={event ? 'milestone earned' : 'milestone'} key={quarter}><span>{quarter * 25}%</span><div><strong>{event ? '$100 уже начислены' : `Ещё ${needed} закреплённых единиц`}</strong><small>{quarter * 100} единиц + проверка 8/10</small></div><b>{event ? '✓' : '$100'}</b></div>; })}</section>
    {checkpointReady && <button className="primary big" onClick={() => onCheckpoint(nextQuarter)}>Пройти проверку этапа {nextQuarter * 25}%</button>}
    {!checkpointReady && nextQuarter && <div className="lockedNote">Проверка откроется после {nextQuarter * 100} действительно закреплённых единиц. Повторение одной лёгкой карточки не накручивает прогресс.</div>}
    {completed ? <div className="lockedNote">Итоговая проверка пройдена: {level} подтверждён внутри English for Two. Это не официальный сертификат CEFR.</div>
      : finalReady ? <button className="primary big" onClick={onFinal}>Итоговая проверка уровня · 20 заданий</button>
        : <div className="lockedNote">Итоговая проверка 16/20 откроется после 400 опубликованных и закреплённых единиц и всех четырёх этапов. Сейчас опубликовано {path.available} из {COURSE_SIZE}.</div>}
  </>;
}

function Stat({ value, label }) { return <div className="stat"><strong>{value}</strong><span>{label}</span></div>; }

function RewardsScreen({ profileName, wallet, couple, ideas, onCreate, onRequest, onResend, onResolve, onShareProgress, onRefresh }) {
  const [title, setTitle] = useState('');
  const [cost, setCost] = useState('');
  const balance = balanceOf(wallet);
  const goals = Object.entries(wallet.goals || {}).sort((a,b) => b[1].at - a[1].at);
  const partnerGoals = (wallet.partner?.goals || []).filter(goal => goal.active).sort((a,b) => (b.at || 0) - (a.at || 0));
  const history = Object.entries(wallet.spent || {}).sort((a,b) => b[1].at - a[1].at);
  const incoming = Object.entries(wallet.incoming || {}).sort((a,b) => b[1].at - a[1].at);
  function submit(event) {
    event.preventDefault();
    if (onCreate(title, cost)) { setTitle(''); setCost(''); }
  }
  return <>
    <section className="walletCard"><div className="eyebrow">КОПИЛКА {profileName.toUpperCase()}</div><h1>${balance}</h1><p>Это игровые доллары — обещание между вами, а не настоящие деньги и не банковский счёт.</p></section>
    {wallet.partner && <section className="partnerCard"><div><span>{wallet.partner.name}</span><strong>{wallet.partner.level} · {wallet.partner.percent}%</strong><small>В копилке ${wallet.partner.balance}</small></div><button onClick={wallet.partner.automatic ? onRefresh : onShareProgress}>{wallet.partner.automatic ? 'Обновить' : 'Мой прогресс'}</button></section>}
    {partnerGoals.length > 0 && <section className="partnerGoals"><div className="eyebrow">ЦЕЛИ {String(wallet.partner.name || 'ПАРТНЁРА').toUpperCase()}</div>{partnerGoals.map(goal => <div key={goal.id}><span><strong>{goal.title}</strong><small>${Math.min(wallet.partner.balance || 0, goal.cost)} из ${goal.cost}</small></span><b>{Math.min(100,Math.round((wallet.partner.balance || 0)/goal.cost*100))}%</b></div>)}</section>}
    <form className="goalForm" onSubmit={submit}><h2>Моя цель</h2><p>Впиши конкретную вещь, свидание или поездку.</p><input value={title} onChange={event => setTitle(event.target.value)} maxLength="60" placeholder="Например: наушники" required/><div><input value={cost} onChange={event => setCost(event.target.value.replace(/\D/g,''))} inputMode="numeric" placeholder="Цена в $" required/><button className="primary" type="submit">Добавить</button></div></form>
    {goals.length > 0 && <div className="giftList">{goals.map(([id, goal]) => <section className="giftCard" key={id}><div><strong>{goal.title}</strong><p>Накоплено ${Math.min(balance, goal.cost)} из ${goal.cost}</p></div><span>${goal.cost}</span><div className="goalBar"><i style={{width:`${Math.min(100,balance/goal.cost*100)}%`}}/></div><button disabled={balance < goal.cost} onClick={() => onRequest(goal)}>{balance >= goal.cost ? `Запросить у ${otherName(profileName)}` : `Осталось $${goal.cost - balance}`}</button></section>)}</div>}
    <details className="ideaBox"><summary>Идеи целей</summary><div className="giftList">{ideas.map(idea => <section className="giftCard compact" key={idea.id}><div><strong>{idea.title}</strong><p>{idea.detail}</p></div><span>${idea.cost}</span><button onClick={() => onCreate(idea.title, idea.cost)}>Добавить цель</button></section>)}</div></details>
    {incoming.length > 0 && <section className="history"><h2>Нужно согласовать</h2>{incoming.map(([id, entry]) => <div className="incomingRequest" key={id}><span><strong>{entry.from}: {entry.title} · ${entry.cost}</strong><small>{entry.status === 'pending' ? 'Ожидает твоего решения' : entry.status === 'approved' ? 'Согласовано' : 'Отклонено'}</small></span>{entry.status === 'pending' && <div><button onClick={() => onResolve(id,'approved')}>Да</button><button onClick={() => onResolve(id,'rejected')}>Нет</button></div>}</div>)}</section>}
    {history.length > 0 && <section className="history"><h2>Мои запросы</h2>{history.map(([id, entry]) => <div key={id}><span><strong>{entry.title} · ${entry.cost}</strong><small>{entry.status === 'approved' ? 'Согласовано' : entry.status === 'rejected' ? 'Отклонено, баллы возвращены' : entry.automatic ? 'Отправлено автоматически' : 'Отправь ссылку партнёру'}</small></span>{entry.status === 'pending' && !entry.automatic && <button onClick={() => onResend(id, entry)}>Отправить</button>}</div>)}</section>}
    <div className="lockedNote">{couple.paired ? 'Кабинеты связаны: запросы и решения появляются у партнёра автоматически. Push-сообщения не требуются.' : 'Пока кабинеты не связаны, запрос передаётся бесплатной ссылкой через Telegram. Связать кабинеты можно в настройках.'}</div>
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

function ExamPrepScreen({ mode, stats, onMode, onComplete }) {
  const [skill, setSkill] = useState('Reading');
  const [index, setIndex] = useState(0);
  const tasks = tasksForMode(mode, skill);
  const current = stats[skill] || {attempts:0,correct:0,scored:0,taskTypes:{}};
  const recommended = recommendTaskType(tasks, current);
  const orderedTasks = recommended ? [...tasks].sort((a, b) => Number(b.taskType === recommended.type) - Number(a.taskType === recommended.type)) : tasks;
  const task = orderedTasks[index % Math.max(1, orderedTasks.length)];
  const accuracy = current.scored ? Math.round(current.correct / current.scored * 100) : null;
  function changeSkill(next) { setSkill(next); setIndex(0); }
  return <>
    <section className="examHero"><div className="eyebrow">ОТДЕЛЬНО ОТ УРОВНЯ CEFR</div><h1>Готовимся к формату IELTS</h1><p>Оригинальные тренировочные задания. Здесь нет «официального band score» — только честная практика навыков и формата экзамена.</p><div className="segmented two">{['Academic','General'].map(type => <button className={mode === type ? 'active' : ''} onClick={() => {onMode(type);setIndex(0);}} key={type}>{type}</button>)}</div></section>
    <div className="examStats">{IELTS_SKILLS.map(name => { const value=stats[name] || {}; const scored=value.scored || 0; const result=scored ? `${Math.round((value.correct || 0)/scored*100)}%` : '—'; return <button className={skill === name ? 'active' : ''} onClick={() => changeSkill(name)} key={name}><span>{name}</span><strong>{result}</strong><small>{value.attempts || 0} практик</small></button>; })}</div>
    <section className="examRecommendation"><span>Сейчас · {skill}</span><strong>{recommended?.type || 'Первое задание'}</strong><small>{recommended?.attempts === 0 ? 'Этот формат ещё не практиковался.' : recommended?.accuracy !== null && recommended.accuracy < .7 ? `Слабый формат: ${Math.round(recommended.accuracy * 100)}% точности.` : accuracy === null ? 'Начни с короткого задания.' : 'Балансируем форматы, начиная с наименее отработанного.'}</small></section>
    {task ? <ExamTask key={`${mode}:${task.id}:${index}`} task={task} onComplete={(correct) => { onComplete(skill, task.taskType, correct); setIndex(value => value + 1); }}/>: <div className="lockedNote">Для этого режима задания готовятся.</div>}
  </>;
}

function ExamTask({ task, onComplete }) {
  const [selected, setSelected] = useState('');
  const [finished, setFinished] = useState(false);
  const scored = Array.isArray(task.options) && typeof task.answer === 'string';
  function choose(option) {
    if (finished) return;
    setSelected(option);
    setFinished(true);
  }
  return <section className="examTask"><div className="examTaskTop"><span>{task.taskType}</span><b>{task.minutes} мин</b></div><h2>{task.title}</h2>{task.source && <><p>{task.instruction}</p><a className="audioLink" href={task.url} target="_blank" rel="noreferrer">Открыть живую запись ↗</a></>}{task.passage && <div className="examPassage">{task.passage}</div>}{task.prompt && <div className="examPrompt">{task.prompt}</div>}{task.question && <h3>{task.question}</h3>}{task.questions && <div className="examQuestions">{task.questions.map(question => <div key={question}>{question}</div>)}</div>}{scored && <div className="options">{task.options.map(option => <button key={option} className={finished ? option === task.answer ? 'correct' : option === selected ? 'wrong' : '' : ''} onClick={() => choose(option)}>{option}</button>)}</div>}{task.structure && <div className="examStructure"><strong>Структура</strong><span>{task.structure}</span>{task.words && <small>{task.words}</small>}</div>}{task.checklist && <ul className="examChecklist">{task.checklist.map(item => <li key={item}>{item}</li>)}</ul>}{task.skill === 'Speaking' && <SpeakingTimer part={task.taskType}/>} {finished && <div className={`feedback ${selected === task.answer ? 'correct' : 'wrong'}`}><strong>{selected === task.answer ? 'Верно.' : `Ответ: ${task.answer}`}</strong><span>{task.explanation}</span><button className="primary" onClick={() => onComplete(selected === task.answer)}>Следующее задание</button></div>}{!scored && <button className="primary big" onClick={() => onComplete(null)}>Практика выполнена</button>}</section>;
}

function SpeakingTimer({ part }) {
  const initial = part === 'Part 2' ? 60 : 120;
  const [seconds, setSeconds] = useState(initial);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running || seconds <= 0) return undefined;
    const timer = setTimeout(() => setSeconds(value => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [running, seconds]);
  return <div className="speakingTimer"><span>{part === 'Part 2' && seconds === initial ? '1 минута на план' : 'Таймер речи'}</span><strong>{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</strong><button onClick={() => setRunning(value => !value)}>{running ? 'Пауза' : seconds ? 'Старт' : 'Готово'}</button><button onClick={() => {setSeconds(initial);setRunning(false);}}>Сброс</button></div>;
}

function SettingsScreen({ settings, couple, onLevel, onChange, onCreatePairCode, onJoinPair, onRefreshPair }) {
  return <>
    <section className="settingsCard"><label>Чей это кабинет</label><div className="segmented two">{['Artur','Anna'].map(name => <button key={name} className={settings.profileName === name ? 'active' : ''} onClick={() => onChange({profileName:name,partnerName:otherName(name)})}>{name}</button>)}</div><p>У каждого устройства свой защищённый кабинет; внутри Telegram его ключ сохраняется в личном CloudStorage.</p></section>
    {couple.mode !== 'off' && <PairingCard profileName={settings.profileName} partnerName={settings.partnerName} couple={couple} onCreate={onCreatePairCode} onJoin={onJoinPair} onRefresh={onRefreshPair} />}
    <section className="settingsCard"><label>Текущий маршрут</label><div className="segmented">{LEVELS.map(level => <button key={level} className={settings.level === level ? 'active' : ''} onClick={() => onLevel(level)}>{level}</button>)}</div></section>
    <section className="settingsCard"><label>Обычное занятие</label><div className="segmented two">{[5,15].map(minutes => <button key={minutes} className={settings.minutes === minutes ? 'active' : ''} onClick={() => onChange({minutes})}>{minutes} мин</button>)}</div></section>
    <section className="settingsCard"><label>Цель на день</label><div className="segmented three">{[15,30,45].map(minutes => <button key={minutes} className={settings.dailyGoal === minutes ? 'active' : ''} onClick={() => onChange({dailyGoal:minutes})}>{minutes} мин</button>)}</div><p>30 минут — два занятия по 15 минут: утром и вечером в дороге.</p></section>
    <section className="explainCard"><strong>Как считается уровень</strong><p>В маршруте 400 единиц. Единица засчитывается после повторений в разные дни и долгой проверки примерно через 30 дней. Это честный прогресс внутри курса, а не официальный сертификат CEFR.</p></section>
  </>;
}

function PairingCard({ profileName, partnerName, couple, onCreate, onJoin, onRefresh }) {
  const [code, setCode] = useState('');
  const busy = couple.mode === 'syncing';
  if (couple.mode === 'telegram') return <section className="settingsCard pairCard"><label>Связь {profileName} + {partnerName}</label><p>Не удалось создать защищённый ключ этого кабинета. Обнови страницу и попробуй снова.</p></section>;
  if (couple.paired) return <section className="settingsCard pairCard connected"><label>{profileName} + {couple.partnerName || partnerName} связаны ✓</label><p>Уровень, процент, копилка и подарочные запросы синхронизируются автоматически. Учебные ответы остаются раздельными.</p><button className="secondary big" onClick={onRefresh} disabled={busy}>{busy ? 'Обновляю…' : 'Обновить сейчас'}</button></section>;
  function submit(event) {
    event.preventDefault();
    if (code.length === 6) onJoin(code);
  }
  return <section className="settingsCard pairCard"><label>Связать {profileName} и {partnerName}</label><p>Один создаёт одноразовый код, второй вводит его в своём кабинете. Карта не нужна.</p>{couple.code && <div className="pairCode"><span>КОД ДЛЯ {partnerName.toUpperCase()}</span><strong>{couple.code}</strong><small>Действует 15 минут</small></div>}<button className="secondary big" onClick={onCreate} disabled={busy}>{busy ? 'Подключаю…' : couple.code ? 'Создать новый код' : 'Создать код'}</button><form className="pairJoin" onSubmit={submit}><input value={code} onChange={event => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6))} placeholder="Код из 6 символов" autoCapitalize="characters" inputMode="text"/><button className="primary" disabled={busy || code.length !== 6}>Связать</button></form>{couple.error && <div className="pairError">{couple.error}</div>}</section>;
}

function CheckpointScreen({ checkpoint, onAnswer, onReveal, onNext, onDone }) {
  const total = checkpoint.items.length;
  const required = Math.ceil(total * .8);
  const final = checkpoint.kind === 'final';
  if (checkpoint.done) return <section className="finishCard"><div className={checkpoint.awarded ? 'finishIcon' : 'finishIcon retry'}>{checkpoint.awarded ? final ? '✓' : '$' : '↻'}</div><div className="eyebrow">РЕЗУЛЬТАТ ПРОВЕРКИ</div><h1>{checkpoint.score}/{total}</h1><p>{checkpoint.awarded ? final ? 'Уровень подтверждён внутри курса. Результат сохранён.' : '$100 добавлены в личную копилку один раз.' : `Нужно ${required}/${total}. Повтори слабые места и вернись к проверке.`}</p><button className="primary big" onClick={onDone}>{checkpoint.awarded && !final ? 'Открыть подарки' : 'К прогрессу'}</button></section>;
  const task = checkpoint.items[checkpoint.index];
  const labels = {recognition:'ЗНАЧЕНИЕ',context:'НОВЫЙ КОНТЕКСТ',recall:'АКТИВНОЕ ВОСПОМИНАНИЕ',collocation:'КОЛЛОКАЦИЯ',listening:'АУДИРОВАНИЕ',grammar:'ГРАММАТИКА'};
  return <section className="checkpointCard"><div className="eyebrow">ВОПРОС {checkpoint.index + 1} ИЗ {total} · {labels[task.type]}</div>{task.type === 'listening' && <a className="audioLink" href={task.lesson.url} target="_blank" rel="noreferrer">Открыть живую запись ↗</a>}<h2>{task.prompt}</h2>{task.type === 'recall' ? <>{!checkpoint.revealed ? <button className="primary big" onClick={onReveal}>Показать ответ</button> : <><div className="reveal">{task.answer}</div><TranslatedExample text={exampleAt(task.item, checkpoint.index)}/>{!checkpoint.selected && <div className="actions twoActions"><button className="secondary" onClick={() => onAnswer(false)}>Не вспомнил</button><button className="primary" onClick={() => onAnswer(true)}>Вспомнил</button></div>}</>}</> : <div className="options">{task.options.map(option => <button key={option} className={checkpoint.selected ? option === task.answer ? 'correct' : checkpoint.selected === option ? 'wrong' : '' : ''} onClick={() => onAnswer(option)}>{option}</button>)}</div>}{checkpoint.selected && <button className="primary big" onClick={onNext}>{checkpoint.index === total - 1 ? 'Завершить' : 'Далее'}</button>}</section>;
}

export default App;
