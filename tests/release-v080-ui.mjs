import assert from 'node:assert/strict';
import React from 'react';
import {create,act} from 'react-test-renderer';
import {createServer} from 'vite';
import {createSpeedRound} from '../src/arcade.js';
import {lexiconForLevel} from '../src/lexicon.js';
const server=await createServer({define:{'import.meta.env.VITE_COUPLE_SYNC_URL':'""'},server:{middlewareMode:true},appType:'custom'});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const oldNow=Date.now,oldFetch=globalThis.fetch,oldInterval=globalThis.setInterval,oldTimeout=globalThis.setTimeout;
let now=Date.parse('2026-10-13T16:00:00Z'),requests=0,root;
Date.now=()=>now;globalThis.fetch=async()=>{requests++;throw Error('Offline tests only');};
const disk=new Map(),listeners=new Map(),ticks=[],delays=[];
globalThis.localStorage={getItem:k=>disk.get(k)||null,setItem:(k,v)=>disk.set(k,v)};
globalThis.document={hidden:false,body:{style:{}},documentElement:{dataset:{},style:{setProperty(){}}},addEventListener:(name,fn)=>{if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(fn);},removeEventListener:(name,fn)=>listeners.get(name)?.delete(fn),createElement:()=>({})};
globalThis.window={innerHeight:680,visualViewport:{height:680,addEventListener(){},removeEventListener(){}},addEventListener(){},removeEventListener(){}};
globalThis.getComputedStyle=()=>({getPropertyValue:()=> '#fff9f2'});
const h=React.createElement,visible=n=>n==null?'':typeof n==='string'||typeof n==='number'?String(n):Array.isArray(n)?n.map(visible).join(''):visible(n.children);
const button=label=>root.root.findAllByType('button').find(b=>visible(b)===label);
const unmount=async()=>{if(root){await act(async()=>root.unmount());root=null;}};
try {
  const {DailyDraw,SpeedRound,SpeedResult}=await server.ssrLoadModule('/src/Adventure.jsx');
  const {default:App,Lesson,CheckScreen}=await server.ssrLoadModule('/src/AppV5.jsx');
  globalThis.setInterval=(fn,ms,...args)=>ms===100?(ticks.push(fn),-100):oldInterval(fn,ms,...args);
  globalThis.setTimeout=(fn,ms,...args)=>[450,1100].includes(ms)?(delays.push(fn),-450):oldTimeout(fn,ms,...args);
  let closed=0;
  await act(async()=>{root=create(h(DailyDraw,{name:'Anna',stats:{byDay:{}},wallet:{earned:{}},onClose:()=>closed++,onStart(){},time:now}));});
  assert.equal(root.root.findAllByProps({role:'dialog'}).length,1);
  await act(async()=>button('Крутить колесо').props.onClick());assert.equal(button('Выбираем…').props.disabled,true);
  await act(async()=>{delays.splice(0).forEach(fn=>fn());});assert.ok(button('Начать маршрут →'));assert.match(visible(root.toJSON()),/12 заданий/);
  await act(async()=>root.root.findByProps({'aria-label':'Закрыть план дня'}).props.onClick());assert.equal(closed,1);await unmount();
  let result;
  await act(async()=>{root=create(h(SpeedRound,{initial:createSpeedRound('arena','B1',{},now),onFinish:(round,options)=>result={round,options},onBack(){}}));});
  await act(async()=>button('Поехали!').props.onClick());now+=500;
  const round=createSpeedRound('arena','A2',{},now),answer=round.questions[0].answer;
  await act(async()=>button(answer).props.onClick());assert.match(visible(root.toJSON()),/10очков/);
  assert.ok(root.root.findByProps({className:'speedOptions'}).findAllByType('button').every(b=>b.props.disabled));
  await act(async()=>{delays.splice(0).forEach(fn=>fn());});assert.equal(root.root.findByProps({className:'speedOptions'}).findAllByType('button')[0].props.disabled,false);
  now+=60000;await act(async()=>ticks.forEach(fn=>fn()));assert.equal(result.round.correct,1);assert.equal(result.options.aborted,false);
  const previous=result;await act(async()=>ticks.forEach(fn=>fn()));assert.equal(result,previous);await unmount();
  result=null;await act(async()=>{root=create(h(SpeedRound,{initial:createSpeedRound('arena','A2',{},now),onFinish:(round,options)=>result={round,options},onBack(){}}));});
  await act(async()=>button('Поехали!').props.onClick());document.hidden=true;
  await act(async()=>listeners.get('visibilitychange')?.forEach(fn=>fn()));assert.equal(result.options.aborted,true);document.hidden=false;await unmount();
  console.log('✓ daily wheel reveals a stable plan; speed UI disables double taps, finishes once and rejects hidden rounds');

  const pool=lexiconForLevel('B1');
  disk.set('eft3:browser:settings',JSON.stringify({at:now,data:{level:'B1',profileName:'Artur',minutes:15,updatedAt:now}}));
  disk.set('eft3:browser:progress:B1',JSON.stringify(Object.fromEntries(pool.slice(0,30).map(i=>[i.id,{s:'LEARNING',c:2,rec:1,rcl:1,l:now-86400000,n:now-1}]))));
  disk.set('eft3:browser:wallet',JSON.stringify({earned:{old:{at:now-1000,amount:30}},spent:{},goals:{}}));
  await act(async()=>{root=create(h(App));});
  assert.match(visible(root.toJSON()),/Контрольная этой недели/);assert.match(visible(root.toJSON()),/Крутить колесо/);
  await act(async()=>root.root.findByProps({'aria-label':'Закрыть план дня'}).props.onClick());
  await act(async()=>button('Маршрут дня · 12 заданий →').props.onClick());
  for(let i=0;i<60;i++) {
    const props=root.root.findByType(Lesson).props;
    if(props.session.done)break;
    assert.ok(props.session.adventure);now+=1000;
    if(!props.session.task){await act(async()=>props.onFinish());break;}
    if(props.session.task.type==='intro')await act(async()=>props.onIntro(false));
    else if(props.session.feedback)await act(async()=>props.onNext());
    else await act(async()=>props.onAnswer(props.session.task.answer));
  }
  const done=root.root.findByType(Lesson).props.session;assert.equal(done.done,true);assert.equal(done.answers,12);assert.equal(done.routineReward,1);
  assert.equal(Object.values(JSON.parse(disk.get('eft3:browser:wallet')).earned).reduce((n,r)=>n+r.amount,0),31);
  await act(async()=>root.root.findByType(Lesson).props.onHome());
  await act(async()=>root.root.findByProps({className:'weeklyCheckButton '}).props.onClick());
  const check=root.root.findByType(CheckScreen).props.value;assert.equal(check.mode,'weekly');
  for(let i=0;i<check.tasks.length;i++) {
    let props=root.root.findByType(CheckScreen).props;
    await act(async()=>props.onAnswer(props.value.tasks[props.value.index].answer));
    props=root.root.findByType(CheckScreen).props;assert.equal(props.value.index,i);assert.match(visible(root.toJSON()),/Ответ сохранён/);
    await act(async()=>props.onNext());
  }
  assert.equal(root.root.findByType(CheckScreen).props.value.checkReward,5);
  await act(async()=>root.root.findByType(CheckScreen).props.onDone());
  assert.match(visible(root.toJSON()),/Контрольная недели пройдена/);
  await unmount();await act(async()=>{root=create(h(App));});
  assert.match(visible(root.toJSON()),/Контрольная недели пройдена/);assert.equal(Object.values(JSON.parse(disk.get('eft3:browser:wallet')).earned).reduce((n,r)=>n+r.amount,0),36);
  assert.equal(requests,0);console.log('✓ actual app completes 12-answer route, preserves old $30, pays $1 then weekly $5 once, and restores completed week after reload');
} finally {await unmount();Date.now=oldNow;globalThis.fetch=oldFetch;globalThis.setInterval=oldInterval;globalThis.setTimeout=oldTimeout;await server.close();}
