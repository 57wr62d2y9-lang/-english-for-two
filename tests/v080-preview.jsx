// Isolated fixtures only. No account, production sync, backup or wallet writes.
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {AdventureHub,DailyDraw,WheelCollection,SpeedRound,SpeedResult} from '../src/Adventure.jsx';
import {createSpeedRound,finishSpeedRound} from '../src/arcade.js';
import {weeklyCheckpoint,makeCheckpoint} from '../src/checkpoint.js';
import {lexiconForLevel} from '../src/lexicon.js';
import {CheckScreen} from '../src/VocabularyLesson.jsx';
import {lessonViewportHeight} from '../src/lesson-layout.js';
import {claimDailyWheel,dateCollectionSummary} from '../src/daily-wheel.js';
import {dayKey} from '../src/learning.js';
import '../src/styles.css';
const resize=()=>document.documentElement.style.setProperty('--lesson-height',lessonViewportHeight(window)+'px');
resize();window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);
const mode=new URLSearchParams(location.search).get('mode')||'home',now=Date.now();
const pool=lexiconForLevel('B1'),progress=Object.fromEntries(pool.slice(0,30).map(i=>[i.id,{s:'LEARNING',c:2,rcl:1}]));
const stats={lessons:{},byDay:{[dayKey(now)]:{visitedAt:now,at:now}}},wallet={earned:{},partner:{name:'Anna',level:'A2',at:now}};
const collection=new URLSearchParams(location.search).get('collection');
for(const [i,id]of (collection==='full'?['star','lightning','crystal','clover','crown']:collection==='legacy'?['crystal']:[]).entries()){
  const at=now-i*86400000,day=dayKey(at);
  wallet.earned['daily-wheel:'+day]={kind:'daily-wheel',version:1,prizeId:id,amount:0,day,at};
}
if(collection==='full')wallet.partner.dateCollection=dateCollectionSummary(wallet);
const weekly=weeklyCheckpoint(pool,progress,wallet,stats,'B1',now);
function Preview(){
  const [prizeWallet,setPrizeWallet]=useState(wallet);
  const [screen,setScreen]=useState(mode),[draw,setDraw]=useState(mode==='draw'),[speed,setSpeed]=useState(()=>createSpeedRound('arena','B1',{},now));
  const [check,setCheck]=useState(()=>makeCheckpoint(pool,progress,'B1',weekly,now));
  const start=mode=>{setSpeed(createSpeedRound(mode,'B1',progress,Date.now()));setScreen('speed');};
  if(screen==='speed')return <SpeedRound key={speed.id} initial={speed} onBack={()=>setScreen('home')} onFinish={(round,options)=>{setSpeed(finishSpeedRound(round,stats,Date.now(),options).round);setScreen('result');}}/>;
  if(screen==='result')return <SpeedResult round={speed} onAgain={()=>start(speed.mode)} onHome={()=>setScreen('home')}/>;
  if(screen==='check')return <CheckScreen value={check} onAnswer={value=>setCheck(c=>({...c,selected:value}))} onNext={()=>setCheck(c=>({...c,index:Math.min(c.index+1,c.tasks.length-1),selected:undefined}))} onBack={()=>setScreen('home')}/>;
  return <div className="app v5App"><AdventureHub name="Artur" stats={stats} wallet={prizeWallet} paired weekly={weekly} onAdventure={()=>{}} onSpeed={start} onCheck={()=>setScreen('check')}/><WheelCollection wallet={prizeWallet} name="Artur" paired onDraw={()=>setDraw(true)}/>{draw&&<DailyDraw name="Artur" stats={stats} wallet={prizeWallet} onSpin={()=>{const result=claimDailyWheel(prizeWallet,'Artur');setPrizeWallet(result.wallet);return result.reward;}} onClose={()=>setDraw(false)}/>}</div>;
}
createRoot(document.getElementById('root')).render(<Preview/>);
