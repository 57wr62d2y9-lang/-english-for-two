import assert from 'node:assert/strict';
import React from 'react';
import {create,act} from 'react-test-renderer';
import {createServer} from 'vite';
import {balanceOf,dayKey} from '../src/learning.js';
import {wheelRewardId} from '../src/daily-wheel.js';
const server=await createServer({define:{'import.meta.env.VITE_COUPLE_SYNC_URL':'""'},server:{middlewareMode:true},appType:'custom'});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const originalNow=Date.now,originalFetch=globalThis.fetch,originalTimeout=globalThis.setTimeout;
let now=Date.parse('2026-10-13T08:00:00Z'),root,requests=0;
Date.now=()=>now;globalThis.fetch=async()=>{requests++;throw Error('No production requests in wheel tests');};
const disk=new Map(),listeners=new Map(),delays=[];
globalThis.localStorage={getItem:k=>disk.get(k)||null,setItem:(k,v)=>disk.set(k,v)};
globalThis.document={hidden:false,body:{style:{}},documentElement:{dataset:{},style:{setProperty(){}}},addEventListener:(name,fn)=>{if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(fn);},removeEventListener:(name,fn)=>listeners.get(name)?.delete(fn),createElement:()=>({})};
globalThis.window={innerHeight:680,visualViewport:{height:680,addEventListener(){},removeEventListener(){}},addEventListener(){},removeEventListener(){}};
globalThis.getComputedStyle=()=>({getPropertyValue:()=> '#fff9f2'});
globalThis.setTimeout=(fn,ms,...args)=>ms===1100?(delays.push(fn),-1100):originalTimeout(fn,ms,...args);
const h=React.createElement,visible=n=>n==null?'':typeof n==='string'||typeof n==='number'?String(n):Array.isArray(n)?n.map(visible).join(''):visible(n.children);
const button=label=>root.root.findAllByType('button').find(b=>visible(b)===label);
const dialogs=()=>root.root.findAllByProps({role:'dialog'}).length;
const savedWallet=()=>JSON.parse(disk.get('eft3:browser:wallet'));
const close=async()=>act(async()=>root.root.findByProps({'aria-label':'Закрыть колесо'}).props.onClick());
const unmount=async()=>{if(root){await act(async()=>root.unmount());root=null;}};
const wake=async()=>{document.hidden=true;await act(async()=>listeners.get('visibilitychange')?.forEach(fn=>fn({type:'visibilitychange'})));document.hidden=false;await act(async()=>listeners.get('visibilitychange')?.forEach(fn=>fn({type:'visibilitychange'})));};
try {
  const {default:App}=await server.ssrLoadModule('/src/AppV5.jsx');
  const mount=async()=>act(async()=>{root=create(h(App));});
  disk.set('eft3:browser:settings',JSON.stringify({at:now,data:{level:'B1',profileName:'Artur',minutes:15,updatedAt:now}}));
  disk.set('eft3:browser:wallet',JSON.stringify({earned:{old:{at:1,amount:30}},spent:{},goals:{}}));
  await mount();assert.equal(dialogs(),1);
  assert.equal(JSON.parse(disk.get('eft3:browser:stats')).byDay[dayKey(now)].wheelSeenAt,now);
  await close();
  for(let i=0;i<3;i++){await wake();assert.equal(dialogs(),0);}
  await act(async()=>root.root.findByProps({className:'bottomNav'}).findAllByType('button')[1].props.onClick());
  await act(async()=>root.root.findByProps({className:'bottomNav'}).findAllByType('button')[0].props.onClick());
  assert.equal(dialogs(),0);
  await unmount();await mount();assert.equal(dialogs(),0);
  console.log('✓ actual app shows once; dismiss, three foreground returns, tab changes and full reload do not reopen it');

  await act(async()=>root.root.findByProps({'aria-label':'Открыть колесо дня'}).props.onClick());
  assert.equal(dialogs(),1);
  const spin=button('Крутить колесо').props.onClick;
  await act(async()=>{spin();spin();});
  assert.equal(button('Выбираем…').props.disabled,true);
  const first=savedWallet(),reward=first.earned[wheelRewardId(now)];assert.ok(reward);
  assert.equal(balanceOf(first),30+reward.amount);
  assert.equal(Object.keys(first.earned).length,2);
  // Close before the animation timer fires, then reload.
  await close();await unmount();await mount();
  assert.equal(dialogs(),0);assert.equal(root.root.findByProps({'aria-label':'Приз дня уже получен'}).props.disabled,true);
  assert.match(visible(root.toJSON()),/Приз дня:/);
  await wake();assert.equal(dialogs(),0);assert.deepEqual(savedWallet().earned,first.earned);
  console.log('✓ spin credits once before animation, blocks double taps, survives closing mid-spin and disables further attempts');

  now=Date.parse('2026-10-13T21:00:00Z');await wake();assert.equal(dialogs(),1);
  assert.ok(button('Крутить колесо'));assert.equal(balanceOf(savedWallet()),30+reward.amount);
  await close();await wake();assert.equal(dialogs(),0);
  await act(async()=>root.root.findByProps({className:'bottomNav'}).findAllByType('button')[1].props.onClick());
  now+=86400000;await wake();assert.equal(dialogs(),0);
  assert.equal(JSON.parse(disk.get('eft3:browser:stats')).byDay[dayKey(now)].wheelSeenAt,undefined);
  await act(async()=>root.root.findByProps({className:'bottomNav'}).findAllByType('button')[0].props.onClick());
  assert.equal(dialogs(),1);await close();
  await unmount();now+=86400000;document.hidden=true;await mount();assert.equal(dialogs(),0);
  await wake();assert.equal(dialogs(),1);
  assert.equal(requests,0);
  console.log('✓ new Istanbul day offers one new spin; other tabs and hidden loads wait for a visible home screen');
} finally {await unmount();Date.now=originalNow;globalThis.fetch=originalFetch;globalThis.setTimeout=originalTimeout;await server.close();}
