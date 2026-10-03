import React from 'react';
import {dayKey,studySlot} from './learning.js';
import {completedStudyDays} from './rewards.js';
import {RewardRules} from './RewardOverview.jsx';

export function dailyLessonState(stats,wallet,session,time=Date.now()) {
  const today=dayKey(time),slot=studySlot(time),active=Boolean(session&&!session.done);
  const completed=completedStudyDays(stats,time)[today] || {};
  const slots=Object.fromEntries(['morning','evening'].map(part=>{
    const entry=wallet?.earned?.[`routine:${today}:${part}`];
    const amount=Number(entry?.amount || 0)+Number(entry?.checkpointRewardId?wallet.earned?.[entry.checkpointRewardId]?.amount||0:0);
    return [part,{amount,done:entry?.completed===true||amount>0||Boolean(completed[part]),active:active&&part===slot}];
  }));
  return {today,slot,slots,active,minutes:Math.round((stats?.byDay?.[today]?.seconds || 0)/60)};
}

export default function DailyLessonCard({settings,stats,wallet,session,checkpoint,scheduledCheck,onStart,time}) {
  const state=dailyLessonState(stats,wallet,session,time),current=state.slots[state.slot];
  const title=state.slot==='morning'?'Утренний':'Вечерний';
  const minutes=Number(settings.minutes)||15,checkActive=checkpoint&&!checkpoint.done;
  const check=checkActive?checkpoint:!state.active?scheduledCheck:null;
  return <section className="todayCard">
    <div className="todayTop"><div><div className="eyebrow">{title.toUpperCase()} УРОК</div>
      <h1>{check?check.quarter?`Контрольная ${check.quarter}`:'Итог уровня':state.active?'Продолжим урок':current.done?`${title} урок завершён`:'Новые слова сегодня'}</h1>
      <p>{check?`${check.quarter?10:20} карточек · ${check.quarter?'награда $5':settings.level==='A2'?'награда $100':'проверка всей программы'}`:`${settings.level} · ${state.minutes} минут практики сегодня`}</p></div>
    </div>
    <p className="quietStudyNote">{check?'Эта проверка заменяет следующий урок. Занятие засчитается автоматически.':'Слова, перевод и жизненные примеры. Учимся без видео и без разговора вслух.'}</p>
    <button className="primary big" onClick={()=>onStart(minutes)}>{check?checkActive?'Продолжить контрольную':'Начать контрольную →':state.active?'Продолжить урок →':current.done?'Ещё попрактиковаться →':`Начать · ${minutes} минут →`}</button>
    {!check&&!state.active&&!current.done&&<button className="quietButton" onClick={()=>onStart(5)}>Короткий урок · 5 минут</button>}
    <div className="slotRow">{[['morning','☀ Утро'],['evening','☾ Вечер']].map(([part,label])=>{
      const value=state.slots[part];
      return <span key={part} className={value.done?'done':''}><strong>{label}</strong>{value.amount>0?`Готово · +$${value.amount}`:value.done?'Готово ✓':value.active?'В процессе':'Урок · +$1'}</span>;
    })}</div>
    {current.done&&!state.active&&<p className="helper">Награда за {state.slot==='morning'?'утро':'вечер'} уже получена. Дополнительная практика сохраняет ответы.</p>}
    <RewardRules/>
  </section>;
}
