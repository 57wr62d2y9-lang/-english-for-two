import assert from 'node:assert/strict';
import React from 'react';
import {create,act} from 'react-test-renderer';
import {createServer} from 'vite';
import {DAILY_IELTS} from '../src/daily-ielts.js';

const server=await createServer({server:{middlewareMode:true},appType:'custom'});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
globalThis.document={hidden:false};
let voiceCalls=0;
globalThis.window={speechSynthesis:{cancel(){},speak(){voiceCalls++;}},SpeechSynthesisUtterance:class {constructor(text){this.text=text;}}};
try {
  const {default:Practice}=await server.ssrLoadModule('/src/SpeakingPractice.jsx');
  const task=DAILY_IELTS.find(item=>item.level==='B1'&&item.skill==='Speaking');task.key=task.id;
  let mode='quiet',draft=null,completed=0,videoCalls=0;
  const props=()=>({task,mode,draft,completed:false,onModeChange(value){mode=value;},onDraftChange(value){draft=value;},onComplete(){completed++;},onVideo(){videoCalls++;return true;}});
  let root;
  await act(async()=>{root=create(React.createElement(Practice,props()));});
  const button=text=>root.root.findAllByType('button').find(node=>node.children.join('')===text);
  assert.equal(button('Сформулировал ответ про себя').props.disabled,false);
  await act(async()=>button('Сформулировал ответ про себя').props.onClick());
  assert.equal(completed,1);assert.equal(voiceCalls,0);
  await act(async()=>root.root.findByType('textarea').props.onChange({target:{value:'My bus journey was longer than usual.'}}));
  await act(async()=>root.update(React.createElement(Practice,props())));
  assert.equal(root.root.findByType('textarea').props.value,draft.notes);
  await act(async()=>button('Дома · вслух').props.onClick());
  await act(async()=>root.update(React.createElement(Practice,props())));
  assert.equal(mode,'aloud');assert.equal(button('Ответил вслух').props.disabled,false);
  assert.match(root.root.findByType('textarea').props.value,/bus journey/);
  assert.equal(videoCalls,0);
  assert.equal(root.root.findAllByType('iframe').length,0);
  assert.doesNotMatch(JSON.stringify(root.toJSON()),/YouTube|видео и 3 вопроса/);
  await act(async()=>root.unmount());
  await act(async()=>{root=create(React.createElement(Practice,props()));});
  assert.match(root.root.findByType('textarea').props.value,/bus journey/);
  await act(async()=>root.unmount());

  console.log('✓ quiet UI: silent completion, notes, mode switch and no video alternative');
} finally {await server.close();}
