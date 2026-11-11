import assert from 'node:assert/strict';
import React from 'react';import {act,create} from 'react-test-renderer';import {createServer} from 'vite';
const server=await createServer({define:{'import.meta.env.VITE_COUPLE_SYNC_URL':'""'},server:{middlewareMode:true},appType:'custom'});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const disk=new Map();let root,requests=0;
globalThis.localStorage={getItem:k=>disk.get(k)||null,setItem:(k,v)=>disk.set(k,v)};
globalThis.document={hidden:false,body:{style:{}},documentElement:{dataset:{},style:{setProperty(){}}},addEventListener(){},removeEventListener(){},createElement:()=>({})};
// ReminderSettings would try to fetch a schedule for this initData. The new
// settings page must not load or enable reminders, even in a Telegram context.
globalThis.window={Telegram:{WebApp:{initData:'isolated-qa'}},innerHeight:640,visualViewport:{height:640,addEventListener(){},removeEventListener(){}},addEventListener(){},removeEventListener(){}};
globalThis.getComputedStyle=()=>({getPropertyValue:()=> '#f5f6f8'});
const originalFetch=globalThis.fetch;globalThis.fetch=async()=>{requests++;throw Error('No production calls in UI tests');};
const h=React.createElement,text=n=>n==null?'':typeof n==='string'||typeof n==='number'?String(n):Array.isArray(n)?n.map(text).join(''):text(n.children);
const unmount=async()=>{if(root){await act(async()=>root.unmount());root=null;}};
try {
 const {default:App}=await server.ssrLoadModule('/src/AppV5.jsx');
 const {default:SettingsPage}=await server.ssrLoadModule('/src/SettingsPage.jsx');
 const {PracticeHistory,VocabularyProgress,studyDuration}=await server.ssrLoadModule('/src/ProgressPage.jsx');
 const {default:Gifts}=await server.ssrLoadModule('/src/Gifts.jsx');
 const now=Date.now(),stats={lessons:{partial:{id:'partial',kind:'micro',level:'B1',situation:'plans',seconds:42,at:now,completed:false,reward:0},check:{id:'check',kind:'checkpoint',mode:'weekly',level:'B1',seconds:0,at:now-86400000,passed:true,checkReward:5}},byDay:{}};
 const before=JSON.stringify(stats);
 await act(async()=>{root=create(h(PracticeHistory,{stats,level:'B1'}));});
 assert.match(text(root.toJSON()),/42 сек/);assert.match(text(root.toJSON()),/часть занятия сохранена/);assert.match(text(root.toJSON()),/\+\$5/);assert.doesNotMatch(text(root.toJSON()),/\+\$0|Незаверш|0 мин/);assert.equal(JSON.stringify(stats),before);await unmount();
 assert.equal(studyDuration(0),'Короткая практика');assert.equal(studyDuration(42),'42 сек');
 await act(async()=>{root=create(h(VocabularyProgress,{level:'B1',vocab:{introduced:30,verified:0,ready:0,remaining:392,available:422,words:200,phrases:222}}));});
 assert.equal(root.root.findByProps({role:'progressbar'}).props['aria-valuenow'],0);assert.match(text(root.toJSON()),/30\s*встречалось в уроках/);assert.equal(root.root.findByProps({className:'progressExplanation'}).props.open,undefined);await unmount();
 const wallet={earned:{old:{amount:30,at:1}},spent:{},incoming:{},goals:{}};
 await act(async()=>{root=create(h(Gifts,{wallet,couple:{paired:false},profileName:'Artur'}));});
 assert.equal(root.root.findByProps({className:'giftCollection'}).props.open,undefined);assert.match(text(root.toJSON()),/\$30/);assert.equal(wallet.earned.old.amount,30);await unmount();
 disk.set('eft3:browser:settings',JSON.stringify({at:now,data:{profileName:'Artur',level:'B1',minutes:15,dailyGoal:30,vocabPace:'normal'}}));disk.set('eft3:browser:wallet',JSON.stringify(wallet));
 await act(async()=>{root=create(h(App));});await act(async()=>root.root.findByProps({className:'bottomNav'}).findAllByType('button')[3].props.onClick());
 assert.match(text(root.toJSON()),/Внешние уведомления выключены/);assert.doesNotMatch(text(root.toJSON()),/Получать напоминания|Выбери удобное время для утреннего/);assert.equal(root.root.findAllByType('input').filter(n=>n.props.type==='time'||n.props.type==='checkbox').length,0);
 assert.equal(root.root.findAllByProps({className:'settingsGroup'}).length,2);assert.ok(root.root.findAllByProps({className:'settingsGroup'}).every(n=>n.props.open===undefined));
 let settings=root.root.findByType(SettingsPage).props;await act(async()=>settings.onLevel('A2'));assert.equal(root.root.findByType(SettingsPage).props.settings.level,'A2');
 settings=root.root.findByType(SettingsPage).props;await act(async()=>settings.onSave());assert.match(text(root.toJSON()),/На устройстве сохранено/);assert.equal(JSON.parse(disk.get('eft3:browser:settings')).data.minutes,15);assert.equal(JSON.parse(disk.get('eft3:browser:wallet')).earned.old.amount,30);assert.equal(requests,0);
 console.log('✓ secondary screens: honest mastery meter, no $0/failed-practice labels, seconds for short practice, folded collections/settings, level/save actions retained, zero reminder or production requests');
} finally {await unmount();globalThis.fetch=originalFetch;await server.close();}
