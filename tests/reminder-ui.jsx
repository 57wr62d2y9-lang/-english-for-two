// Local UI fixture only; Vite's production entry does not include this page.
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import ReminderSettings from '../src/ReminderSettings.jsx';
import '../src/styles.css';
let record={profile:'artur',name:'Тестовый кабинет',settings:{morning:'08:10',evening:'18:50',timezone:'Europe/Istanbul',enabled:true},weekend:{morning:'10:00',evening:'19:00'},pausedUntil:''};
let failNext=false;
const api={available:()=>true,load:async()=>structuredClone(record),save:async settings=>{
  if(failNext){failNext=false;throw new Error('Тест: нет соединения. Введённое время сохранено в форме.');}
  record={...record,settings:{...settings},weekend:null,saved:true};return structuredClone(record);
}};
function Preview(){const [revision,setRevision]=useState(0);return <main className="app"><p>Локальная проверка · реальные напоминания не отправляются</p><ReminderSettings key={revision} api={api}/><button onClick={()=>{failNext=true;}}>Ошибка следующего сохранения</button><button onClick={()=>setRevision(value=>value+1)}>Открыть форму заново</button></main>;}
createRoot(document.getElementById('root')).render(<Preview/>);
