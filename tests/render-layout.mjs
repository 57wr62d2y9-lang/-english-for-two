// Static visual fixtures from the actual components/styles. No auth, storage,
// API calls, learner records or wallet changes are involved in these pages.
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import fs from 'node:fs/promises';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try {
 const {AppHeader,BottomNav}=await server.ssrLoadModule('/src/AppChrome.jsx');
 const {default:MicroLesson,QuietHome}=await server.ssrLoadModule('/src/MicroLesson.jsx');
 const {makeMicro}=await server.ssrLoadModule('/src/micro-lessons.js');
 const {default:ProgressPage}=await server.ssrLoadModule('/src/ProgressPage.jsx');
 const {default:SettingsPage}=await server.ssrLoadModule('/src/SettingsPage.jsx');
 const {Pairing}=await server.ssrLoadModule('/src/AppV5.jsx');
 const {default:Gifts}=await server.ssrLoadModule('/src/Gifts.jsx');
 const {lexiconForLevel,vocabularyStats}=await server.ssrLoadModule('/src/lexicon.js');
 const {courseProgress}=await server.ssrLoadModule('/src/learning.js');
 const {securedItem}=await import('./learning-fixtures.mjs');
 const h=React.createElement,noop=()=>{},stats={lessons:{},byDay:{}},session=makeMicro('B1',{},stats);
 const home=draft=>h('div',{className:'app v5App'},h(AppHeader,{name:'Артур',level:'B1',unread:22,onNews:noop}),h(QuietHome,{level:'B1',stats,draft,onStart:noop,onResume:noop,onLegacy:noop,onGames:noop}),h('footer',{className:'saveStatus'},'Прогресс сохранен'),h(BottomNav,{screen:'home',onNavigate:noop}));
 const recallIndex=session.stages.findIndex(s=>s.type==='recall');
 const views={home:home(null),resume:home({...session,index:recallIndex,input:'My unfinished answer'}),story:h(MicroLesson,{session,onChange:noop,onAnswer:noop,onLearn:noop,onNext:noop,onFinish:noop,onPause:noop}),recall:h(MicroLesson,{session:{...session,index:recallIndex},onChange:noop,onAnswer:noop,onLearn:noop,onNext:noop,onFinish:noop,onPause:noop}),feedback:h(MicroLesson,{session:{...session,index:recallIndex,feedback:{correct:true,value:session.stages[recallIndex].item.phrase}},onChange:noop,onAnswer:noop,onLearn:noop,onNext:noop,onFinish:noop,onPause:noop})};
 const fixtureTime=Date.parse('2026-11-11T08:00:00Z'),items=lexiconForLevel('B1');
 const progress=Object.fromEntries(items.slice(0,30).map((item,index)=>[item.id,index<6?securedItem(fixtureTime):{s:'LEARNING',c:2,rcl:1,l:fixtureTime-86400000,n:fixtureTime+86400000}]));
 const fixtureStats={totalMinutes:12,answers:40,byDay:{},lessons:{one:{id:'one',level:'B1',kind:'micro',situation:'plans',at:fixtureTime,seconds:42,answers:2,completed:false,reward:0},two:{id:'two',level:'B1',kind:'micro',situation:'choice',at:fixtureTime-86400000,seconds:120,answers:5,completed:true,reward:0}}};
 const wallet={earned:{example:{amount:35,at:fixtureTime}},spent:{},goals:{example:{title:'Короткая поездка вдвоем',cost:90,active:true}},incoming:{},partner:{name:'Anna',level:'A2',balance:24,goals:[]}};
 const settings={profileName:'Artur',level:'B1',minutes:15,dailyGoal:30,vocabPace:'normal'};
 const shell=(screen,content)=>h('div',{className:'app v5App'},h(AppHeader,{name:'Артур',level:'B1',screen,unread:0,onNews:noop}),content,h('footer',{className:'saveStatus'},'Прогресс сохранен'),h(BottomNav,{screen,onNavigate:noop}));
 views.progress=shell('progress',h(ProgressPage,{vocab:vocabularyStats(items,progress,fixtureTime),level:'B1',path:courseProgress(items,progress),items,progress,stats:fixtureStats,wallet,onCheck:noop}));
 views.settings=shell('settings',h(SettingsPage,{settings,backup:'saved',saveMessage:'Личная копия обновлена.',onChange:noop,onLevel:noop,onSave:noop,pairing:h(Pairing,{couple:{paired:true},onConnect:noop,onRefresh:noop}),itemCount:items.length,version:'0.9.2'}));
 views.gifts=shell('rewards',h(Gifts,{wallet,couple:{paired:true},profileName:'Artur',onCreate:noop,onRemove:noop,onRequest:noop,onResolve:noop}));
 await fs.mkdir('public/qa',{recursive:true});
 const css=(await fs.readFile('src/styles.css','utf8'))+'\n'+(await fs.readFile('src/quiet-redesign.css','utf8'));
 await fs.writeFile('public/qa/layout.css',css);
 for(const [name,view] of Object.entries(views))await fs.writeFile(`public/qa/${name}.html`,`<!doctype html><html lang="ru" data-season="autumn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Тестовый экран — ${name}</title><link rel="stylesheet" href="./layout.css"><style>:root{--app-safe-bottom:24px;--lesson-height:100dvh;}</style></head><body>${renderToStaticMarkup(view)}</body></html>`);
 console.log(`Rendered ${Object.keys(views).length} static mobile fixtures from production components; no production data.`);
}finally{await server.close();}
