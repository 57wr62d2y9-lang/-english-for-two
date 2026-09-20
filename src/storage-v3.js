import { normaliseItem } from './learning.js';
const tg = () => typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
export const inTelegram = () => Boolean(tg()?.initData && tg()?.initDataUnsafe?.user?.id);
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
  for (const [id, item] of Object.entries(b)) if (!out[id] || (item.l || 0) > (out[id].l || 0)) out[id] = item;
  return out;
}
const BUCKETS = 64;
const hash = id => [...id].reduce((n,c) => (n * 31 + c.charCodeAt(0)) >>> 0, 0) % BUCKETS;
const queues = new Map();
const dirtyStatsMonths = new Set();
let statsJob = null;
async function setRemote(key, value) {
  const text = JSON.stringify(value);
  if (text.length > 4096) { status('error'); return false; }
  if (!inTelegram()) { status('local'); return false; }
  status('syncing');
  const r = await cloudCall('setItem', key, text);
  status(r.ok ? 'synced' : 'pending');
  return r.ok;
}
// 64 bounded buckets per level leave enough room for a full 400-unit route.
const FIELDS = ['s','c','w','l','n','f','step','rec','ctx','days','xp','v','known','rewardDay','event'];
export const packItems = items => Object.fromEntries(Object.entries(items).map(([id,p]) => [id, FIELDS.map(f => p[f] ?? null)]));
export const unpackItems = items => Object.fromEntries(Object.entries(items || {}).map(([id,v]) => [id, Array.isArray(v) ? normaliseItem(Object.fromEntries(FIELDS.map((f,i) => [f,v[i] ?? undefined]))) : normaliseItem(v)]));
export async function loadSettings() {
  const a = localRead(prefix() + 'settings');
  const remote = parse((await cloudCall('getItem','eft3_settings')).value);
  const current = choose(a, remote);
  if (current) { localWrite(prefix()+'settings',current); return current.data; }
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
      const ok = await setRemote(`eft3_p_${level}_${bucket}`, packItems(subset));
      if (ok) localWrite(pendingKey,(localRead(pendingKey)||[]).filter(x=>x!==bucket));
      else all = false;
    }
    if (all) localWrite(prefix()+'migrated:'+level,true);
    return all;
  });
  queues.set(level,job.catch(()=>false)); return job;
}
export const emptyStats = () => ({ totalMinutes:0, sessions:0, correct:0, answers:0, byDay:{}, legacy:{totalMinutes:0,sessions:0,correct:0,answers:0} });
export async function loadStats() {
  const local = localRead(prefix()+'stats');
  const legacy = localRead(legacyPrefix()+'stats') || emptyStats();
  const base = local || { ...emptyStats(), legacy: { totalMinutes:legacy.totalMinutes||0,sessions:legacy.sessions||0,correct:legacy.correct||0,answers:legacy.answers||0 }, byDay: {} };
  const keysResult = await cloudCall('getKeys');
  const keys = (keysResult.value || []).filter(k=>/^eft3_stats_\d{4}-\d{2}$/.test(k)).slice(-120);
  for (let start=0; start<keys.length; start+=50) {
    const remote = await cloudCall('getItems',keys.slice(start,start+50));
    for (const value of Object.values(remote.value || {})) for (const [day,record] of Object.entries(parse(value)||{})) base.byDay[day] = choose(base.byDay[day],record);
  }
  const remoteLegacy = parse((await cloudCall('getItem','eft3_stats_base')).value);
  if (remoteLegacy) for (const f of ['totalMinutes','sessions','correct','answers']) base.legacy[f] = Math.max(base.legacy[f]||0,remoteLegacy[f]||0);
  localWrite(prefix()+'stats',base);
  return summariseStats(base);
}
export function summariseStats(stats) {
  const out = { ...stats, ...stats.legacy };
  for (const r of Object.values(stats.byDay || {})) { out.totalMinutes += (r.seconds||0)/60; out.sessions += r.sessions||0; out.correct += r.correct||0; out.answers += r.answers||0; }
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
        for (const month of months) await setRemote('eft3_stats_'+month,Object.fromEntries(Object.entries(latest.byDay||{}).filter(([d])=>d.startsWith(month))));
      }
    })().finally(() => { statsJob = null; });
  }
  return statsJob;
}
export async function loadWallet() {
  const local = localRead(prefix()+'wallet') || { earned:{},spent:{} };
  const keys = (await cloudCall('getKeys')).value || [];
  const relevant = keys.filter(k=>/^eft3_(earned|spent)_/.test(k)).slice(0,80);
  const remote = relevant.length ? await cloudCall('getItems',relevant) : {value:{}};
  for (const value of Object.values(remote.value||{})) { const x=parse(value); if(['earned','spent'].includes(x?.kind) && x.id && x.data) local[x.kind][x.id] = x.data; }
  localWrite(prefix()+'wallet',local); return local;
}
export async function saveWallet(wallet) {
  const before = localRead(prefix()+'wallet') || {earned:{},spent:{}};
  localWrite(prefix()+'wallet',wallet);
  for (const kind of ['earned','spent']) for (const [id,data] of Object.entries(wallet[kind])) {
    if (before[kind]?.[id] && localRead(prefix()+`ack:${kind}:${id}`)) continue;
    const ok=await setRemote(`eft3_${kind}_${id.replaceAll(':','_')}`,{kind,id,data});
    if(ok) localWrite(prefix()+`ack:${kind}:${id}`,true);
  }
}
