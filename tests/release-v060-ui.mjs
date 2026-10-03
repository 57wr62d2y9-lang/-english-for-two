import assert from 'node:assert/strict';
import React from 'react';
import {create,act} from 'react-test-renderer';
import {createServer} from 'vite';
import {lexiconForLevel} from '../src/lexicon.js';
import {checkpointThreshold,DAY} from '../src/learning.js';
import {makeSession,nextLessonTask} from '../src/lesson-engine.js';

const server=await createServer({server:{middlewareMode:true},appType:'custom'});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const now=Date.parse('2026-10-03T08:00:00Z'),oldNow=Date.now,oldFetch=globalThis.fetch;
Date.now=()=>now;let network=0;
globalThis.fetch=async()=>{network++;throw Error('UI tests cannot contact production');};
const disk=new Map();globalThis.localStorage={getItem:k=>disk.get(k)||null,setItem:(k,v)=>disk.set(k,v)};
globalThis.document={hidden:false,body:{style:{}},documentElement:{dataset:{},style:{setProperty(){}}},addEventListener(){},removeEventListener(){},createElement:()=>({})};
globalThis.window={innerHeight:680,addEventListener(){},removeEventListener(){}};
globalThis.getComputedStyle=()=>({getPropertyValue:()=> '#fff9f2'});
const h=React.createElement;let root;
const button=label=>root.root.findAllByType('button').find(n=>n.children.join('')===label);
try {
  const {default:App,Lesson,CheckScreen}=await server.ssrLoadModule('/src/AppV5.jsx');
  const {default:Gifts}=await server.ssrLoadModule('/src/Gifts.jsx');
  const {default:Card}=await server.ssrLoadModule('/src/DailyLessonCard.jsx');
  // Existing morning progress should produce a control, survive leaving it,
  // and settle one payment with a correctly completed daily badge.
  const pool=lexiconForLevel('A2'),progress=Object.fromEntries(pool.slice(0,checkpointThreshold('A2',1)).map(i=>[i.id,{s:'LEARNING',c:1,rec:1,l:now-DAY,n:now+7*DAY}]));
  disk.set('eft3:browser:settings',JSON.stringify({at:now,data:{level:'A2',profileName:'Anna',minutes:15,updatedAt:now}}));
  disk.set('eft3:browser:progress:A2',JSON.stringify(progress));
  await act(async()=>{root=create(h(App));});
  assert.ok(button('Начать контрольную →'));
  await act(async()=>button('Начать контрольную →').props.onClick());
  let current=root.root.findByType(CheckScreen).props.value;
  assert.equal(current.tasks.length,10);
  await act(async()=>root.root.findByType(CheckScreen).props.onAnswer(current.tasks[0].answer));
  await act(async()=>root.root.findByType(CheckScreen).props.onNext());
  await act(async()=>root.root.findByType(CheckScreen).props.onBack());
  assert.ok(button('Продолжить контрольную'));
  await act(async()=>root.unmount());
  await act(async()=>{root=create(h(App));});
  await act(async()=>button('Продолжить контрольную').props.onClick());
  current=root.root.findByType(CheckScreen).props.value;
  assert.equal(current.index,1);assert.equal(current.score,1);
  for(let i=1;i<10;i++){
    current=root.root.findByType(CheckScreen).props.value;
    await act(async()=>root.root.findByType(CheckScreen).props.onAnswer(current.tasks[i].answer));
    await act(async()=>root.root.findByType(CheckScreen).props.onNext());
  }
  current=root.root.findByType(CheckScreen).props.value;assert.equal(current.done,true);assert.equal(current.awarded,5);
  await act(async()=>button('На главную').props.onClick());
  const daily=root.root.findByType(Card);assert.match(daily.findByProps({className:'slotRow'}).findAllByType('span').flatMap(n=>n.children.filter(x=>typeof x==='string')).join(' '),/Готово · \+\$5/);
  const saved=JSON.parse(disk.get('eft3:browser:wallet'));
  assert.equal(saved.earned['routine:2026-10-03:morning'].amount,0);
  assert.equal(Object.values(saved.earned).reduce((n,x)=>n+x.amount,0),5);
  await act(async()=>root.unmount());
  console.log('✓ app UI: auto-check replaces lesson, persists through exit/reload, pays $5 and marks morning complete');

  let known=0,next=0;
  const intro=nextLessonTask(makeSession('B1'),{}),item=intro.task.item;
  const props={session:intro,ascent:{steps:0,total:80,percent:0},onKnown:()=>known++,onIntro(){},onNext:()=>next++};
  await act(async()=>{root=create(h(Lesson,props));});
  const first=JSON.stringify(root.toJSON());
  await act(async()=>root.root.findByProps({'aria-label':'Пример 2'}).props.onClick());
  assert.notEqual(JSON.stringify(root.toJSON()),first);assert.ok(button('Очень хорошо знаю · повтор через 35 дней'));
  const review={...intro,task:{...intro.task,type:'recall',prompt:item.ru,answer:item.phrase},feedback:null};
  await act(async()=>root.update(h(Lesson,{...props,session:review})));
  await act(async()=>button('Очень хорошо знаю · повтор через 35 дней').props.onClick());assert.equal(known,1);
  await act(async()=>root.update(h(Lesson,{...props,session:{...review,selected:'wrong',feedback:'wrong'}})));
  await act(async()=>button('Дальше →').props.onClick());assert.equal(next,1);
  assert.ok(button('Очень хорошо знаю · повтор через 35 дней'));
  await act(async()=>root.unmount());
  console.log('✓ lesson UI: example tabs, 35-day action on review and feedback, and next control');

  const removed=[],wallet={earned:{old:{amount:50}},spent:{old:{title:'Старый подарок',cost:10,status:'approved',at:1}},incoming:{},goals:{active:{title:'Наушники',cost:100,active:true,at:now},deleted:{title:'Удалённая цель',cost:10,active:false,deletedAt:now}},partner:null};
  await act(async()=>{root=create(h(Gifts,{wallet,couple:{},profileName:'Artur',onRemove:id=>removed.push(id)}));});
  assert.doesNotMatch(JSON.stringify(root.toJSON()),/Удалённая цель/);
  assert.equal(root.root.findByProps({className:'history giftArchive'}).props.open,undefined);
  await act(async()=>root.root.findByProps({'aria-label':'Удалить подарок: Наушники'}).props.onClick());
  await act(async()=>button('Удалить').props.onClick());assert.deepEqual(removed,['active']);
  await act(async()=>root.unmount());assert.equal(network,0);
  console.log('✓ gifts UI: deleted goals hidden, old requests collapsed, own delete action works');
} finally {Date.now=oldNow;globalThis.fetch=oldFetch;if(root)await act(async()=>root.unmount());await server.close();}
