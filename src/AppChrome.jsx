import React from 'react';

function Icon({name}) {
 const paths={
  home:<><path d="m3 10 9-7 9 7"/><path d="M5 9v12h14V9M9 21v-8h6v8"/></>,
  progress:<><path d="M5 5h14v16H5zM9 3v4M15 3v4M9 11h6M9 15h6"/></>,
  rewards:<><path d="M3 8h18v4H3zM5 12v9h14v-9M12 8v13"/><path d="M12 8H8a3 3 0 1 1 3-3zM12 8h4a3 3 0 1 0-3-3z"/></>,
  settings:<><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2" fill="currentColor"/><circle cx="15" cy="12" r="2" fill="currentColor"/><circle cx="9" cy="18" r="2" fill="currentColor"/></>,
  bell:<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>
 };
 return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function AppHeader({name,level,screen='home',unread=0,onNews}) {
 const titles={progress:'Мой словарь',rewards:'Подарки',settings:'Настройки',notifications:'Новости пары',checkpoint:'Проверка знаний',practice:'Практика',games:'Игры'};
 return <header className="appHeader">
  <div className="appHeaderText"><strong>{screen==='home'?`Привет, ${name}`:titles[screen]||'English for Two'}</strong><span>Твой английский · {level}</span></div>
  <button type="button" className="appNews" aria-label={`Новости пары${unread?`, новых: ${unread}`:''}`} onClick={onNews}><Icon name="bell"/>{unread>0&&<i>{unread>9?'9+':unread}</i>}</button>
 </header>;
}

export function BottomNav({screen,onNavigate}) {
 return <nav className="bottomNav" aria-label="Основные разделы">{[['home','Занятия'],['progress','Словарь'],['rewards','Подарки'],['settings','Настройки']].map(([id,label])=><button type="button" key={id} className={screen===id?'active':''} aria-current={screen===id?'page':undefined} onClick={()=>onNavigate(id)}><span className="navIcon"><Icon name={id}/></span><span className="navLabel">{label}</span></button>)}</nav>;
}
