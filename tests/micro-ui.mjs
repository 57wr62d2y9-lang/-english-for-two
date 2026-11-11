import assert from 'node:assert/strict';
import React from 'react';import {act,create} from 'react-test-renderer';import {createServer} from 'vite';
const server=await createServer({define:{'import.meta.env.VITE_COUPLE_SYNC_URL':'""'},server:{middlewareMode:true},appType:'custom'});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const disk=new Map(),events=new Map();let root,requests=0;
globalThis.localStorage={getItem:k=>disk.get(k)||null,setItem:(k,v)=>disk.set(k,v)};
globalThis.document={hidden:false,body:{style:{}},documentElement:{dataset:{},style:{setProperty(){}}},addEventListener:(k,f)=>events.set(k,f),removeEventListener:k=>events.delete(k),createElement:()=>({})};
globalThis.window={innerHeight:640,visualViewport:{height:640,addEventListener(){},removeEventListener(){}},addEventListener(){},removeEventListener(){}};
globalThis.getComputedStyle=()=>({getPropertyValue:()=> '#f7f8f9'});
const originalFetch=globalThis.fetch;globalThis.fetch=async()=>{requests++;throw Error('Offline tests only');};
const text=n=>n==null?'':typeof n==='string'||typeof n==='number'?String(n):Array.isArray(n)?n.map(text).join(''):text(n.children);
const btn=label=>root.root.findAllByType('button').find(n=>text(n)===label),click=async label=>{assert.ok(btn(label),label);await act(async()=>btn(label).props.onClick());};
const unmount=async()=>{if(root){await act(async()=>root.unmount());root=null;}};
try{
 const {default:App}=await server.ssrLoadModule('/src/AppV5.jsx');const {default:MicroLesson}=await server.ssrLoadModule('/src/MicroLesson.jsx');
 const now=Date.now();disk.set('eft3:browser:settings',JSON.stringify({at:now,data:{profileName:'Artur',level:'B1'}}));disk.set('eft3:browser:wallet',JSON.stringify({earned:{old:{amount:30,at:1}},spent:{},goals:{}}));
 await act(async()=>{root=create(React.createElement(App));});assert.equal(root.root.findAllByProps({role:'dialog'}).length,0);assert.ok(btn('Мои 5 минут'));assert.equal(root.root.findAllByProps({className:'mascot'}).length,0);
 await click('Мои 5 минут');await click('Разберем выражение');await click('Дальше');await click('Дальше');
 await act(async()=>root.root.findByType('input').props.onChange({target:{value:'unfinished answer'}}));await click('Закрыть и сохранить');await unmount();
 await act(async()=>{root=create(React.createElement(App));});await click('Продолжить с моего места');assert.equal(root.root.findByType('input').props.value,'unfinished answer');
 for(let i=0;i<15;i++){
  const props=root.root.findByType(MicroLesson).props,s=props.session,stage=s.stages[s.index];
  if(s.done)break;
  if(stage.type==='recall'){
   assert.equal(root.root.findAllByProps({className:'quietFeedback'}).length,0);
   await act(async()=>props.onAnswer(stage.item.phrase));assert.match(text(root.toJSON()),/Вспомнил самостоятельно/);
   const count=JSON.parse(disk.get('eft3:browser:stats')).answers;await act(async()=>props.onAnswer(stage.item.phrase));assert.equal(JSON.parse(disk.get('eft3:browser:stats')).answers,count);
   await click('Дальше');
  }else if(stage.type==='reply'){
   await act(async()=>props.onChange({...s,reply:'Seven works for me.'}));await click('Посмотреть пример и сравнить');assert.match(text(root.toJSON()),/самопроверка/);await click('На сегодня достаточно');
  }else throw Error('Unexpected stage '+stage.type);
 }
 await click('На главную');await click('Сегодня мало сил — 1 минута');let props=root.root.findByType(MicroLesson).props;assert.equal(props.session.minutes,1);assert.equal(props.session.stages.length,3);
 await click('Разберем выражение');await click('Дальше');props=root.root.findByType(MicroLesson).props;await act(async()=>props.onAnswer(props.session.stages[2].item.phrase));await click('На сегодня достаточно');await click('На главную');
 const stats=JSON.parse(disk.get('eft3:browser:stats'));assert.equal(Object.values(stats.lessons).filter(r=>r.kind==='micro'&&r.completed).length,2);assert.equal(JSON.parse(disk.get('eft3:browser:wallet')).earned.old.amount,30);assert.equal(requests,0);
 await click('Прежние уроки и проверки');assert.match(text(root.toJSON()),/Дополнительная практика/);
 console.log('✓ actual app: no automatic popup, full 5min and 1min flows, input/reply draft reload, no answer before submission, duplicate protection, legacy access and preserved wallet; zero production requests');
}finally{await unmount();globalThis.fetch=originalFetch;await server.close();}
