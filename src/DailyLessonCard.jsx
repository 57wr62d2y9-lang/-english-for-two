import React from 'react';
import {dayKey,studySlot} from './learning.js';
import {completedStudyDays} from './rewards.js';
import {RewardRules} from './RewardOverview.jsx';

export function dailyLessonState(stats,wallet,session,time=Date.now()) {
  const today=dayKey(time),slot=studySlot(time),active=Boolean(session&&!session.done);
  const completed=completedStudyDays(stats,time)[today] || {};
  const slots=Object.fromEntries(['morning','evening'].map(part=>{
    const amount=Number(wallet?.earned?.[`routine:${today}:${part}`]?.amount || 0);
    return [part,{amount,done:amount>0||Boolean(completed[part]),active:active&&part===slot}];
  }));
  return {today,slot,slots,active,minutes:Math.round((stats?.byDay?.[today]?.seconds || 0)/60)};
}

export default function DailyLessonCard({settings,stats,wallet,session,onStart,time}) {
  const state=dailyLessonState(stats,wallet,session,time),current=state.slots[state.slot];
  const title=state.slot==='morning'?'Утренний':'Вечерний';
  const minutes=Number(settings.minutes)||15,goal=Number(settings.dailyGoal)||30;
  const percent=Math.min(100,Math.round(state.minutes/goal*100));
  return <section className="todayCard">
    <div className="todayTop"><div><div className="eyebrow">{title.toUpperCase()} УРОК</div>
      <h1>{current.done?`${title} урок завершён`:state.active?'Продолжим урок':'Новый шаг сегодня'}</h1>
      <p>Цель по времени за день: {state.minutes} из {goal} минут</p></div>
      <div className="dayRing" role="progressbar" aria-label="Дневная цель по времени" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} style={{'--done':percent+'%'}}><span>{percent}%</span></div>
    </div>
    <p className="quietStudyNote">Читай, пиши и проговаривай примеры про себя. Говорить вслух не нужно.</p>
    <div className="lessonChips"><span>Новые слова и фразы</span><span>Жизненные примеры</span><span>Повторы по памяти</span></div>
    <button className="primary big" onClick={()=>onStart(minutes)}>{state.active?'Продолжить сохранённый урок':current.done?`Дополнительная практика · ${minutes} минут`:`Начать урок · ${minutes} минут`}</button>
    {!state.active&&!current.done&&<button className="quietButton" onClick={()=>onStart(5)}>Есть только 5 минут</button>}
    <div className="slotRow">{[['morning','☀ Утро'],['evening','☾ Вечер']].map(([part,label])=>{
      const value=state.slots[part];
      return <span key={part} className={value.done?'done':''}><strong>{label}</strong>{value.amount>0?`Завершён · +$${value.amount}`:value.done?'Завершён · ожидается $1':value.active?'В процессе · $1 за урок':'Ещё не пройден · $1'}</span>;
    })}</div>
    <p className="helper">Процент в круге — только время практики за день. Завершение уроков и награды показаны отдельно: «Утро» и «Вечер».</p>
    {current.amount>0&&!state.active&&<p className="helper">Награда за {state.slot==='morning'?'утро':'вечер'} уже в копилке. Дополнительная практика сохраняет знания, но не даёт второй выплаты за ту же часть дня.</p>}
    <p className="helper">В обычном уроке — до {{gentle:8,normal:12,more:16}[settings.vocabPace]||12} новых слов и выражений. Между ними — практика и повторы по сроку.</p>
    <RewardRules/>
  </section>;
}
