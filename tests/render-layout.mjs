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
 const h=React.createElement,noop=()=>{},stats={lessons:{},byDay:{}},session=makeMicro('B1',{},stats);
 const home=draft=>h('div',{className:'app v5App'},h(AppHeader,{name:'Артур',level:'B1',unread:22,onNews:noop}),h(QuietHome,{level:'B1',stats,draft,onStart:noop,onResume:noop,onLegacy:noop,onGames:noop}),h('footer',{className:'saveStatus'},'Прогресс сохранен'),h(BottomNav,{screen:'home',onNavigate:noop}));
 const recallIndex=session.stages.findIndex(s=>s.type==='recall');
 const views={home:home(null),resume:home({...session,index:recallIndex,input:'My unfinished answer'}),story:h(MicroLesson,{session,onChange:noop,onAnswer:noop,onLearn:noop,onNext:noop,onFinish:noop,onPause:noop}),recall:h(MicroLesson,{session:{...session,index:recallIndex},onChange:noop,onAnswer:noop,onLearn:noop,onNext:noop,onFinish:noop,onPause:noop}),feedback:h(MicroLesson,{session:{...session,index:recallIndex,feedback:{correct:true,value:session.stages[recallIndex].item.phrase}},onChange:noop,onAnswer:noop,onLearn:noop,onNext:noop,onFinish:noop,onPause:noop})};
 await fs.mkdir('public/qa',{recursive:true});
 const css=(await fs.readFile('src/styles.css','utf8'))+'\n'+(await fs.readFile('src/quiet-redesign.css','utf8'));
 await fs.writeFile('public/qa/layout.css',css);
 for(const [name,view] of Object.entries(views))await fs.writeFile(`public/qa/${name}.html`,`<!doctype html><html lang="ru" data-season="autumn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Тестовый экран — ${name}</title><link rel="stylesheet" href="./layout.css"><style>:root{--app-safe-bottom:24px;--lesson-height:100dvh;}</style></head><body>${renderToStaticMarkup(view)}</body></html>`);
 console.log('Rendered 5 static mobile fixtures from production components; no production data.');
}finally{await server.close();}
