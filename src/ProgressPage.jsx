import React from 'react';
import {TOTAL_LEXICAL_UNITS} from './lexicon.js';
import {lessonRewardTotal} from './rewards.js';
import {microScene} from './micro-lessons.js';
import {AttendanceCard,CheckRewardsSection} from './RewardOverview.jsx';

export function VocabularyProgress({vocab,level}) {
 return <section className="vocabularyProgress">
  <div className="eyebrow">ЛИЧНЫЙ СЛОВАРЬ · {level}</div><h2>Знакомство и закрепление</h2>
  <div className="vocabularyNumbers"><span><b>{vocab.introduced}</b> встречалось в уроках</span><span><b>{vocab.verified}</b> подтверждено проверкой</span><span><b>{vocab.ready||0}</b> готово к проверке</span><span><b>{vocab.remaining}</b> еще не встречалось</span></div>
  <div className="vocabularyMeter" role="progressbar" aria-label="Подтвержденное закрепление слов и фраз" aria-valuenow={vocab.verified} aria-valuemin={0} aria-valuemax={vocab.available}><i style={{width:(vocab.verified/Math.max(1,vocab.available)*100)+'%'}}/></div>
  <p className="vocabularyCaption">Подтверждено {vocab.verified} из {vocab.available}. {vocab.verified===0&&vocab.introduced>0?'Повторения сохранены; подтверждение появится после самостоятельных ответов и проверки.':'Повторы и проверки помогают увидеть, что осталось в памяти.'}</p>
  <details className="progressExplanation"><summary>Как считается закрепление</summary><p>Нужны три самостоятельных письменных повтора в разные дни, минимум неделя между первым и последним, затем верный ответ в проверке. Выбор из вариантов и кнопка «знаю» не подтверждают закрепление.</p><p>В словаре {vocab.words} слов и {vocab.phrases} выражений. Во всей базе — {TOTAL_LEXICAL_UNITS} разных единиц. Примеры и повторы не увеличивают это число.</p><p>База пока не охватывает словарный запас носителя. Это доля закрепленных карточек приложения, а не оценка уровня CEFR.</p></details>
 </section>;
}

export function studyDuration(seconds) {
 const n=Math.max(0,Math.round(Number(seconds)||0));
 return n===0?'Короткая практика':n<60?`${n} сек`:`${Math.round(n/60)} мин`;
}

export function PracticeHistory({stats,level}) {
 const records=Object.values(stats.lessons||{}).filter(r=>r.level===level).sort((a,b)=>b.at-a.at).slice(0,12);
 return <section className="history"><h2>Последние занятия</h2>{records.length===0?<p className="historyEmpty">Здесь появятся сохраненные занятия. Можно начать с одной минуты.</p>:records.map(r=>{
  const reward=lessonRewardTotal(r),micro=r.kind==='micro';
  const label=micro?`${microScene({sceneId:r.situation}).title} · ${r.completed?'занятие сохранено':'часть занятия сохранена'}`:r.kind==='checkpoint'?`${r.mode==='weekly'?'Контрольная недели':r.quarter?`${r.retest?'Повторная проверка':'Контрольная'} ${r.quarter}`:'Итоговая проверка'} · ${r.passed?'пройдена':'попытка сохранена'}`:r.completed?'Практика сохранена':'Часть практики сохранена';
  return <div key={r.id}><span><strong>{new Date(r.at).toLocaleDateString('ru-RU',{day:'numeric',month:'long'})} · {studyDuration(r.seconds)}</strong><small>{label}{r.imported?' · из предыдущей версии':''}</small></span>{reward>0&&<b>+${reward}</b>}</div>;
 })}</section>;
}

export default function ProgressPage({vocab,level,path,items,progress,stats,wallet,onCheck}) {
 return <><VocabularyProgress vocab={vocab} level={level}/><div className="statsGrid progressTotals"><div className="stat"><strong>{Math.round(stats.totalMinutes||0)}</strong><span>минут за все время</span></div><div className="stat"><strong>{stats.answers||0}</strong><span>ответов сохранено</span></div></div><PracticeHistory stats={stats} level={level}/><details className="progressRewards"><summary>Проверки и накопительные бонусы</summary><CheckRewardsSection level={level} path={path} items={items} progress={progress} wallet={wallet} stats={stats} onCheck={onCheck}/><AttendanceCard stats={stats} wallet={wallet}/></details></>;
}
