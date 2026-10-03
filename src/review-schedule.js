export const REVIEW_INTERVALS=[3,5,8,12,30,35,60,90];
const DAY=86400000;
export function scheduledReviewAt(p) {
  if(!p)return 0;
  const next=Number(p.n)||0;
  if(p.sv===2 || p.known || !p.lastCorrect || p.lastCorrect<=Number(p.lastWrong||0) ||
    !p.step || next>Number(p.lastCorrect)+DAY+1000)return next;
  return Math.max(next,Number(p.lastCorrect)+REVIEW_INTERVALS[Math.min(7,p.step-1)]*DAY);
}
