import { normaliseItem } from './learning.js';
const tg = () => typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
export const inTelegram = () => Boolean(tg()?.initData && tg()?.initDataUnsafe?.user?.id);
export const telegramProfile = () => {
  const user = tg()?.initDataUnsafe?.user;
  if (!user) return null;
  return { id: String(user.id || ''), firstName: String(user.first_name || ''), username: String(user.username || '') };
};
export const startParameter = () => String(tg()?.initDataUnsafe?.start_param || new URLSearchParams(globalThis.location?.search || '').get('startapp') || '');
const userId = () => inTelegram() ? String(tg().initDataUnsafe.user.id) : 'browser';
const prefix = () => `eft3:${userId()}:`;
const legacyPrefix = () => `eft2:${userId()}:`;
let syncState = 'local';
const listeners = new Set();
export const subscribeSync = (fn) => { listeners.add(fn); fn(syncState); return () => listeners.delete(fn); };
function status(value) { syncState = value; listeners.forEach(fn => fn(value)); }
export function localRead(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } }
function localWrite(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { status('error'); return false; } }
function cloudCall(method, ...args) {
  const c = inTelegram() ? tg()?.CloudStorage : null;
  if (!c?.[method]) return Promise.resolve({ ok: false, value: null });
  return new Promise(resolve => {
    let ended = false;
    const finish = (ok, value) => { if (ended) return; ended = true; clearTimeout(timer); resolve({ ok, value }); };
    const timer = setTimeout(() => finish(false, null), 1600);
    try { c[method](...args, (err, value) => finish(!err, value)); } catch { finish(false, null); }
  });
}
const parse = s => { try { return JSON.parse(s || 'null'); } catch { return null; } };
const choose = (a,b) => !a ? b : !b ? a : (a.at || 0) >= (b.at || 0) ? a : b;
export function mergeItems(a = {}, b = {}) {
  const out = { ...a };
  for (const [id, item] of Object.entries(b)) {
    const old = out[id];
    if (!old || (item.l || 0) > (old.l || 0) || ((item.l || 0) === (old.l || 0) && (item.c || 0) + (item.w || 0) > (old.c || 0) + (old.w || 0))) out[id] = normaliseItem(item);
  }
  return out;
}
const BUCKETS = 64;
const hash = id => [...id].reduce((n,c) => (n * 31 + c.charCodeAt(0)) >>> 0, 0) % BUCKETS;
const queues = new Map();
const dirtyStatsMonths = new Set();
let statsJob = null;
let pairIdentityJob = null;
async function setRemote(key, value) {
  const text = JSON.stringify(value);
  if (text.length > 4096) { status('error'); return false; }
  if (!inTelegram()) { status('local'); return false; }
  status('syncing');
  const r = await cloudCall('setItem', key, text);
  status(r.ok ? 'synced' : 'pending');
  return r.ok;
}
const validPairIdentity = value => Boolean(
  value && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value.id || ''))
  && /^[A-Za-z0-9_-]{43}$/.test(String(value.secret || ''))
);
function createPairIdentity() {
  if (!globalThis.crypto?.randomUUID || !globalThis.crypto?.getRandomValues) throw new Error('Secure browser identity is unavailable.');
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(32));
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return { id:globalThis.crypto.randomUUID(), secret:btoa(binary).replaceAll('+','-').replaceAll('/','_').replaceAll('=',''), at:Date.now() };
}
export function loadPairIdentity() {
  if (pairIdentityJob) return pairIdentityJob;
  pairIdentityJob = (async () => {
    const localKey = prefix() + 'pairIdentity';
    const local = localRead(localKey);
    const remote = parse((await cloudCall('getItem', 'eft3_pair_identity')).value);
    let identity = choose(validPairIdentity(local) ? local : null, validPairIdentity(remote) ? remote : null);
    if (!identity) identity = createPairIdentity();
    localWrite(localKey, identity);
    if (!validPairIdentity(remote) || remote.id !== identity.id || remote.secret !== identity.secret) await setRemote('eft3_pair_identity', identity);
    return identity;
  })().catch(error => {
    pairIdentityJob = null;
    throw error;
  });
  return pairIdentityJob;
}
// Preserve all 64 legacy bucket addresses. Dense buckets use bounded overflow
// parts, written before the base part so a partial write cannot lose old data.
// New fields are only appended, so every existing compact CloudStorage record
// remains readable without resetting Artur's or Anna's history.
const FIELDS = ['s','c','w','l','n','f','step','rec','ctx','days','xp','v','known','rewardDay','event','rcl','lis','selfKnown','knownAt','lastWrong','lastCorrect'];
export const packItems = items => Object.fromEntries(Object.entries(items).map(([id,p]) => [id, FIELDS.map(f => p[f] ?? null)]));
export const unpackItems = items => Object.fromEntries(Object.entries(items || {}).map(([id,v]) => [id, Array.isArray(v) ? normaliseItem(Object.fromEntries(FIELDS.map((f,i) => [f,v[i] ?? undefined]))) : normaliseItem(v)]));
export function progressChunks(items,limit=3900) {
  const chunks=[];let chunk={};
  for(const [id,value] of Object.entries(packItems(items)).sort(([a],[b])=>a.localeCompare(b))) {
    const next={...chunk,[id]:value};
    if(Object.keys(chunk).length && JSON.stringify(next).length>limit){chunks.push(chunk);chunk={[id]:value};}
    else chunk=next;
  }
  chunks.push(chunk);return chunks;
}
export async function loadSettings() {
  const a = localRead(prefix() + 'settings');
  const remote = parse((await cloudCall('getItem','eft3_settings')).value);
  const current = choose(a, remote);
  if (current) { localWrite(prefix()+'settings',current); return {...current.data,updatedAt:current.data?.updatedAt || current.at}; }
  return parse((await cloudCall('getItem','eft2_settings')).value) || localRead(legacyPrefix()+'settings');
}
export async function saveSettings(data) {
  const value = { at: Date.now(), data };
  localWrite(prefix()+'settings', value);
  return setRemote('eft3_settings',value);
}
export async function loadLevelProgress(level) {
  const keys = Array.from({length:BUCKETS},(_,i)=>`eft3_p_${level}_${i}`);
  const local = localRead(prefix()+'progress:'+level) || {};
  const r = await cloudCall('getItems', keys);
  let result = { ...local };
  for (const key of keys) result = mergeItems(result, unpackItems(parse(r.value?.[key])));
  const remoteKeys=await cloudCall('getKeys');
  const overflow=(remoteKeys.value || []).filter(key=>new RegExp(`^eft3_p_${level}_\\d+_\\d+$`).test(key));
  for(let index=0;index<overflow.length;index+=50) {
    const extra=await cloudCall('getItems',overflow.slice(index,index+50));
    for(const value of Object.values(extra.value || {}))result=mergeItems(result,unpackItems(parse(value)));
  }
  const legacyRemote = parse((await cloudCall('getItem',`eft2_progress_${level}`)).value) || {};
  const legacyLocal = localRead(legacyPrefix()+'progress:'+level) || {};
  for (const [id,p] of Object.entries(mergeItems(legacyRemote, legacyLocal))) if (!result[id]) result[id] = normaliseItem(p);
  localWrite(prefix()+'progress:'+level, result);
  if (!r.ok && inTelegram()) status('pending');
  return result;
}
export function saveLevelProgress(level, items) {
  const key = prefix()+'progress:'+level;
  const previous = localRead(key) || {};
  const merged = mergeItems(previous,items);
  if (!localWrite(key,merged)) return Promise.resolve(false);
  const dirty = new Set(Object.keys(merged).filter(id => JSON.stringify(merged[id]) !== JSON.stringify(previous[id])).map(hash));
  const pendingKey = prefix()+'pending:'+level;
  for (const bucket of localRead(pendingKey) || []) dirty.add(bucket);
  if (!localRead(prefix()+'migrated:'+level)) Object.keys(merged).forEach(id=>dirty.add(hash(id)));
  localWrite(pendingKey,[...dirty]);
  const identity = userId();
  const job = (queues.get(level) || Promise.resolve()).then(async () => {
    if (identity !== userId()) return false;
    let all = true;
    for (const bucket of dirty) {
      const latest = localRead(key) || merged;
      const subset = Object.fromEntries(Object.entries(latest).filter(([id])=>hash(id)===bucket));
      const chunks=progressChunks(subset);let ok=true;
      for(let part=1;part<chunks.length;part++) {
        if(!await setRemote(`eft3_p_${level}_${bucket}_${part}`,chunks[part])){ok=false;break;}
      }
      if(ok)ok=await setRemote(`eft3_p_${level}_${bucket}`,chunks[0]);
      if (ok) localWrite(pendingKey,(localRead(pendingKey)||[]).filter(x=>x!==bucket));
      else all = false;
    }
    if (all) localWrite(prefix()+'migrated:'+level,true);
    return all;
  });
  queues.set(level,job.catch(()=>false)); return job;
}
const emptyExam = () => Object.fromEntries(['Listening','Reading','Writing','Speaking'].map(skill => [skill,{attempts:0,correct:0,scored:0,last:0,taskTypes:{}}]));
export const emptyStats = () => ({ totalMinutes:0, sessions:0, correct:0, answers:0, byDay:{}, lessons:{}, ielts:emptyExam(), legacy:{totalMinutes:0,sessions:0,correct:0,answers:0} });
export async function loadStats() {
  const local = localRead(prefix()+'stats');
  const legacy = localRead(legacyPrefix()+'stats') || emptyStats();
  const base = { ...emptyStats(), ...(local || { legacy: { totalMinutes:legacy.totalMinutes||0,sessions:legacy.sessions||0,correct:legacy.correct||0,answers:legacy.answers||0 } }) };
  const keysResult = await cloudCall('getKeys');
  const keys = (keysResult.value || []).filter(k=>/^eft3_stats_\d{4}-\d{2}$/.test(k)).slice(-120);
  for (let start=0; start<keys.length; start+=50) {
    const remote = await cloudCall('getItems',keys.slice(start,start+50));
    for (const value of Object.values(remote.value || {})) for (const [day,record] of Object.entries(parse(value)||{})) base.byDay[day] = choose(base.byDay[day],record);
  }
  const dailyKeys = (keysResult.value || []).filter(k=>/^eft4_day_/.test(k));
  for (let start=0; start<dailyKeys.length; start+=50) {
    const remote = await cloudCall('getItems',dailyKeys.slice(start,start+50));
    for (const [key,value] of Object.entries(remote.value || {})) {
      const day=key.slice('eft4_day_'.length), record=parse(value);
      if(record) base.byDay[day]=choose(base.byDay[day],record);
    }
  }
  const remoteLegacy = parse((await cloudCall('getItem','eft3_stats_base')).value);
  if (remoteLegacy) for (const f of ['totalMinutes','sessions','correct','answers']) base.legacy[f] = Math.max(base.legacy[f]||0,remoteLegacy[f]||0);
  localWrite(prefix()+'stats',base);
  return summariseStats(base);
}
export function summariseStats(stats) {
  const out = {
    ...stats,
    totalMinutes:stats.legacy?.totalMinutes || 0,
    sessions:stats.legacy?.sessions || 0,
    correct:stats.legacy?.correct || 0,
    answers:stats.legacy?.answers || 0,
    ielts:emptyExam()
  };
  for (const r of Object.values(stats.byDay || {})) {
    out.totalMinutes += (r.seconds||0)/60; out.sessions += r.sessions||0; out.correct += r.correct||0; out.answers += r.answers||0;
    for (const [skill, value] of Object.entries(r.ielts || {})) {
      if (!out.ielts[skill]) continue;
      out.ielts[skill].attempts += value.attempts || 0;
      out.ielts[skill].correct += value.correct || 0;
      out.ielts[skill].scored += value.scored || 0;
      out.ielts[skill].last = Math.max(out.ielts[skill].last || 0, value.last || 0);
      for (const [type,raw] of Object.entries(value.taskTypes || {})) {
        const incoming = typeof raw === 'number' ? { attempts:raw, correct:0, scored:0 } : (raw || {});
        const existingRaw = out.ielts[skill].taskTypes[type];
        const existing = typeof existingRaw === 'number' ? { attempts:existingRaw, correct:0, scored:0 } : (existingRaw || {});
        out.ielts[skill].taskTypes[type] = {
          attempts:Number(existing.attempts || 0) + Number(incoming.attempts || 0),
          correct:Number(existing.correct || 0) + Number(incoming.correct || 0),
          scored:Number(existing.scored || 0) + Number(incoming.scored || 0)
        };
      }
    }
  }
  return out;
}
export function saveStats(stats) {
  const previous = localRead(prefix()+'stats');
  localWrite(prefix()+'stats',stats);
  const changed = Object.keys(stats.byDay||{}).filter(d=>JSON.stringify(previous?.byDay?.[d])!==JSON.stringify(stats.byDay[d])).map(d=>d.slice(0,7));
  (changed.length ? changed : Object.keys(stats.byDay||{}).map(d=>d.slice(0,7))).forEach(month=>dirtyStatsMonths.add(month));
  if (!statsJob) {
    statsJob = (async () => {
      while (dirtyStatsMonths.size) {
        const months = [...dirtyStatsMonths];
        dirtyStatsMonths.clear();
        const latest = localRead(prefix()+'stats') || stats;
        await setRemote('eft3_stats_base',latest.legacy||{});
        for (const month of months) for (const [day,record] of Object.entries(latest.byDay || {}).filter(([d])=>d.startsWith(month))) await setRemote('eft4_day_'+day,record);
      }
    })().finally(() => { statsJob = null; });
  }
  return statsJob;
}

