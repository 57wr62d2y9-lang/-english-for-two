import React,{useEffect,useState} from 'react';
import {reminderSettings} from './reminder-settings.js';

const zones=[['Europe/Istanbul','Стамбул · Турция'],['Europe/Moscow','Москва'],['Europe/Minsk','Минск'],['Asia/Yekaterinburg','Екатеринбург'],['Asia/Almaty','Алматы'],['Asia/Dubai','Дубай'],['Europe/Berlin','Берлин'],['Europe/London','Лондон']];

export default function ReminderSettings({api=reminderSettings}) {
  const [record,setRecord]=useState(null),[draft,setDraft]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const available=api.available();
  async function load() {
    setBusy(true);setError('');
    try{const data=await api.load();setRecord(data);setDraft(data.settings);}catch(e){setError(e.message);}finally{setBusy(false);}
  }
  useEffect(()=>{
    if(!available)return;
    let active=true;setBusy(true);
    api.load().then(data=>{if(active){setRecord(data);setDraft(data.settings);}}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setBusy(false);});
    return()=>{active=false;};
  },[api,available]);
  const changed=draft&&JSON.stringify(draft)!==JSON.stringify(record?.settings);
  function update(patch){setDraft(value=>({...value,...patch}));setMessage('');setError('');}
  async function save(event) {
    event.preventDefault();
    if(!draft.morning||!draft.evening||draft.morning>=draft.evening){setError('Утреннее напоминание должно быть раньше вечернего.');return;}
    setBusy(true);setError('');setMessage('Сохраняю расписание…');
    try {
      const data=await api.save(draft);setRecord(data);setDraft(data.settings);
      setMessage(data.settings.enabled?`Сохранено. Каждый день в ${data.settings.morning} и ${data.settings.evening} по выбранному часовому поясу.`:'Сохранено. Напоминания выключены.');
    } catch(e){setMessage('');setError(e.message);}finally{setBusy(false);}
  }
  const zoneChoices=[...zones];
  for(const value of [draft?.timezone,Intl.DateTimeFormat().resolvedOptions().timeZone])if(value&&!zoneChoices.some(([zone])=>zone===value))zoneChoices.push([value,value]);
  return <section className="settingsCard reminderSettings">
    <h2>Напоминания в Telegram</h2>
    <p>Выбери удобное время для утреннего и вечернего занятия — каждый день, включая выходные.</p>
    {!available?<><p>Открой приложение через Telegram. Там сохраняется твоё личное расписание.</p><a className="secondary big" href="https://t.me/EnglishArturBot" target="_blank" rel="noreferrer">Открыть бота →</a></>:<>
      {draft?<form onSubmit={save}>
        <p className="reminderOwner">Расписание: <strong>{record.name}</strong></p>
        <label className="reminderToggle"><input type="checkbox" checked={draft.enabled} onChange={event=>update({enabled:event.target.checked})} disabled={busy}/><span>Получать напоминания</span></label>
        <div className="reminderTimes">
          <label htmlFor="reminder-morning">☀ Утро<input id="reminder-morning" type="time" required value={draft.morning} onChange={event=>update({morning:event.target.value})} disabled={busy}/></label>
          <label htmlFor="reminder-evening">☾ Вечер<input id="reminder-evening" type="time" required value={draft.evening} onChange={event=>update({evening:event.target.value})} disabled={busy}/></label>
        </div>
        <label htmlFor="reminder-timezone">Часовой пояс</label>
        <select id="reminder-timezone" value={draft.timezone} onChange={event=>update({timezone:event.target.value})} disabled={busy}>{zoneChoices.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
        {record.weekend&&<p className="helper">Сейчас по выходным: {record.weekend.morning} и {record.weekend.evening}. После сохранения выбранное выше время будет действовать каждый день.</p>}
        {record.pausedUntil&&<p className="helper">Пауза до {record.pausedUntil}. Чтобы возобновить напоминания, включи их и сохрани расписание.</p>}
        <button className="primary big" type="submit" disabled={busy}>{busy?'Сохраняю…':'Сохранить время напоминаний'}</button>
        {!busy&&!message&&changed&&<p className="helper">Есть несохранённые изменения.</p>}
        <p className="helper">Время относится к твоему аккаунту Telegram. Напоминание может прийти на пару минут позже.</p>
      </form>:busy?<p role="status">Загружаю твоё расписание…</p>:<button className="secondary big" onClick={load}>Загрузить расписание ещё раз</button>}
      {error&&<p className="errorText" role="alert">{error}</p>}
      {message&&<p className="reminderSaved" role="status" aria-live="polite">{message}</p>}
    </>}
  </section>;
}
