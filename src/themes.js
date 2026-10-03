import {dayKey} from './learning.js';

export function themeFor(time=Date.now()) {
  const date=dayKey(time),month=Number(date.slice(5,7)),day=Number(date.slice(8,10)),md=month*100+day;
  const season=month===12||month<=2?'winter':month<=5?'spring':month<=8?'summer':'autumn';
  let holiday='',label='',decoration='';
  if(md>=1229||md<=104){holiday='new-year';label='С Новым годом!';decoration='🎄 ✨';}
  else if(md>=1222&&md<=1228){holiday='christmas';label='Неделя зимнего волшебства';decoration='❄ ✨';}
  else if(md>=1028&&md<=1103){holiday='halloween';label='Неделя Хэллоуина';decoration='🎃 🍂';}
  else if(md>=305&&md<=311){holiday='march-8';label='С 8 Марта!';decoration='🌷 🌸';}
  else if(md>=211&&md<=217){holiday='valentine';label='Неделя любви';decoration='♡ 🌸';}
  else if(md>=428&&md<=504){holiday='may';label='Майские дни';decoration='🌿 ☀';}
  return {date,season,holiday,label,decoration};
}
