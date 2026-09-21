const CACHE_PREFIX = 'eft:ru:v4:';
const memory = new Map();
const pending = new Map();

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
  if(pending.has(clean))return pending.get(clean);
  const request=requestTranslation(clean);
  pending.set(clean,request);
  try {return await request;} finally {if(pending.get(clean)===request)pending.delete(clean);}
}

async function requestTranslation(clean) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const parts=[];
    for(const chunk of translationChunks(clean)) {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=en|ru`;
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error('translation unavailable');
      const data = await response.json();
      const value=decodeEntities(String(data?.responseData?.translatedText || '')).trim();
      if(Number(data.responseStatus)!==200 || !value || /MYMEMORY WARNING|QUERY LENGTH LIMIT|USAGE LIMIT/i.test(value))throw new Error('translation unavailable');
      parts.push(value);
    }
    const translated=parts.join(' ');
    if(translated.toLowerCase()===clean.toLowerCase())throw new Error('empty translation');
    writeCache(clean, translated);
    return translated;
  } finally {
    clearTimeout(timer);
  }
}

export function translationChunks(text,maxBytes=450) {
  const out=[];let current='';const encoder=new TextEncoder();
  for(const word of String(text).trim().split(/\s+/)) {
    if(encoder.encode(word).length>maxBytes)throw new Error('word exceeds translation limit');
    const candidate=current?`${current} ${word}`:word;
    if(encoder.encode(candidate).length>maxBytes){out.push(current);current=word;}else current=candidate;
  }
  if(current)out.push(current);
  return out;
}
