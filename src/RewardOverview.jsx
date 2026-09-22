import React from 'react';
import { COURSE_VERSION, checkpointQuarters, finalLevelReady, levelCompletionId } from './learning.js';
import { attendanceProgress } from './rewards.js';

export function RewardRules() {
  return <details className="rewardRules"><summary>Награды за занятия и прогресс</summary>
    <p><b>$1 утром + $1 вечером</b> — за два завершённых урока. Ошибки, переводы, подсказки и скорость ответов не влияют на сумму.</p>
    <p>Урок считается завершённым после 12 минут практики и 5 проверяемых ответов. Для короткого урока — 4 минуты и 3 ответа. Правильность этих ответов не ограничивает награду.</p>
    <p><b>$5</b> — за каждую пройденную контрольную: не меньше 8 верных ответов из 10.</p>
    <p><b>$100</b> — за завершение всей программы A2: закрепление слов и фраз, все контрольные и итоговая проверка (не меньше 16 из 20).</p>
    <p><b>$10</b> — за каждые 30 дней подряд с завершёнными утренним и вечерним уроками. Пропуск любого из двух занятий прерывает серию. Оплаченные 30 дней не используются для следующего бонуса.</p>
    <p>Повторный урок в ту же часть дня и пересдача одной контрольной не дают повторной выплаты. Все деньги, заработанные по прежним правилам, остаются в копилке.</p>
    <p>Часть дня определяется при старте урока: утро — с 04:00 до 14:00, вечер — в остальное время, по времени Стамбула (UTC+3). Если продолжить урок на другой день, он засчитается в день завершения.</p>
  </details>;
}

export function AttendanceCard({stats,wallet,time}) {
  const streak=attendanceProgress(stats,wallet,time);
  return <section className="attendanceCard" aria-label="Бонус за регулярность">
    <div className="attendanceHeading"><div><span className="eyebrow">БОНУС ЗА РЕГУЛЯРНОСТЬ</span><h2>30 дней без пропусков</h2></div><strong>+$10</strong></div>
    <div className="attendanceCount"><span>{streak.rewardedToday?'Следующая серия':'Собрано дней'}</span><b>{streak.days} / {streak.total}</b></div>
    <progress max={streak.total} value={streak.days} aria-label="Дней до бонуса за регулярность"/>
    <div className="attendanceToday">{[['morning','☀ Утро'],['evening','☾ Вечер']].map(([slot,label])=><span key={slot} className={streak.today[slot]?'done':''}>{label}: {streak.today[slot]?'готово ✓':'ещё не завершено'}</span>)}</div>
    {streak.rewardedToday&&<p className="bonusNotice">Бонус за предыдущие 30 дней уже в копилке. Начинаем следующую серию!</p>}
    <p className="helper">День засчитывается после обоих уроков, в том числе коротких. Ошибки не мешают. При пропуске отсчёт начинается заново; уже заработанные деньги сохраняются.</p>
  </section>;
}

export function CheckRewardsSection({level,path,items,progress,wallet,onCheck}) {
  const finished=Boolean(wallet.earned?.[levelCompletionId(level)]);
  return <section className="explainCard"><h2>Проверка знаний {level}</h2>
    <p>Закреплено {path.verified} из {path.total} слов и выражений. Доступно на уровне: {path.available}. Повторы в разные дни проверяют, что материал остался в памяти.</p>
    <p>Каждая контрольная — 10 заданий. Для награды $5 нужно ответить верно хотя бы на 8. После закрепления всей программы и всех контрольных откроется итоговая проверка.</p>
    {checkpointQuarters(level).map(q=>{const paid=wallet.earned?.[`${COURSE_VERSION}:${level}:${q}`];return <button key={q} className="secondary big" disabled={path.verified<q*100||Boolean(paid)} onClick={()=>onCheck(q)}>{q*100} слов и фраз · {paid?`пройдено · $${paid.amount} получено`:'контрольная · +$5'}</button>;})}
    <button className="primary big" disabled={!finalLevelReady(items,progress,wallet,level)||finished} onClick={()=>onCheck()}>{finished?'Уровень завершён':level==='A2'?'Завершить A2 · +$100':'Итоговая проверка · 20 заданий'}</button>
    <p className="helper">Итог: не меньше 16 верных ответов из 20. {level==='A2'?'$100 за весь A2 начисляются один раз. ':''}Учебный маршрут не заменяет официальную оценку CEFR.</p>
  </section>;
}
