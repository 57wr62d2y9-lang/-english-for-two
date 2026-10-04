import React, { useEffect, useState } from 'react';

export function Gopher({celebrate=false}) {
  return <img className={celebrate?'gopher gopherCelebrate':'gopher'} src="/suslik-mascot-v2.webp" alt="Суслик с розовым бантом" width="384" height="780"/>;
}

const route = [[64,267],[126,245],[223,228],[256,197],[172,175],[111,150],[170,125],[212,101],[181,75]];
function position(fraction) {
  const cursor=Math.max(0,Math.min(1,fraction))*(route.length-1), index=Math.min(route.length-2,Math.floor(cursor)), k=cursor-index;
  return [route[index][0]+(route[index+1][0]-route[index][0])*k,route[index][1]+(route[index+1][1]-route[index][1])*k];
}
export default function Mountain({level,ascent,course,compact=false,celebrate=false,reward=0,climb=0}) {
  const [entered,setEntered]=useState(!celebrate);
  useEffect(()=>{if(!celebrate)return;const timer=setTimeout(()=>setEntered(true),120);return()=>clearTimeout(timer);},[celebrate]);
  const next={A2:'B1',B1:'B2',B2:'C1',C1:'C1+'}[level];
  const percent=course?course.percent:ascent.percent,total=course?course.total:ascent.total;
  const [x,y]=position(percent/100);
  const step=course?course.verified:Math.round(ascent.steps*10)/10;
  return <section className={`mountainCard ${compact?'mountainCompact':''} ${celebrate ? 'celebration' : ''} ${entered ? 'entered' : ''}`} aria-label={course?`Закрепление словаря ${level}: ${step} из ${total} карточек`:`Путь ${level} — ${next}: ${step} из ${total} учебных этапов`}>
    <div className="mountainHeading"><span>{course?'ЗАКРЕПЛЕНИЕ СЛОВ':'ТВОЁ ВОСХОЖДЕНИЕ'}</span><strong>{course?`Словарь ${level}`:<>{level}<i>→</i>{next}</>}</strong></div>
    <svg className="landscape" viewBox="0 0 360 305" aria-hidden="true">
      <defs><linearGradient id="mountainSky" x2="0" y2="1"><stop stopColor="var(--sky-start, #edf0ff)"/><stop offset="1" stopColor="var(--page-bg, #fdf6ef)"/></linearGradient><linearGradient id="mountainFace" x2=".2" y2="1"><stop stopColor="var(--mountain-start, #b9c9b6)"/><stop offset="1" stopColor="var(--mountain-end, #739584)"/></linearGradient></defs>
      <rect width="360" height="305" rx="22" fill="url(#mountainSky)"/>
      <circle cx="293" cy="55" r="22" fill="#f3d295"/><g fill="white" opacity=".8"><ellipse cx="62" cy="70" rx="37" ry="9"/><ellipse cx="91" cy="37" rx="27" ry="7"/></g>
      <path d="M0 259L83 115L155 252L264 133L360 269V305H0Z" fill="#d0d9d5"/>
      <path d="M4 289L181 55L350 294Z" fill="url(#mountainFace)"/>
      <path d="M181 55L202 132L247 206L350 294H183Z" fill="#5c8176" opacity=".48"/>
      <path d="M148 98L181 55L214 102L193 92L179 108L166 92Z" fill="#fffdf5"/>
      <path d="M0 286Q81 261 160 288Q257 268 360 281V305H0Z" fill="#bfd0b5"/>
      <polyline points={route.map(p=>p.join(',')).join(' ')} fill="none" stroke="#f9e8c9" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points={route.map(p=>p.join(',')).join(' ')} fill="none" stroke="#d2bfa3" strokeWidth="1.5" strokeDasharray="3 7"/>
      {[.25,.5,.75].map((f,i)=>{const [cx,cy]=position(f);return <g key={f}><circle cx={cx} cy={cy} r="11" fill={percent>=f*100 ? '#b63a72' : '#fffdf7'}/><text x={cx} y={cy+3.5} textAnchor="middle" fill={percent>=f*100?'white':'#827a78'} fontSize="9" fontWeight="700">{(i+1)*25}%</text></g>;})}
      <path d="M181 61V30L208 39L181 47" fill="#bd4278" stroke="#9d3461" strokeWidth="2"/>
      <text x="57" y="294" fontSize="11" fill="#4c655b" fontWeight="700">СТАРТ</text>
      <g style={{transform:`translate(${x-25}px, ${y-88}px)`}}><foreignObject width="50" height="90"><Gopher/></foreignObject></g>
    </svg>
    {celebrate && <div className="ascentMoment" aria-label={`Практика сохранена, награда ${reward} долларов`}><div className="climbGopher"><Gopher celebrate/></div><div className="earnedCoin">{reward ? `+$${reward}` : '✓'}</div><strong>Практика сохранена</strong></div>}
    <div className="mountainFoot"><div><strong>{step}<small> / {total}</small></strong><span>{course?'подтверждено контрольной':'учебных этапов'}</span></div><p>{course?`В работе: ${course.introduced}. Повторения сохранены.${course.ready?` К проверке: ${course.ready}.`:''}`:celebrate && climb ? `+${Math.round(climb*10)/10} за этот урок` : 'Пройденные уроки остаются с тобой'}</p></div>
  </section>;
}
