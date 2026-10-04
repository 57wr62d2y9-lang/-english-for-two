// Local visual harness, deliberately without App/account/backup/sync effects.
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import Lesson,{CheckScreen} from '../src/VocabularyLesson.jsx';
import {vocabularyTask} from '../src/vocabulary-tasks.js';
import {makeSession,optionsFor} from '../src/lesson-engine.js';
import {isAnswerCorrect} from '../src/answer-check.js';
import {lessonViewportHeight} from '../src/lesson-layout.js';
import '../src/styles.css';
const resize=()=>document.documentElement.style.setProperty('--lesson-height',lessonViewportHeight(window)+'px');
resize();window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);
const item={id:'isolated-qa',level:'B1',phrase:'I have sent the report.',ru:'Я отправил отчет.',examples:['I have already sent the report.'],exampleRu:['Я уже отправил отчет.']};
const mode=new URLSearchParams(location.search).get('mode') || 'write';
const task=vocabularyTask(item,mode==='check'?'write':mode,[item],0,{optionsFor});
function Preview() {
  const [session,setSession]=useState({...makeSession('B1'),step:3,task});
  const [check,setCheck]=useState({id:'isolated-check',level:'B1',quarter:1,mode:'mastery',tasks:[task],index:0,score:0});
  const answer=value=>setSession(s=>({...s,selected:value,feedback:isAnswerCorrect(task,value)?'correct':'wrong'}));
  return mode==='check'?<CheckScreen value={check} onAnswer={value=>setCheck(c=>({...c,selected:value}))} onNext={()=>{}} onBack={()=>{}}/>:
    <Lesson session={session} ascent={{steps:40,total:80,percent:50}} onIntro={()=>{}} onKnown={()=>{}} onAnswer={answer} onNext={()=>{}} onFinish={()=>{}} onBack={()=>{}}/>;
}
createRoot(document.getElementById('root')).render(<Preview/>);
