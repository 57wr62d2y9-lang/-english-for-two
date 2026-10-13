// Recognition in the arcade is separate from learning/mastery evidence.
export const FAST_ANSWER_MS=3000;
export const SPEED_REST_MS=14*86400000;
export const speedMemoryKey=(level,id)=>`${level}:${id}`;
export function cleanSpeedMemory(raw={}) {
  return Object.fromEntries(Object.entries(raw||{}).filter(([key,v])=>/^(A2|B1|B2|C1):[\w-]{1,120}$/.test(key)&&Number.isSafeInteger(v?.at)&&v.at>0&&typeof v.correct==='boolean'&&Number.isFinite(v.ms)&&v.ms>=250&&v.ms<=90000).map(([key,v])=>[key,{at:v.at,correct:v.correct,ms:Math.round(v.ms)}]));
}
export function mergeSpeedMemory(a={},b={}) {
  const out=cleanSpeedMemory(a);
  for(const [key,v] of Object.entries(cleanSpeedMemory(b))) {
    const old=out[key];
    if(!old||v.at>old.at||(v.at===old.at&&(!v.correct||v.ms>old.ms)))out[key]=v;
  }
  return out;
}
export const restingSpeedWord=(memory,level,id,time)=>{
  const v=memory?.[speedMemoryKey(level,id)];
  return Boolean(v?.correct&&v.ms<=FAST_ANSWER_MS&&v.at<=time&&time-v.at<SPEED_REST_MS);
};
export function rememberSpeedAnswers(memory,round) {
  let next=memory||{};
  for(const a of round.answers||[])next=mergeSpeedMemory(next,{[speedMemoryKey(round.level,a.id)]:{at:a.at,correct:a.correct,ms:a.ms}});
  return next;
}
export function speedMemoryChunks(memory,limit=3800) {
  const chunks=[];let chunk={};
  for(const [key,v] of Object.entries(cleanSpeedMemory(memory)).sort(([a],[b])=>a.localeCompare(b))) {
    if(Object.keys(chunk).length&&JSON.stringify({...chunk,[key]:v}).length>limit){chunks.push(chunk);chunk={};}
    chunk[key]=v;
  }
  chunks.push(chunk);return chunks;
}
