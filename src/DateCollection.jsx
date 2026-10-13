import React from 'react';
import {wheelCollection} from './daily-wheel.js';
import {cleanDateCollection} from '../supabase/functions/english-for-two-sync/date-collection.js';

export const datePartnerName=(wallet,name)=>{
  const partner=wallet?.partner?.name||(name==='Anna'?'Artur':name==='Artur'?'Anna':'');
  return partner==='Anna'?'Аня':partner==='Artur'?'Артур':partner||'партнёр';
};

// Inline illustrations stay sharp in the small wheel and on high-DPI phones.
// No emoji/font dependency or externally loaded image is required.
export function PrizeIcon({prize}) {
  if(!prize)return <span aria-hidden="true">✦</span>;
  if(prize.amount)return <span className="prizeCash">${prize.amount}</span>;
  return <svg className={`prizeIcon prizeIcon-${prize.id}`} viewBox="0 0 64 64" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {prize.id==='bouquet'?<>
      <path d="M18 21 31 53 43 16M31 52 31 15" stroke="#427b66" strokeWidth="2.6"/>
      <path d="M30 41C16 39 14 29 14 29c12 0 16 12 16 12Zm2-5c4-13 15-14 15-14-1 11-10 15-15 14Z" fill="#80a889"/>
      <path d="m11 26 22 10 20-12-14 35H27Z" fill="#edc8d9" stroke="#be819e"/>
      <path d="m11 26 17 33 5-23m20-12L37 48l-4-12" stroke="#fff4f6"/>
      <path d="M19 8c-10-8-15 8-6 14l8 5 6-10c5-10-4-15-8-9Z" fill="#e870a2" stroke="#b94b7a"/>
      <path d="m19 13-3 10" stroke="#ffe7a5" strokeWidth="3"/>
      <path d="M43 6c-9-7-14 6-7 12l7 6 7-9c6-9-3-16-7-9Z" fill="#b6a0e5" stroke="#8662b1"/>
      <path d="m43 11-2 9" stroke="#fff2ca" strokeWidth="3"/>
      <path d="m27 48 12 0m-6 0c-13-12-20 4-1 3m1-3c15-12 20 5 2 3m-2-1-6 11m7-11 8 8" stroke="#9d3c71" strokeWidth="2.6"/>
    </>:prize.id==='coffee'?<>
      <g transform="rotate(-10 20 37)"><path d="m11 21 3 34h17l3-34" fill="#d5a982" stroke="#966a53"/><path d="m13 34 2 18h15l2-18" fill="#aa7655"/><path d="m11 21 1 12h21l1-12" fill="#f9ecdf"/><path d="M10 21h25v5H10Z" fill="#c4b3e4" stroke="#9180b5"/><path d="m23 22 1-16" stroke="#8f78b4" strokeWidth="3"/><path d="M17 39h13v8H17Z" fill="#e7dff4"/><path d="M19 43c-2-3 2-4 3-2 2-4 7-2 5 1 4 3-2 5-4 3-4 2-7 0-4-2Z" fill="white"/></g>
      <g transform="rotate(10 43 39)"><path d="m33 26 3 32h17l3-32" fill="#cfab8a" stroke="#966a53"/><path d="m35 38 2 17h15l2-17" fill="#b7805b"/><path d="m33 26 1 10h21l1-10" fill="#fbefe3"/><path d="M32 25h25v5H32Z" fill="#acd9df" stroke="#6aa5af"/><path d="m43 25 1-18" stroke="#6aa5af" strokeWidth="3"/><path d="M38 42h13v8H38Z" fill="#d8eef1"/><path d="M40 46c-2-3 2-4 3-2 2-4 7-2 5 1 4 3-2 5-4 3-4 2-7 0-4-2Z" fill="white"/></g>
    </>:prize.id==='ticket'?<>
      <g transform="rotate(-14 32 32)"><path d="M7 13h50v13a6 6 0 0 0 0 12v13H7V38a6 6 0 0 0 0-12Z" fill="#fff7e8" stroke="#b99057" strokeWidth="2"/><path d="M43 14v36" stroke="#c6ac84" strokeDasharray="3 4"/><path d="m13 32 10 2 5 12 3-1-2-12 8-6c3-3 1-6-3-4l-8 5-10-6-3 2 7 8-7-3Z" fill="#7eacc1" stroke="#517f96"/><path d="M46 19h8m-8 4h8m-8 18h8m-8 4h8" stroke="#bf9d68"/><path d="M14 17h17" stroke="#b89a73"/></g>
    </>:prize.id==='bag'?<>
      <path d="m18 12 22-5 7 19-24 7Z" fill="#9ac49a" stroke="#527759"/><path d="m29 9 23 4-4 22-22-4Z" fill="#bad7a3" stroke="#648456"/><path d="m35 14 12 2-2 13-12-2Z" stroke="#769566"/><path d="M21 28V18c0-13 24-13 24 0v10" stroke="#9d572c" strokeWidth="4"/><path d="m12 25 40 0 4 33H8Z" fill="#e9954b" stroke="#aa602e" strokeWidth="2"/><path d="m12 25 9 13h23l8-13M10 44h44M21 27v18m22-18v18" stroke="#be7439"/><path d="M17 37h31v5H17Z" fill="#d4803d"/><rect x="29" y="35" width="7" height="9" rx="1" fill="#fbe2a2" stroke="#a37a35"/><circle cx="49" cy="52" r="8" fill="#f9d878" stroke="#ba8b37"/><path d="M49 47v10m3-8c-5-3-9 4-2 4 4 0 1 5-3 2" stroke="#a57727"/></>
      :prize.id==='keys'?<>
        <circle cx="28" cy="14" r="10" stroke="#bba176" strokeWidth="3"/><circle cx="28" cy="14" r="6" stroke="#f8e4ac" strokeWidth="2"/>
        <g transform="rotate(24 37 37)"><path d="M42 22v27l-4 5 4 4 6-6V22Z" fill="#e2c784" stroke="#96845b"/><path d="M39 21h12v10H39Z" fill="#efe0b5" stroke="#9e8856"/><path d="M41 26h7" stroke="#9e8856"/></g>
        <g transform="rotate(-16 24 36)"><rect x="12" y="20" width="23" height="37" rx="9" fill="#353646" stroke="#bca176" strokeWidth="2"/><path d="m17 35 3-5h8l3 5-1 7H18Z" fill="#727686"/><path d="m20 31-2 5h11l-2-5" stroke="#e2d3b0"/><path d="M19 39h2m5 0h2" stroke="#f5da99" strokeWidth="2"/><path d="M21 49h6" stroke="#c7ad75"/></g>
      </>:null}
  </svg>;
}

