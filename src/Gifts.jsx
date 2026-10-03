import React,{useState} from 'react';
import {balanceOf} from './learning.js';
const nameRu=name=>name==='Anna'?'Аня':name==='Artur'?'Артур':name||'Партнёр';

export default function Gifts({wallet,couple,profileName,onCreate,onRemove,onRequest,onResolve}) {
  const [title,setTitle]=useState(''),[cost,setCost]=useState(''),[tab,setTab]=useState('mine'),[deleting,setDeleting]=useState(null);
  const balance=balanceOf(wallet),mine=Object.entries(wallet.goals||{}).filter(([,g])=>g.active!==false).map(([id,g])=>({id,...g})),partner=(wallet.partner?.goals||[]).filter(g=>g.active!==false);
  const incoming=Object.entries(wallet.incoming||{}),spent=Object.entries(wallet.spent||{}).sort((a,b)=>b[1].at-a[1].at);
  function requests(onlyPending){return <>{incoming.filter(([,e])=>onlyPending?e.status==='pending':e.status!=='pending').map(([id,e])=><div key={id}><span><strong>{nameRu(e.from)} · {e.title}</strong><small>${e.cost} · {e.status==='pending'?'Ждёт решения':e.status==='approved'?'Согласовано':'Отклонено'}</small></span>{e.status==='pending'&&<div className="decisionButtons"><button disabled={couple.busy} onClick={()=>onResolve(id,'approved')}>Согласовать</button><button disabled={couple.busy} onClick={()=>onResolve(id,'rejected')}>Отклонить</button></div>}</div>)}
    {spent.filter(([,e])=>onlyPending?e.status==='pending':e.status!=='pending').map(([id,e])=><div key={id}><span><strong>{e.title} · ${e.cost}</strong><small>{e.status==='approved'?'Партнёр согласовал':e.status==='rejected'?'Отклонено · сумма возвращена':'Ждёт решения партнёра'}</small></span></div>)}</>;}
  return <><section className="walletCard"><span className="eyebrow">ТВОЯ КОПИЛКА</span><h1>${balance}</h1><p>Накопления на подарки за английский.</p></section>
    <div className="segmented two giftTabs"><button className={tab==='mine'?'active':''} onClick={()=>setTab('mine')}>Мои подарки</button><button className={tab==='partner'?'active':''} onClick={()=>setTab('partner')}>{profileName==='Anna'?'Артур':'Аня'}</button></div>
    <div className="giftList">{(tab==='mine'?mine:partner).map(goal=>{const funds=tab==='mine'?balance:wallet.partner?.balance||0;return <section className="giftCard" key={goal.id}>
      <div className="giftHeading"><div><strong>{goal.title}</strong><p>${Math.min(funds,goal.cost)} из ${goal.cost}</p></div>{tab==='mine'&&<button type="button" className="deleteGoal" aria-label={`Удалить подарок: ${goal.title}`} onClick={()=>setDeleting(goal.id)}>×</button>}</div>
      <div className="goalBar"><i style={{width:`${Math.min(100,funds/goal.cost*100)}%`}}/></div>
      {deleting===goal.id?<div className="deleteGoalConfirm"><p>Удалить эту цель?</p><button className="secondary" onClick={()=>{onRemove(goal.id);setDeleting(null);}}>Удалить</button><button className="quietButton" onClick={()=>setDeleting(null)}>Оставить</button></div>:tab==='mine'&&<button disabled={funds<goal.cost||couple.busy} onClick={()=>onRequest(goal)}>{funds<goal.cost?`Ещё $${goal.cost-funds}`:'Попросить подарок'}</button>}
    </section>;})}</div>
    {tab==='mine'&&<form className="goalForm" onSubmit={e=>{e.preventDefault();if(onCreate(title,cost)){setTitle('');setCost('');}}}><h2>Добавить подарок</h2><input aria-label="Название подарка" value={title} onChange={e=>setTitle(e.target.value)} maxLength={60} placeholder="Что ты хочешь?" required/><div><input aria-label="Стоимость подарка" value={cost} onChange={e=>setCost(e.target.value.replace(/\D/g,''))} inputMode="numeric" placeholder="Цена в $" required/><button className="primary">Добавить</button></div></form>}
    {tab==='partner'&&!partner.length&&<p className="emptyState">{couple.paired?'Партнёр пока не добавил подарки.':'Свяжите кабинеты в настройках.'}</p>}
    {(incoming.some(([,e])=>e.status==='pending')||spent.some(([,e])=>e.status==='pending'))&&<section className="history"><h2>Ожидают решения</h2>{requests(true)}</section>}
    {(incoming.some(([,e])=>e.status!=='pending')||spent.some(([,e])=>e.status!=='pending'))&&<details className="history giftArchive"><summary>История подарков</summary>{requests(false)}</details>}
    <p className="helper">Удаление цели сохраняет накопления. Доллары — ваша договорённость о подарках.</p>
  </>;
}
