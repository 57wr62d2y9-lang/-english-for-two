import assert from 'node:assert/strict';
import React from 'react';
import {create,act} from 'react-test-renderer';
import {createServer} from 'vite';

const server=await createServer({server:{middlewareMode:true},appType:'custom'});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const savedFetch=globalThis.fetch;let network=0;
globalThis.fetch=async()=>{network++;throw Error('No network allowed in UI checks');};
try {
  const {default:Card}=await server.ssrLoadModule('/src/DailyLessonCard.jsx');
  const props={settings:{minutes:15,dailyGoal:30,vocabPace:'normal',speakingMode:'aloud'},time:Date.parse('2026-09-23T16:10:00Z'),
    wallet:{earned:{'routine:2026-09-23:morning':{amount:1}}},stats:{byDay:{'2026-09-23':{seconds:1800}},lessons:{}},session:null};
  let root;const starts=[];
  await act(async()=>{root=create(React.createElement(Card,{...props,onStart:minutes=>starts.push(minutes)}));});
  const text=()=>JSON.stringify(root.toJSON());
  const button=label=>root.root.findAllByType('button').find(n=>n.children.join('')===label);
  assert.doesNotMatch(text(),/В автобусе|Дома · вслух|Режим речевой практики/);
  assert.match(text(),/Говорить вслух не нужно/);assert.match(text(),/Процент в круге — только время практики/);
  assert.equal(root.root.findByProps({role:'progressbar'}).props['aria-valuenow'],100);
  assert.equal(root.root.findByProps({role:'progressbar'}).props['aria-label'],'Дневная цель по времени');
  assert.doesNotMatch(text(),/Вечерний урок завершён/);assert.match(text(),/Ещё не пройден/);
  await act(async()=>button('Начать урок · 15 минут').props.onClick());
  await act(async()=>button('Есть только 5 минут').props.onClick());assert.deepEqual(starts,[15,5]);
  await act(async()=>root.update(React.createElement(Card,{...props,session:{startedAt:Date.parse('2026-09-23T05:00:00Z'),slot:'morning'},onStart:()=>{}})));
  assert.match(text(),/В процессе/);assert.ok(button('Продолжить сохранённый урок'));
  const paid={...props,wallet:{earned:{...props.wallet.earned,'routine:2026-09-23:evening':{amount:1}}}};
  await act(async()=>root.update(React.createElement(Card,{...paid,onStart:()=>{}})));
  assert.match(text(),/Вечерний урок завершён/);assert.ok(button('Дополнительная практика · 15 минут'));
  assert.equal(root.root.findByProps({className:'slotRow'}).findAllByProps({className:'done'}).length,2);
  assert.doesNotMatch(text(),/Ещё не пройден/);
  assert.equal(button('Есть только 5 минут'),undefined);
  const recorded={...props,stats:{...props.stats,lessons:{evening:{completed:true,studyDay:'2026-09-23',slot:'evening'}}}};
  await act(async()=>root.update(React.createElement(Card,{...recorded,onStart:()=>{}})));
  assert.match(text(),/Завершён · ожидается \$1/);assert.doesNotMatch(text(),/Ещё не пройден/);
  await act(async()=>root.unmount());assert.equal(network,0);
  console.log('✓ daily lesson UI: one silent mode, separate time goal, actual slot completion and payout status');
} finally {globalThis.fetch=savedFetch;await server.close();}
