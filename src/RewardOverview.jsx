import React from 'react';
import { COURSE_VERSION, checkpointQuarters, checkpointThreshold, finalLevelReady, levelCompletionId } from './learning.js';
import { attendanceProgress } from './rewards.js';

export function RewardRules() {
  return <details className="rewardRules"><summary>Награды за занятия и прогресс</summary>
    <p><b>$1 утром + $1 вечером</b> — за два завершённых урока. Ошибки, переводы, подсказки и скорость ответов не влияют на сумму.</p>
    <p>Заверши подборку и ответь минимум на 5 карточек (на 3 в коротком уроке) — получишь $1, даже с ошибками. Если выходишь раньше конца подборки, нужно 12 минут практики или 4 в коротком уроке. Незавершённые попытки в той же части дня складываются.</p>
    <p><b>$5</b> — за каждую пройденную контрольную: не меньше 8 верных ответов из 10.</p>
    <p>Контрольная появляется сама после каждой четверти словаря и заменяет следующий урок. При успехе выплата за это занятие — $5; отдельный $1 не добавляется. Если не сдал, завершённая попытка всё равно даёт обычный $1.</p>
    <p><b>$100</b> — за завершение всей программы A2: практика всех слов и фраз, три контрольные и итоговая проверка (не меньше 16 из 20).</p>
    <p><b>$10</b> — за каждые 30 дней подряд с входом в приложение. Просто открой приложение — день засчитается. Уроки для этого бонуса не обязательны. Пропуск дня прерывает серию.</p>
    <p>Повторный урок в ту же часть дня и пересдача одной контрольной не дают повторной выплаты. Все деньги, заработанные по прежним правилам, остаются в копилке.</p>
    <p>Дата и часть дня определяются при завершении урока: утро — с 04:00 до 14:00, вечер — в остальное время, по времени Стамбула (UTC+3). Урок, сохранённый утром и завершённый вечером, засчитывается вечером.</p>
  </details>;
}

export function AttendanceCard({stats,wallet,time}) {
  const streak=attendanceProgress(stats,wallet,time);
  return <section className="attendanceCard" aria-label="Бонус за регулярность">
    <div className="attendanceHeading"><div><span className="eyebrow">БОНУС ЗА РЕГУЛЯРНОСТЬ</span><h2>30 дней без пропусков</h2></div><strong>+$10</strong></div>
    <div className="attendanceCount"><span>{streak.rewardedToday?'Следующая серия':'Собрано дней'}</span><b>{streak.days} / {streak.total}</b></div>
    <progress max={streak.total} value={streak.days} aria-label="Дней до бонуса за регулярность"/>
    <div className="attendanceToday"><span className={streak.today?'done':''}>{streak.today?'Сегодня засчитано ✓':'Сегодня ещё не было входа'}</span></div>
    {streak.rewardedToday&&<p className="bonusNotice">Бонус за предыдущие 30 дней уже в копилке. Начинаем следующую серию!</p>}
    <p className="helper">Просто заходи каждый день. Уроки для бонуса не обязательны.</p>
  </section>;
}

export function CheckRewardsSection({level,path,items,progress,wallet,onCheck}) {
  const finished=Boolean(wallet.earned?.[levelCompletionId(level)]);
  return <section className="explainCard"><h2>Проверка знаний {level}</h2>
    <p>Потренировано {path.practised} из {path.total} слов и фраз. Контрольные появляются сами на 25%, 50% и 75% программы вместо следующего урока.</p>
    <p>В каждой проверке 10 карточек. Для $5 нужно 8 верных ответов. После всей программы и трёх контрольных — итог: 20 карточек.</p>
    {checkpointQuarters(level).map(q=>{const paid=wallet.earned?.[`${COURSE_VERSION}:${level}:${q}`],target=checkpointThreshold(level,q);return <button key={q} className="secondary big" disabled={path.practised<target||Boolean(paid)} onClick={()=>onCheck(q)}>Контрольная {q} · {paid?'пройдена ✓':path.practised>=target?'доступна · +$5':`ещё ${target-path.practised} карточек`}</button>;})}
    <button className="primary big" disabled={!finalLevelReady(items,progress,wallet,level)||finished} onClick={()=>onCheck()}>{finished?'Уровень завершён':level==='A2'?'Завершить A2 · +$100':'Итоговая проверка · 20 заданий'}</button>
    <p className="helper">Итог: не меньше 16 верных ответов из 20. {level==='A2'?'$100 за весь A2 начисляются один раз. ':''}Учебный маршрут не заменяет официальную оценку CEFR.</p>
  </section>;
}
