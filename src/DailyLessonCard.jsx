import React from 'react';
import {dayKey,studyDuration,studySlot} from './learning.js';
import {completedStudyDays} from './rewards.js';
import {RewardRules} from './RewardOverview.jsx';
import {Icon} from './AppChrome.jsx';

function StudyAction({kind,icon,title,detail,onClick,disabled = false}) {
  return <button type="button" className={`studyAction ${kind}`} onClick={onClick} disabled={disabled}>
    <span className="studyActionIcon"><Icon name={icon}/></span>
    <span className="studyActionText"><strong>{title}</strong><small>{detail}</small></span>
    {!disabled && <span className="studyActionArrow" aria-hidden="true"><Icon name="arrow"/></span>}
  </button>;
}

export default function DailyLessonCard({stats,wallet,dailyGoal,due,lesson,review,check,onLesson,onReview,onCheck,time = Date.now()}) {
  const today = dayKey(time);
  const studiedSeconds = stats.byDay?.[today]?.seconds || 0;
  const completed = completedStudyDays(stats,time)[today] || {};
  const currentSlot = studySlot(time);
  const lessonTitle = lesson ? 'Продолжить урок' : 'Начать урок';
  const checkTitle = check?.resuming ? 'Продолжить контрольную' : check?.retest ? 'Пересдать контрольную' : 'Контрольная недели';
  const checkDetail = check ? 'Для зачёта · от 80%' : 'Следующая в понедельник';
  return <>
    <section className="studyHero" aria-label="Сегодняшнее занятие">
      <header className="studyHeroHeading">
        <h1>Урок на {lesson?.minutes || 15} минут</h1>
        <Icon name="book"/>
      </header>
      <p className="studyHeroDescription">Новые слова и фразы, перевод и задания в контексте.</p>
      <button type="button" className="studyStart" onClick={onLesson}><span>{lessonTitle}</span><Icon name="arrow"/></button>
      <div className="studyToday">
        <span>Сегодня · {studyDuration(studiedSeconds,'0 мин')} из {dailyGoal} мин</span>
        <div className="slotRow">{[['morning','Утро'],['evening','Вечер']].map(([slot,label]) => {
          const reward = wallet.earned?.[`routine:${today}:${slot}`];
          const amount = Number(reward?.amount || 0) + Number(wallet.earned?.[reward?.checkpointRewardId]?.amount || 0);
          const done = reward?.completed || amount > 0 || completed[slot];
          return <span key={slot} className={done ? 'done' : ''}><strong>{label}</strong>
            {done ? amount > 0 ? `Готово · +$${amount}` : 'Готово' : lesson && lesson.slot === slot ? 'В процессе' : currentSlot === slot ? 'Можно начать' : 'Урок'}
          </span>;
        })}</div>
      </div>
    </section>
    <section className="studyActions" aria-label="Другие занятия">
      <StudyAction kind="studyReview" icon="repeat" title={review ? 'Продолжить повторение' : 'Повторить слова'}
        detail={due ? `${due} к повторению` : 'Знакомые слова и фразы'} onClick={onReview}/>
      <StudyAction kind="studyCheck" icon="check" title={check ? checkTitle : 'Контрольная пройдена'}
        detail={checkDetail} onClick={onCheck} disabled={!check}/>
    </section>
    <RewardRules/>
  </>;
}
