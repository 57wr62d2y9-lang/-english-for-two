const endpoint='https://english-2027-duo.gabitov-art-t.chatgpt.site/api/reminders/settings';
const initData=()=>globalThis.window?.Telegram?.WebApp?.initData || '';

async function request(preferences) {
  const auth=initData();
  if(!auth)throw new Error('Открой приложение кнопкой «Учить английский» в Telegram, чтобы настроить свои напоминания.');
  let response;
  try {
    response=await fetch(endpoint,{
      method:preferences?'POST':'GET',credentials:'omit',cache:'no-store',
      headers:{'X-Telegram-Init-Data':auth,...(preferences?{'Content-Type':'application/json'}:{})},
      ...(preferences?{body:JSON.stringify(preferences)}:{}),signal:AbortSignal.timeout(15000),
    });
  } catch {throw new Error('Не удалось связаться с сервером напоминаний. Проверь интернет и попробуй ещё раз.');}
  let data;try{data=await response.json();}catch{throw new Error('Сервер напоминаний не ответил. Попробуй ещё раз чуть позже.');}
  if(!response.ok)throw new Error(data.error || 'Не удалось сохранить расписание. Попробуй ещё раз.');
  if(!data.settings || !['artur','anya'].includes(data.profile) || (preferences&&!data.saved))throw new Error('Сервер не подтвердил расписание. Попробуй ещё раз.');
  return data;
}
export const reminderSettings={available:()=>Boolean(initData()),load:()=>request(),save:preferences=>request(preferences)};
