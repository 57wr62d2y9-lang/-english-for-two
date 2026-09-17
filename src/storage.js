const tg = () => window.Telegram?.WebApp;
const userId = () => tg()?.initDataUnsafe?.user?.id || 'browser';
const prefix = () => `eft2:${userId()}:`;

function cloud() {
  return tg()?.CloudStorage;
}

function cloudGet(key) {
  return new Promise((resolve) => {
    const c = cloud();
    if (!c?.getItem) return resolve(null);
    c.getItem(key, (err, value) => resolve(err ? null : (value || null)));
  });
}

function cloudSet(key, value) {
  return new Promise((resolve) => {
    const c = cloud();
    if (!c?.setItem) return resolve(false);
    c.setItem(key, value, (err) => resolve(!err));
  });
}

export async function loadSettings() {
  const key = `${prefix()}settings`;
  const remote = await cloudGet('eft2_settings');
  const raw = remote || localStorage.getItem(key);
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

export async function saveSettings(settings) {
  const value = JSON.stringify(settings);
  localStorage.setItem(`${prefix()}settings`, value);
  await cloudSet('eft2_settings', value);
}

export async function loadLevelProgress(level) {
  const localKey = `${prefix()}progress:${level}`;
  const remote = await cloudGet(`eft2_progress_${level}`);
  const raw = remote || localStorage.getItem(localKey);
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

export async function saveLevelProgress(level, progress) {
  const value = JSON.stringify(progress);
  localStorage.setItem(`${prefix()}progress:${level}`, value);
  await cloudSet(`eft2_progress_${level}`, value);
}

export async function loadStats() {
  const raw = localStorage.getItem(`${prefix()}stats`);
  try { return raw ? JSON.parse(raw) : { totalMinutes: 0, sessions: 0, correct: 0, answers: 0, byDay: {} }; }
  catch { return { totalMinutes: 0, sessions: 0, correct: 0, answers: 0, byDay: {} }; }
}

export async function saveStats(stats) {
  localStorage.setItem(`${prefix()}stats`, JSON.stringify(stats));
}
