// Isolated fixtures only. No account, production sync, backup or wallet writes.
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {AdventureHub,DailyDraw,SpeedRound,SpeedResult} from '../src/Adventure.jsx';
import {createSpeedRound,finishSpeedRound} from '../src/arcade.js';
import {weeklyCheckpoint,makeCheckpoint} from '../src/checkpoint.js';
import {lexiconForLevel} from '../src/lexicon.js';
import {CheckScreen} from '../src/VocabularyLesson.jsx';
import {lessonViewportHeight} from '../src/lesson-layout.js';
import '../src/styles.css';
const resize=()=>document.documentElement.style.setProperty('--lesson-height',lessonViewportHeight(window)+'px');
resize();window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);
const mode=new URLSearchParams(location.search).get('mode')||'home',now=Date.now();
const pool=lexiconForLevel('B1'),progress=Object.fromEntries(pool.slice(0,30).map(i=>[i.id,{s:'LEARNING',c:2,rcl:1}]));
const stats={lessons:{},byDay:{}},wallet={earned:{},partner:{name:'Anna',level:'A2',at:now}};
const weekly=weeklyCheckpoint(pool,progress,wallet,stats,'B1',now);
function Preview(){
  const [screen,setScreen]=useState(mode),[draw,setDraw]=useState(mode==='draw'),[speed,setSpeed]=useState(()=>createSpeedRound('arena','B1',{},now));
  const [check,setCheck]=useState(()=>makeCheckpoint(pool,progress,'B1',weekly,now));
  const start=mode=>{setSpeed(createSpeedRound(mode,'B1',progress,Date.now()));setScreen('speed');};
  if(screen==='speed')return <SpeedRound key={speed.id} initial={speed} onBack={()=>setScreen('home')} onFinish={(round,options)=>{setSpeed(finishSpeedRound(round,stats,Date.now(),options).round);setScreen('result');}}/>;
  if(screen==='result')return <SpeedResult round={speed} onAgain={()=>start(speed.mode)} onHome={()=>setScreen('home')}/>;
  if(screen==='check')return <CheckScreen value={check} onAnswer={value=>setCheck(c=>({...c,selected:value}))} onNext={()=>setCheck(c=>({...c,index:Math.min(c.index+1,c.tasks.length-1),selected:undefined}))} onBack={()=>setScreen('home')}/>;
  return <div className="app v5App"><AdventureHub name="Artur" stats={stats} wallet={wallet} paired weekly={weekly} onDraw={()=>setDraw(true)} onAdventure={()=>{}} onSpeed={start} onCheck={()=>setScreen('check')}/>{draw&&<DailyDraw name="Artur" stats={stats} wallet={wallet} onStart={()=>setDraw(false)} onClose={()=>setDraw(false)}/>}</div>;
}
createRoot(document.getElementById('root')).render(<Preview/>);
