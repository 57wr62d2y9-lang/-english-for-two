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
  const starts=[];
  const props={dailyGoal:30,due:3,check:{mode:'weekly',count:10},time:Date.parse('2026-09-23T16:10:00Z'),
    wallet:{earned:{'routine:2026-09-23:morning':{amount:1}}},stats:{byDay:{'2026-09-23':{seconds:1800}},lessons:{}},
    onLesson:()=>starts.push('lesson'),onReview:()=>starts.push('review'),onCheck:()=>starts.push('weekly')};
  let root;
  await act(async()=>{root=create(React.createElement(Card,props));});
  const text=()=>JSON.stringify(root.toJSON());
  const button=label=>root.root.findAllByType('button').find(n=>n.children.join('')===label);
  assert.doesNotMatch(text(),/В автобусе|Дома · вслух|Режим речевой практики/);
  assert.match(text(),/Урок на .*15.* минут/);
  assert.match(text(),/Можно начать/);
  const action=kind=>root.root.findByProps({className:`studyAction ${kind}`});
  await act(async()=>root.root.findByProps({className:'studyStart'}).props.onClick());
  await act(async()=>action('studyReview').props.onClick());
  await act(async()=>action('studyCheck').props.onClick());
  assert.deepEqual(starts,['lesson','review','weekly']);
  await act(async()=>root.update(React.createElement(Card,{...props,lesson:{minutes:15,slot:'evening'}})));
  assert.match(text(),/В процессе/);assert.match(text(),/Продолжить урок/);
  const paid={...props,wallet:{earned:{...props.wallet.earned,'routine:2026-09-23:evening':{amount:1}}}};
  await act(async()=>root.update(React.createElement(Card,{...paid,check:null})));
  assert.match(text(),/Следующая в понедельник/);assert.equal(action('studyCheck').props.disabled,true);
  assert.equal(root.root.findByProps({className:'slotRow'}).findAllByProps({className:'done'}).length,2);
  const recorded={...props,stats:{...props.stats,lessons:{evening:{completed:true,studyDay:'2026-09-23',slot:'evening'}}}};
  await act(async()=>root.update(React.createElement(Card,recorded)));
  assert.equal(root.root.findByProps({className:'slotRow'}).findAllByProps({className:'done'}).length,2);
  await act(async()=>root.unmount());assert.equal(network,0);
  console.log('✓ daily lesson UI: one silent mode, compact practice time, actual slot completion and payout status');
} finally {globalThis.fetch=savedFetch;await server.close();}
