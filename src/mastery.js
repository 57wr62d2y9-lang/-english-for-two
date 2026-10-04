// Product rules, not a CEFR assessment. Exposure and multiple choice are not
// evidence of independent recall. Legacy records remain intact and reviewable.
export const MASTERY_VERSION = 1;
export const MIN_RECALL_DAYS = 3;
export const MIN_RECALL_SPAN_DAYS = 7;
export const CHECK_BATCH_SIZE = 10;
export const CHECK_REVIEW_DAYS = 7;
const DAY = 86400000;
const dateKey = time => new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(time));
const validDays = days => [...new Set((Array.isArray(days)?days:[]).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)))].sort().slice(-8);
const span = days => days.length>1 ? (Date.parse(days.at(-1))-Date.parse(days[0]))/DAY : 0;

export function recallEvidence(p = {}) {
  const days = validDays(p.proofDays);
  return {days,span:span(days),ready:days.length>=2 && span(days)>=3,
    retained:days.length>=MIN_RECALL_DAYS && span(days)>=MIN_RECALL_SPAN_DAYS};
}
export function isSecured(p) {
  if(!p || p.proofVersion!==MASTERY_VERSION)return false;
  const evidence=recallEvidence(p),requiredDay=evidence.days.find((day,index)=>index>=2 &&
    (Date.parse(day)-Date.parse(evidence.days[0]))/DAY>=MIN_RECALL_SPAN_DAYS);
  return evidence.retained && Number(p.checkAt)>Number(p.lastWrong||0) &&
    dateKey(p.checkAt)>=requiredDay && !p.selfKnown;
}
export function readyForCheck(p, time=Date.now()) {
  if(!p || p.selfKnown)return false;
  if(recallEvidence(p).retained)return true;
  // Old SRS days cannot prove which task was answered unaided. They may make a
  // card eligible for a new, hint-free check, but never grant mastery directly.
  const oldDays=validDays(p.days);
  return p.proofVersion!==MASTERY_VERSION && p.rcl>=2 && oldDays.length>=3 && span(oldDays)>=7 &&
    Number(p.lastCorrect||p.l)>Number(p.lastWrong||0) && time-Number(p.f||time)>=7*DAY;
}
export function recordRecallEvidence(p, action, time, {unaided=true,typed=action==='recall',checkpoint=false}={}) {
  if(action==='wrong')return {...p,proofVersion:MASTERY_VERSION,proofDays:[],proofAt:0,checkAt:0};
  if(action==='known')return {...p,proofVersion:MASTERY_VERSION,proofDays:[],proofAt:0,checkAt:0};
  if(!typed || !unaided || !['recall','context'].includes(action))return p;
  const days=validDays(p.proofDays),today=dateKey(time);
  // Keep the initial retention milestone stable. Later successful SRS reviews
  // must not move that milestone past an already passed check. A lapse resets
  // the proof above; the separate SRS day history continues recording reviews.
  // A check is validation, not an extra repetition on the same day.
  if(!checkpoint && !recallEvidence(p).retained && !days.includes(today))days.push(today);
  const next={...p,proofVersion:MASTERY_VERSION,proofDays:validDays(days),
    proofAt:!checkpoint&&!p.proofAt?time:Number(p.proofAt||0),checkAt:checkpoint?time:Number(p.checkAt||0)};
  return next;
}
