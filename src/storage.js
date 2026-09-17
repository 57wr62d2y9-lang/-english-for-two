const tg = () => window.Telegram?.WebApp;
const inTelegram = () => Boolean(tg()?.initData && tg()?.initDataUnsafe?.user?.id);
const userId = () => inTelegram() ? tg().initDataUnsafe.user.id : 'browser';
const prefix = () => `eft2:${userId()}:`;

function cloud() {
  return inTelegram() ? tg()?.CloudStorage : null;
}

function withTimeout(executor, fallback, ms = 1200) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => finish(fallback), ms);
    try {
      executor(finish);
    } catch {
      finish(fallback);
    }
  });
}

function cloudGet(key) {
  const c = cloud();
  if (!c?.getItem) return Promise.resolve(null);
  return withTimeout((finish) => {
    c.getItem(key, (err, value) => finish(err ? null : (value || null)));
  }, null);
}

function cloudSet(key, value) {
  const c = cloud();
  if (!c?.setItem) return Promise.resolve(false);
  return withTimeout((finish) => {
    c.setItem(key, value, (err) => finish(!err));
  }, false);
}

function localGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function localSet(key, value) {
  try { localStorage.setItem(key, value); return true; } catch { return false; }
}

export async function loadSettings() {
  const key = `${prefix()}settings`;
  const remote = await cloudGet('eft2_settings');
  const raw = remote || localGet(key);
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

export async function saveSettings(settings) {
  const value = JSON.stringify(settings);
  localSet(`${prefix()}settings`, value);
  await cloudSet('eft2_settings', value);
}

export async function loadLevelProgress(level) {
  const localKey = `${prefix()}progress:${level}`;
  const remote = await cloudGet(`eft2_progress_${level}`);
  const raw = remote || localGet(localKey);
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

export async function saveLevelProgress(level, progress) {
  const value = JSON.stringify(progress);
  localSet(`${prefix()}progress:${level}`, value);
  await cloudSet(`eft2_progress_${level}`, value);
}

export async function loadStats() {
  const raw = localGet(`${prefix()}stats`);
  try { return raw ? JSON.parse(raw) : { totalMinutes: 0, sessions: 0, correct: 0, answers: 0, byDay: {} }; }
  catch { return { totalMinutes: 0, sessions: 0, correct: 0, answers: 0, byDay: {} }; }
}

export async function saveStats(stats) {
  localSet(`${prefix()}stats`, JSON.stringify(stats));
}
