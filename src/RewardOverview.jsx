import React from 'react';
import { COURSE_VERSION, checkpointQuarters, checkpointThreshold, finalLevelReady, levelCompletionId } from './learning.js';
import { attendanceProgress } from './rewards.js';
import {pendingCheckpoint} from './checkpoint.js';

export function RewardRules() {
  return <details className="rewardRules"><summary>Награды за занятия и прогресс</summary>
    <p><b>$1 утром + $1 вечером</b> — за два завершённых урока. Ошибки, переводы, подсказки и скорость ответов не влияют на сумму.</p>
    <p>Заверши подборку и ответь минимум на 5 карточек (на 3 в коротком уроке) — получишь $1, даже с ошибками. Если выходишь раньше конца подборки, нужно 12 минут практики или 4 в коротком уроке. Незавершённые попытки в той же части дня складываются.</p>
    <p><b>$5</b> — за новую пройденную подборку из 5–10 подготовленных слов и фраз: не меньше 80% верных ответов. Последняя подборка словаря может быть короче.</p>
    <p>Контрольная появляется после самостоятельных письменных повторов в разные дни и заменяет следующий урок. При успехе новая подборка дает $5 вместо $1. Пересдача уже оплаченных слов не дает еще $5; за завершенную попытку действует обычная награда за утро или вечер.</p>
    <p><b>$100</b> — за закрепление всех слов и фраз программы A2 и итоговую проверку (не меньше 16 из 20). Одно знакомство с карточкой не приближает к завершению.</p>
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

export function CheckRewardsSection({level,path,items,progress,wallet,stats,onCheck}) {
  const finished=Boolean(wallet.earned?.[levelCompletionId(level)]);
  const pending=pendingCheckpoint(items,progress,wallet,stats || {},level);
  return <section className="explainCard"><h2>Проверка знаний {level}</h2>
    <p>Закреплено {path.verified} из {path.total}. Подготовлено повторениями к проверке: {path.ready}. Это словарь приложения, а не процент владения языковым уровнем.</p>
    <p>Проверяем небольшими подборками после 3 самостоятельных письменных повторов в разные дни, не меньше недели от первого до последнего. Ответы и переводы во время контрольной скрыты. За одну новую подборку — $5 при результате от 80%.</p>
    <button className="secondary big" disabled={!pending?.quarter} onClick={()=>onCheck(pending)}>{pending?.quarter?`${pending.retest?'Повторная проверка':'Контрольная'} · ${pending.count} карточек${pending.amount?' · +$5':''}`:'Следующая контрольная появится после повторений'}</button>
    <button className="primary big" disabled={!finalLevelReady(items,progress,wallet,level)||finished} onClick={()=>onCheck()}>{finished?'Итоговая награда уже получена':level==='A2'?'Завершить A2 · +$100':'Итоговая проверка · 20 заданий'}</button>
    <p className="helper">Итог: не меньше 16 верных ответов из 20. {level==='A2'?'$100 за весь A2 начисляются один раз. ':''}Уже заработанные деньги и история старых контрольных сохранены.</p>
  </section>;
}