export function loadDraft() { return localRead(prefix()+'activeLesson'); }
export function saveDraft(session) { const record={at:Date.now(),data:session};localWrite(prefix()+'activeLesson',record);return record; }
export function loadReadNotifications() { return localRead(prefix()+'readNotifications') || []; }
export function saveReadNotifications(ids) { localWrite(prefix()+'readNotifications',ids.slice(-200)); }
export function getLocalMeta(key) { return localRead(prefix()+key); }
export function setLocalMeta(key,value) { return localWrite(prefix()+key,value); }
export async function loadWallet() {
  const local = { earned:{}, spent:{}, goals:{}, incoming:{}, partner:null, ...(localRead(prefix()+'wallet') || {}) };
  const keys = (await cloudCall('getKeys')).value || [];
  const relevant = keys.filter(k=>/^eft3_(earned|spent)_/.test(k)).slice(0,80);
  const remote = relevant.length ? await cloudCall('getItems',relevant) : {value:{}};
  for (const value of Object.values(remote.value||{})) {
    const x=parse(value);
    if (!['earned','spent'].includes(x?.kind) || !x.id || !x.data) continue;
    const old = local[x.kind][x.id];
    if (!old || (x.data.resolvedAt || x.data.at || 0) >= (old.resolvedAt || old.at || 0)) local[x.kind][x.id] = x.data;
  }
  const remoteMeta = parse((await cloudCall('getItem','eft3_wallet_meta')).value);
  if (remoteMeta) {
    local.goals = { ...(remoteMeta.goals || {}), ...(local.goals || {}) };
    local.incoming = { ...(remoteMeta.incoming || {}), ...(local.incoming || {}) };
    local.partner = choose(local.partner, remoteMeta.partner);
  }
  localWrite(prefix()+'wallet',local); return local;
}
export async function saveWallet(wallet) {
  const before = localRead(prefix()+'wallet') || {earned:{},spent:{},goals:{},incoming:{},partner:null};
  localWrite(prefix()+'wallet',wallet);
  for (const kind of ['earned','spent']) for (const [id,data] of Object.entries(wallet[kind] || {})) {
    const fingerprint = JSON.stringify(data);
    if (before[kind]?.[id] && localRead(prefix()+`ack:${kind}:${id}`) === fingerprint) continue;
    const ok=await setRemote(`eft3_${kind}_${id.replaceAll(':','_')}`,{kind,id,data});
    if(ok) localWrite(prefix()+`ack:${kind}:${id}`,fingerprint);
  }
  const incoming = Object.fromEntries(Object.entries(wallet.incoming || {}).sort((a,b)=>(b[1].at||0)-(a[1].at||0)).slice(0,12));
  await setRemote('eft3_wallet_meta',{ goals:wallet.goals||{}, incoming, partner:wallet.partner||null });
}
