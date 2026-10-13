import {weekKey,cleanArcadeSummary,compareArena} from './arcade-summary.js';
export const FIRST_PAID_WEEK='2026-10-12';
export const championAwardId=(week,a,b)=>`arena-champion:${week}:${[a,b].sort().join(':')}`;
const previousWeek=time=>weekKey(Date.parse(weekKey(time)+'T12:00:00Z')-7*86400000);
const profileWeek=profile=>{
  const at=Date.parse(profile?.updated_at||'');return Number.isFinite(at)?weekKey(at):'';
};
// The only write is an INSERT under a unique immutable key. A concurrent
// request reads the existing winner, never overwrites it or sends Telegram.
export async function settleChampionship(db,accountId,partnerId,own,partner,time=Date.now()) {
  const previous=previousWeek(time),current=weekKey(time),awards=[];
  let championship={week:previous,status:previous<FIRST_PAID_WEEK?'none':'pending'};
  const a=cleanArcadeSummary(own?.routines?.arcade,time).records,b=cleanArcadeSummary(partner?.routines?.arcade,time).records;
  const weeks=new Set([previous,...a.map(r=>r.week),...b.map(r=>r.week)]);
  for(const week of [...weeks].filter(w=>w>=FIRST_PAID_WEEK&&w<current).sort()) {
    const id=championAwardId(week,accountId,partnerId);
    const read=()=>db.from('eft_notifications').select('id, recipient_id, payload, created_at').eq('id',id).maybeSingle();
    const found=await read();if(found.error)throw found.error;let row=found.data;
    if(!row&&profileWeek(own)>week&&profileWeek(partner)>week) {
      const x=a.find(r=>r.week===week&&r.score>0),y=b.find(r=>r.week===week&&r.score>0);
      if(x||y) {
        const cmp=compareArena(x,y),self=cmp>0||(cmp===0&&accountId<partnerId);
        const recipient_id=self?accountId:partnerId,sender_id=self?partnerId:accountId,record=self?x:y;
        const payload={kind:'weekly-champion',week,reward:5,winnerName:String((self?own:partner)?.display_name||'Partner').slice(0,30),score:record.score,correct:record.correct,wrong:record.wrong,bestStreak:record.bestStreak};
        const candidate={id,recipient_id,sender_id,payload,created_at:new Date(time).toISOString()};
        const inserted=await db.from('eft_notifications').insert(candidate);
        if(inserted.error&&inserted.error.code!=='23505')throw inserted.error;
        if(inserted.error){const existing=await read();if(existing.error)throw existing.error;if(!existing.data)throw Error('Champion award could not be confirmed');row=existing.data;}else row=candidate;
      } else if(week===previous)championship={week,status:'none'};
    }
    if(row) {
      const award={id:row.id,week,status:'final',winner:row.recipient_id===accountId?'self':'partner',winnerName:row.payload.winnerName,amount:5,at:Date.parse(row.created_at)};
      awards.push(award);if(week===previous)championship=award;
    }
  }
  return {championship,championAwards:awards};
}
