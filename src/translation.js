const CACHE_PREFIX = 'eft:ru:';
const memory = new Map();

function decodeEntities(value) {
  if (typeof document === 'undefined') return value;
  const area = document.createElement('textarea');
  area.innerHTML = value;
  return area.value;
}

function readCache(text) {
  if (memory.has(text)) return memory.get(text);
  try {
    const saved = localStorage.getItem(CACHE_PREFIX + text);
    if (saved) memory.set(text, saved);
    return saved;
  } catch { return null; }
}

function writeCache(text, translation) {
  memory.set(text, translation);
  try { localStorage.setItem(CACHE_PREFIX + text, translation); } catch {}
}

// MyMemory allows small anonymous translations without a key. Results are
// cached on the phone, so each example is normally requested only once.
export async function translateToRussian(text) {
  const clean = String(text || '').trim();
  if (!clean) return '';
  const cached = readCache(clean);
  if (cached) return cached;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean.slice(0, 480))}&langpair=en|ru`;
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error('translation unavailable');
    const data = await response.json();
    const translated = decodeEntities(String(data?.responseData?.translatedText || '')).trim();
    if (!translated || translated.toLowerCase() === clean.toLowerCase()) throw new Error('empty translation');
    writeCache(clean, translated);
    return translated;
  } finally {
    clearTimeout(timer);
  }
}