export function DateCollection({wallet,name,paired=false}) {
  const collection=wheelCollection(wallet),partner=datePartnerName(wallet,name);
  const other=paired?cleanDateCollection(wallet.partner?.dateCollection):null;
  return <section className="dateCollection" aria-label="Коллекция для свидания">
    <div className="dateCollectionHeading"><div><span className="eyebrow">DATE NIGHT · КОЛЛЕКЦИЯ</span><h3>Собери ваше свидание</h3></div><span className="dateProgress">{collection.completed?'5':collection.nextProgress}<small>/ 5</small></span></div>
    {collection.completed>0?<div className="dateUnlocked" role="status"><b>Свидание открыто!</b><span>Организует: {partner}.</span><small>Выиграно свиданий: {collection.completed}. Выберите удобный день вдвоём.</small></div>:<p className="datePromise">Все 5 разных вещей — и {partner} организует для тебя свидание.</p>}
    <div className="dateItems" role="list">{collection.items.map(p=><div role="listitem" key={p.id} className={p.count?'owned':''} aria-label={`${p.label}: ${p.count}`}><PrizeIcon prize={p}/><b>{p.shortLabel}</b><small>{p.count?`×${p.count}`:'не выпало'}</small></div>)}</div>
    {collection.completed>0&&<p className="dateNextSet">Следующий набор: <b>{collection.nextProgress} / 5</b>. Повторы уже учтены.</p>}
    {other?.completed>0&&<div className="partnerDatePrize"><b>{partner}: выиграно свиданий — {other.completed}</b><span>Эти свидания организуешь ты.</span></div>}
    <details className="dateRules"><summary>Что собираем и как это работает</summary><ul>{collection.items.map(p=><li key={p.id}><b>{p.label}</b> — {p.description.toLowerCase()}.</li>)}</ul><p>За каждый полный набор из пяти разных вещей — одно свидание. Кто собрал набор, тот гость; второй участник пары придумывает и организует встречу. Повторы сохраняются для следующих наборов.</p><p>Это символы коллекции, а не обещание купить сумку, машину или поездку. Формат и бюджет свидания вы выбираете сами. Денежные призы $1–$3 отдельно идут в копилку.</p>{!paired&&<p>Свяжите кабинеты в настройках, чтобы партнёр видел выигрыш.</p>}<p>Прежние значки уже учтены как новые вещи. Колесо не выбирает задания — они чередуются в уроках автоматически.</p></details>
  </section>;
}
