// Isolated QA harness: mounts lesson UI only. No account, wallet, backup or
// notification component is mounted and no production learner data is touched.
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Lesson} from '../src/AppV5.jsx';
import {DAILY_GRAMMAR,guideFor} from '../src/lesson-notes.js';
import {DAILY_IELTS} from '../src/daily-ielts.js';
import '../src/styles.css';
function Preview() {
  const [which,setWhich]=useState('grammar'),[selected,setSelected]=useState(null),[hints,setHints]=useState(0);
  const grammar=DAILY_GRAMMAR.find(t=>t.id==='daily-B1-conditional-1');
  const tasks={grammar:{...grammar,type:'grammar',item:grammar,key:grammar.id,guide:guideFor(grammar)},reading:{...DAILY_IELTS.find(t=>t.level==='B1'&&t.skill==='Reading'),type:'ielts'},phrase:{type:'recognition',prompt:'That works for me.',item:{phrase:'That works for me.',ru:'Меня это устраивает.'},options:['Меня это устраивает.','Я работаю здесь.'],answer:'Меня это устраивает.'},order:{type:'order',prompt:'Я бы пошёл пешком.',tokens:[{id:0,text:'I'},{id:1,text:'would'},{id:2,text:'walk.'}],answer:'I would walk.'}};
  const task=tasks[which];
  const session={id:`preview-${which}`,level:'B1',step:1,plannedMs:900000,remainingMs:750000,task,selected,feedback:selected===null?null:selected===task.answer?'correct':'wrong'};
  return <><nav className="previewControls" style={{padding:12,display:'flex',gap:6,flexWrap:'wrap'}}>{Object.entries({grammar:'Грамматика',reading:'Текст',phrase:'Фраза',order:'Порядок'}).map(([key,label])=><button key={key} onClick={()=>{setWhich(key);setSelected(null);}}>{label}</button>)}<output style={{fontSize:12,width:'100%'}}>Тест: ответов {selected===null?0:1} · подсказок {hints}</output></nav><Lesson session={session} onAnswer={setSelected} onHint={()=>setHints(n=>n+1)} onBack={()=>{}} onFinish={()=>{}} onNext={()=>setSelected(null)}/></>;
}
createRoot(document.getElementById('root')).render(<React.StrictMode><Preview/></React.StrictMode>);
