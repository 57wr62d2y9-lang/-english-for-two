import {lexiconForLevel,progressFor} from './lexicon.js';
import {dayKey,isDue} from './learning.js';
import {examplesFor,guideFor} from './lesson-notes.js';
import {isAnswerCorrect} from './answer-check.js';
import {readyForCheck} from './mastery.js';
import {weekKey} from './arcade.js';

// Original short situations. Each level practices its own existing vocabulary IDs.
export const situations=[
 {id:'plans',title:'Договориться о встрече',goal:'Ответить на предложение и договориться о времени',dialogue:['Alex: Shall we meet at six?','Sam: Could we make it seven instead?','Alex: Sure. See you there.'],ru:'Алекс предлагает встретиться в шесть. Сэм предлагает семь. Они договариваются.',reply:'Друг предлагает встретиться завтра в семь. Ответь, подходит ли тебе это время, и добавь одну деталь.',ids:{A2:['p001','p004'],B1:['p048','p030'],B2:['p070','p076'],C1:['p084','p090']}},
 {id:'late',title:'Когда планы меняются',goal:'Объяснить небольшую проблему без лишнего напряжения',dialogue:['Alex: I’m running a little late.','Sam: Thanks for letting me know.','Alex: I’ll be there in ten minutes.'],ru:'Алекс немного опаздывает, предупреждает и говорит, когда придет.',reply:'Ты опаздываешь на встречу на десять минут. Напиши короткое сообщение другу.',ids:{A2:['p013','p002'],B1:['p029','p043'],B2:['p067','p074'],C1:['p082','p093']}},
 {id:'choice',title:'Выбрать вместе',goal:'Выразить предпочтение и оставить место другому мнению',dialogue:['Alex: Would you rather stay in or go out?','Sam: I’d prefer somewhere quiet.','Alex: How about the café near the park?'],ru:'Алекс предлагает остаться дома или выйти. Сэм предпочитает тихое место.',reply:'Вас зовут в шумный ресторан. Предложи более спокойный вариант и объясни почему.',ids:{A2:['p003','p010'],B1:['p026','p046'],B2:['p070','p077'],C1:['p085','p100']}},
 {id:'clarify',title:'Уточнить, а не угадывать',goal:'Переспросить и проверить понимание',dialogue:['Alex: Let’s move it to Friday.','Sam: Do you mean this Friday or next Friday?','Alex: This Friday, the thirteenth.'],ru:'Сэм уточняет, какую именно пятницу имеет в виду Алекс.',reply:'Коллега пишет: «Давай перенесем на следующую неделю». Уточни день и время.',ids:{A2:['p023','p020'],B1:['p031','p044'],B2:['p056','p078'],C1:['p082','p092']}},
 {id:'opinion',title:'Не согласиться спокойно',goal:'Признать чужую мысль и высказать свою',dialogue:['Alex: We should book the cheapest room.','Sam: I see your point, but it’s quite far from the centre.','Alex: Let’s check a few more options.'],ru:'Сэм понимает аргумент о цене, но напоминает о расстоянии до центра.',reply:'Друг выбирает самый дешевый отель далеко от центра. Объясни свое мнение в двух предложениях.',ids:{A2:['p007','p021'],B1:['p027','p028'],B2:['p061','p062'],C1:['p097','p098']}},
 {id:'uncertain',title:'Когда пока нет ответа',goal:'Выразить неуверенность без резкого отказа',dialogue:['Alex: Are you coming this weekend?','Sam: I’m not sure yet. I need to check my plans.','Alex: No problem. Let me know tomorrow.'],ru:'Сэм пока не уверен и обещает уточнить планы.',reply:'Тебя зовут в поездку, но ты еще не знаешь, свободен ли. Ответь и скажи, когда уточнишь.',ids:{A2:['p007','p011'],B1:['p036','p037'],B2:['p056','p076'],C1:['p091','p095']}}
];
export function makeMicro(level,progress,stats,minutes=5,time=Date.now()) {
 const pool=lexiconForLevel(level),recent=Object.values(stats.lessons||{}).filter(r=>r.kind==='micro'&&r.level===level).sort((a,b)=>b.at-a.at);
 const last=recent[0],returning=Boolean(Object.values(stats.byDay||{}).some(d=>d.answers>0)&&!Object.entries(stats.byDay||{}).some(([day,d])=>day>=dayKey(time-7*86400000)&&d.answers>0));
 const scene=[...situations].sort((a,b)=>{
   const lastAt=s=>recent.find(r=>r.situation===s.id)?.at||0;return lastAt(a)-lastAt(b);
 })[0];
 let focus=scene.ids[level].map(id=>pool.find(i=>i.id===id)).filter(Boolean).slice(0,minutes===1||returning?1:2);
 // Once the scene's starter expressions have been encountered, keep one
 // anchor and introduce one unseen unit from the full personal-level lexicon.
 // Prefer the scenario's subject; unrelated additions are explicitly labelled
 // as a separate vocabulary expansion in the UI, not invented dialogue.
 if(minutes===5&&!returning&&focus.every(i=>progressFor(i,progress))) {
  const themes={plans:/plan|time|arrang|meet|schedule/i,late:/time|travel|transport|late/i,choice:/food|cafe|choice|prefer|restaurant/i,clarify:/communicat|clarif|work|question/i,opinion:/opinion|agree|discuss|reason/i,uncertain:/plan|certain|think|decis/i};
  const unseen=pool.filter(i=>!progressFor(i,progress)).sort((a,b)=>Number(themes[scene.id].test(`${b.topic} ${b.phrase}`))-Number(themes[scene.id].test(`${a.topic} ${a.phrase}`)));
  if(unseen.length)focus=[focus[0],unseen[0]];
 }
 const known=pool.filter(i=>progressFor(i,progress)&&progressFor(i,progress).s!=='NEW'&&!focus.some(f=>f.id===i.id));
 const evidence=new Map();for(const r of [...recent].reverse())for(const a of r.items||[])evidence.set(a.id,a);
 const failed=id=>evidence.get(id)?.correct===false;
 const checkedThisWeek=recent.some(r=>r.miniCheck&&weekKey(r.at)===weekKey(time));
 const eligible=i=>!checkedThisWeek&&readyForCheck(progressFor(i,progress),time)&&time-(progressFor(i,progress).checkAt||0)>=7*86400000;
 const reviews=known.sort((a,b)=>Number(eligible(b))-Number(eligible(a))||Number(failed(b.id))-Number(failed(a.id))||Number(isDue(progressFor(b,progress),time))-Number(isDue(progressFor(a,progress),time))||(progressFor(a,progress).l||0)-(progressFor(b,progress).l||0)).slice(0,minutes===1?0:returning?1:3);
 const stages=[{type:'story'},...focus.map(item=>({type:'learn',item})),...reviews.map((item,index)=>({type:'recall',item,review:true,check:index===0&&eligible(item)})),...focus.map(item=>({type:'recall',item})),...(minutes===1?[]:[{type:'reply'}])];
 return {kind:'micro',version:1,id:crypto.randomUUID(),level,minutes,startedAt:time,elapsedMs:0,index:0,stages,sceneId:scene.id,returning,answers:[],done:false,previousScene:last?.situation};
}
export const microScene=s=>situations.find(x=>x.id===s.sceneId)||situations[0];
export const microTask=stage=>({type:'recall',item:stage.item,answer:stage.item.phrase,accepted:stage.item.accepted||[]});
export const checkMicro=(stage,value)=>isAnswerCorrect(microTask(stage),value);
export function microEvidence(s,value,time=Date.now()) {
 const stage=s.stages[s.index];if(s.feedback||stage?.type!=='recall'||!value.trim())return s;
 return {...s,feedback:{value,correct:checkMicro(stage,value),at:time},answers:[...s.answers,{id:stage.item.id,value,correct:checkMicro(stage,value),check:Boolean(stage.check),at:time}]};
}
export function settleMicro(s,stats,time=Date.now()) {
 if(stats.lessons?.[s.id])return stats;
 const completed=s.index>=s.stages.length-1&&Boolean(s.feedback),day=dayKey(s.startedAt),old=stats.byDay?.[day]||{};
 const record={id:s.id,kind:'micro',level:s.level,situation:s.sceneId,at:time,studyDay:day,seconds:Math.round(s.elapsedMs/1000),answers:s.answers.length,items:s.answers,miniCheck:s.answers.some(a=>a.check),correct:s.answers.filter(a=>a.correct).length,completed,reward:0,climb:0};
 return {...stats,lessons:{...stats.lessons,[s.id]:record},byDay:{...stats.byDay,[day]:{...old,seconds:(old.seconds||0)+record.seconds,sessions:(old.sessions||0)+1,at:time}}};
}
export {examplesFor,guideFor};
