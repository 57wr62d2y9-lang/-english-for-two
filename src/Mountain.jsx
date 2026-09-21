import React, { useEffect, useState } from 'react';

export function Gopher({celebrate=false}) {
  return <svg className={celebrate ? 'gopher gopherCelebrate' : 'gopher'} viewBox="0 0 100 120" role="img" aria-label="Суслик-путешественник">
    <ellipse cx="51" cy="112" rx="28" ry="6" fill="#52463d" opacity=".14"/>
    <rect x="63" y="56" width="24" height="40" rx="10" fill="#df9264" stroke="#9d623f" strokeWidth="2"/>
    <ellipse cx="50" cy="82" rx="26" ry="29" fill="#b47c4d"/>
    <ellipse cx="49" cy="85" rx="17" ry="23" fill="#f4d7b5"/>
    <ellipse cx="33" cy="107" rx="14" ry="7" fill="#885936"/>
    <ellipse cx="66" cy="107" rx="14" ry="7" fill="#885936"/>
    <circle cx="26" cy="27" r="13" fill="#b47c4d"/><circle cx="72" cy="27" r="13" fill="#b47c4d"/>
    <circle cx="26" cy="27" r="7" fill="#e7b7a2"/><circle cx="72" cy="27" r="7" fill="#e7b7a2"/>
    <ellipse cx="49" cy="44" rx="32" ry="29" fill="#c28b57"/>
    <path d="M26 43Q32 33 41 44M57 44Q67 33 74 44" fill="none" stroke="#865334" strokeWidth="3" strokeLinecap="round"/>
    <ellipse cx="35" cy="45" rx="4" ry="6" fill="#372c28"/><ellipse cx="64" cy="45" rx="4" ry="6" fill="#372c28"/>
    <circle cx="36" cy="43" r="1.5" fill="white"/><circle cx="65" cy="43" r="1.5" fill="white"/>
    <ellipse cx="49" cy="58" rx="20" ry="13" fill="#f6dfbf"/>
    <ellipse cx="49" cy="52" rx="6" ry="4" fill="#6e493a"/>
    <path d="M49 56V61M40 60Q49 69 58 60" fill="none" stroke="#6e493a" strokeWidth="2" strokeLinecap="round"/>
    <rect x="45" y="64" width="8" height="6" rx="2" fill="#fff9e9"/>
    <ellipse cx="25" cy="56" rx="5" ry="3" fill="#e99785" opacity=".7"/><ellipse cx="73" cy="56" rx="5" ry="3" fill="#e99785" opacity=".7"/>
    <path d="M27 69Q49 80 73 68L71 80Q50 86 29 80Z" fill="#b53e73"/><path d="M64 77L76 95L62 97L56 79" fill="#d6528a"/>
    <path d={celebrate ? 'M28 80Q7 77 12 56M73 79Q92 66 86 48' : 'M27 78Q14 90 26 94M74 79Q86 88 77 95'} fill="none" stroke="#b47c4d" strokeWidth="12" strokeLinecap="round"/>
  </svg>;
}

const route = [[64,267],[126,245],[223,228],[256,197],[172,175],[111,150],[170,125],[212,101],[181,75]];
function position(fraction) {
  const cursor=Math.max(0,Math.min(1,fraction))*(route.length-1), index=Math.min(route.length-2,Math.floor(cursor)), k=cursor-index;
  return [route[index][0]+(route[index+1][0]-route[index][0])*k,route[index][1]+(route[index+1][1]-route[index][1])*k];
}
export default function Mountain({level,ascent,celebrate=false,reward=0,climb=0}) {
  const [entered,setEntered]=useState(!celebrate);
  useEffect(()=>{if(!celebrate)return;const timer=setTimeout(()=>setEntered(true),120);return()=>clearTimeout(timer);},[celebrate]);
  const next={A2:'B1',B1:'B2',B2:'C1',C1:'C1+'}[level];
  const [x,y]=position(ascent.percent/100);
  const step=Math.round(ascent.steps*10)/10;
  return <section className={`mountainCard ${celebrate ? 'celebration' : ''} ${entered ? 'entered' : ''}`} aria-label={`Путь ${level} — ${next}: ${step} из ${ascent.total} учебных этапов`}>
    <div className="mountainHeading"><span>ТВОЁ ВОСХОЖДЕНИЕ</span><strong>{level}<i>→</i>{next}</strong></div>
    <svg className="landscape" viewBox="0 0 360 305" aria-hidden="true">
      <defs><linearGradient id="mountainSky" x2="0" y2="1"><stop stopColor="#edf0ff"/><stop offset="1" stopColor="#fdf6ef"/></linearGradient><linearGradient id="mountainFace" x2=".2" y2="1"><stop stopColor="#b9c9b6"/><stop offset="1" stopColor="#739584"/></linearGradient></defs>
      <rect width="360" height="305" rx="22" fill="url(#mountainSky)"/>
      <circle cx="293" cy="55" r="22" fill="#f3d295"/><g fill="white" opacity=".8"><ellipse cx="62" cy="70" rx="37" ry="9"/><ellipse cx="91" cy="37" rx="27" ry="7"/></g>
      <path d="M0 259L83 115L155 252L264 133L360 269V305H0Z" fill="#d0d9d5"/>
      <path d="M4 289L181 55L350 294Z" fill="url(#mountainFace)"/>
      <path d="M181 55L202 132L247 206L350 294H183Z" fill="#5c8176" opacity=".48"/>
      <path d="M148 98L181 55L214 102L193 92L179 108L166 92Z" fill="#fffdf5"/>
      <path d="M0 286Q81 261 160 288Q257 268 360 281V305H0Z" fill="#bfd0b5"/>
      <polyline points={route.map(p=>p.join(',')).join(' ')} fill="none" stroke="#f9e8c9" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points={route.map(p=>p.join(',')).join(' ')} fill="none" stroke="#d2bfa3" strokeWidth="1.5" strokeDasharray="3 7"/>
      {[.25,.5,.75].map((f,i)=>{const [cx,cy]=position(f);return <g key={f}><circle cx={cx} cy={cy} r="11" fill={ascent.percent>=f*100 ? '#b63a72' : '#fffdf7'}/><text x={cx} y={cy+3.5} textAnchor="middle" fill={ascent.percent>=f*100?'white':'#827a78'} fontSize="9" fontWeight="700">{(i+1)*20}</text></g>;})}
      <path d="M181 61V30L208 39L181 47" fill="#bd4278" stroke="#9d3461" strokeWidth="2"/>
      <text x="57" y="294" fontSize="11" fill="#4c655b" fontWeight="700">СТАРТ</text>
      <g style={{transform:`translate(${x-25}px, ${y-52}px)`}}><foreignObject width="50" height="60"><Gopher/></foreignObject></g>
    </svg>
    {celebrate && <div className="ascentMoment" aria-label={`Подъём на ${Math.round(climb*10)/10} этапа, награда ${reward} долларов`}><div className="climbGopher"><Gopher celebrate/></div><div className="earnedCoin">{reward ? `+$${reward}` : '✓'}</div><strong>{climb ? 'Ещё один шаг к вершине' : 'Практика сохранена'}</strong></div>}
    <div className="mountainFoot"><div><strong>{step}<small> / {ascent.total}</small></strong><span>учебных этапов</span></div><p>{celebrate && climb ? `+${Math.round(climb*10)/10} за этот урок` : 'Пройденные уроки остаются с тобой'}</p></div>
  </section>;
}
