import { invoke, coupleSyncConfigured } from './couple-sync.js';
import { getLocalMeta, setLocalMeta, mergeItems, summariseStats } from './storage-v3.js';

export function backupRecords({level,progress,stats,wallet,draft,settings}) {
  const out=[];
  const add=(key,data,at)=>out.push({key,data,at:Math.max(1,Number(at)||1)});
  for(const [id,item] of Object.entries(progress || {})) add(`progress:${level}:${id}`,item,item.l);
  for(const [id,item] of Object.entries(stats?.lessons || {})) add(`lesson:${id}`,item,item.updatedAt || item.at);
  for(const [day,item] of Object.entries(stats?.byDay || {})) add(`day:${day}`,item,item.at);
  if(stats?.legacy) add('legacy',stats.legacy,1);
  for(const kind of ['earned','spent','goals']) for(const [id,item] of Object.entries(wallet?.[kind] || {})) add(`wallet:${kind}:${id}`,item,item.resolvedAt || item.updatedAt || item.at);
  if(draft) add('draft',draft.data,draft.at);
  if(settings) add('settings',settings,settings.updatedAt);
  return out;
}
export function mergeBackup(state,records) {
  const next={...state,progress:{...state.progress},stats:{...state.stats,byDay:{...state.stats?.byDay},lessons:{...state.stats?.lessons},legacy:{...state.stats?.legacy}},wallet:{...state.wallet,earned:{...state.wallet?.earned},spent:{...state.wallet?.spent},goals:{...state.wallet?.goals}}};
  const pick=(old,value,at)=>!old || at>=(old.resolvedAt || old.updatedAt || old.at || 0) ? value : old;
  for(const record of records || []) {
    const key=record.record_key || record.key, data=record.payload ?? record.data, at=Number(record.updated_ms || record.at || 0);
    if(key.startsWith(`progress:${state.level}:`) && data) {
      const id=key.slice(`progress:${state.level}:`.length);
      next.progress=mergeItems(next.progress,{[id]:data});
    } else if(key.startsWith('lesson:') && data) next.stats.lessons[key.slice(7)]=pick(next.stats.lessons[key.slice(7)],data,at);
    else if(key.startsWith('day:') && data) next.stats.byDay[key.slice(4)]=pick(next.stats.byDay[key.slice(4)],data,at);
    else if(key === 'legacy' && data) for(const field of ['totalMinutes','sessions','answers','correct']) next.stats.legacy[field]=Math.max(next.stats.legacy[field] || 0,data[field] || 0);
    else if(key.startsWith('wallet:') && data) {
      const [,kind,...parts]=key.split(':');const id=parts.join(':');
      if(['earned','spent','goals'].includes(kind)) next.wallet[kind][id]=pick(next.wallet[kind][id],data,at);
    } else if(key === 'draft' && at > (next.draft?.at || 0)) next.draft={at,data};
    else if(key === 'settings' && data && at > (next.settings?.updatedAt || 0)) next.settings={...data,updatedAt:at};
  }
  next.stats=summariseStats(next.stats);
  return next;
}
let writing=Promise.resolve();
export function saveBackup(state,{force=false}={}) {
  if(!coupleSyncConfigured()) return Promise.resolve({ok:false,disabled:true});
  const records=backupRecords(state);
  const job=writing.catch(()=>{}).then(async()=>{
    const ack=getLocalMeta('backupAck') || {};
    const dirty=force ? records : records.filter(record=>ack[record.key] !== JSON.stringify(record));
    for(let i=0;i<dirty.length;i+=120) {
      const batch=dirty.slice(i,i+120);
      const result=await invoke('save_state',{records:batch});
      if(!result.ok) return result;
      for(const record of batch) ack[record.key]=JSON.stringify(record);
      setLocalMeta('backupAck',ack);
    }
    return {ok:true,saved:dirty.length};
  });
  writing=job;return job;
}
export async function restoreBackup(state) {
  if(!coupleSyncConfigured()) return {...state,backupOk:false};
  const records=[];
  for(let offset=0;offset<10000;offset+=500) {
    const result=await invoke('load_state',{offset});
    if(!result.ok) return {...state,backupOk:false};
    records.push(...result.records);
    if(result.records.length<500) break;
  }
  return {...mergeBackup(state,records),backupOk:true};
}
