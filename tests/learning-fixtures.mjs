import {DAY,dayKey} from '../src/learning.js';
export const readyItem=(time=Date.now(),patch={})=>({s:'STABLE',c:6,w:0,rec:1,rcl:3,ctx:1,
  f:time-12*DAY,l:time-DAY,n:time-DAY,lastCorrect:time-DAY,lastWrong:0,
  days:[dayKey(time-8*DAY),dayKey(time-4*DAY),dayKey(time-DAY)],
  proofVersion:1,proofDays:[dayKey(time-8*DAY),dayKey(time-4*DAY),dayKey(time-DAY)],proofAt:time-8*DAY,checkAt:0,v:false,...patch});
export const securedItem=(time=Date.now(),patch={})=>readyItem(time,{s:'MASTERED',v:true,checkAt:time-1000,...patch});
