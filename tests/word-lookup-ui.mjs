import assert from 'node:assert/strict';
import React from 'react';
import {create,act} from 'react-test-renderer';
import {createServer} from 'vite';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
globalThis.document={hidden:false,body:{style:{overflow:''}},createElement:()=>({set innerHTML(value){this.value=value;}})};
globalThis.window={};
try {
  const {WordHelpProvider,EnglishText,AnswerChoices}=await server.ssrLoadModule('/src/WordLookup.jsx');
  const {TranslateButton}=await server.ssrLoadModule('/src/InlineTranslation.jsx');
  const {OrderAnswer}=await server.ssrLoadModule('/src/AppV5.jsx');
  const h=React.createElement;
  let hints=0,answers=[],root;
  const options=['will walk','would walk'];
  const props={options,onAnswer:v=>answers.push(v),disabled:false};
  await act(async()=>{root=create(h(WordHelpProvider,{onHint:()=>hints++},h(AnswerChoices,props)));});
  const word=name=>root.root.findAllByType('button').find(b=>b.props['aria-label']===`Перевод слова: ${name}`);
  const button=name=>root.root.findAllByType('button').find(b=>b.children.join('')===name);
  const clickEvent={preventDefault(){},stopPropagation(){},currentTarget:{focus(){}}};
  await act(async()=>word('would').props.onClick(clickEvent));
  assert.equal(hints,1);assert.deepEqual(answers,[]);
  assert.equal(root.root.findAllByType('dialog').length,1);assert.equal(document.body.style.overflow,'hidden');
  assert.match(JSON.stringify(root.toJSON()),/воображаемый результат/);
  await act(async()=>button('Вернуться к заданию').props.onClick());
  assert.equal(document.body.style.overflow,'');assert.equal(root.root.findAllByType('dialog').length,0);
  await act(async()=>word('will').props.onClick(clickEvent));
  await act(async()=>root.root.findByType('dialog').props.onCancel({preventDefault(){}}));
  assert.equal(root.root.findAllByType('dialog').length,0);
  await act(async()=>word('would').props.onClick(clickEvent));
  const backdrop={};
  await act(async()=>root.root.findByType('dialog').props.onClick({target:backdrop,currentTarget:backdrop}));
  assert.equal(document.body.style.overflow,'');assert.equal(root.root.findAllByType('dialog').length,0);
  await act(async()=>root.root.findAllByType('button').find(b=>b.props['aria-label']==='Выбрать ответ: would walk').props.onClick());
  assert.deepEqual(answers,['would walk']);
  await act(async()=>root.update(h(WordHelpProvider,null,h(AnswerChoices,{...props,disabled:true,feedback:'wrong',answer:'would walk',selected:'will walk'}))));
  assert.equal(root.root.findAllByType('button').find(b=>b.props['aria-label']==='Выбрать ответ: would walk').props.disabled,true);
  assert.equal(word('would').props.disabled,undefined);
  for(const b of root.root.findAllByType('button'))assert.equal(b.findAllByType('button').length,1,'no nested buttons');
  await act(async()=>root.unmount());

  const order={tokens:[{id:0,text:'I'},{id:1,text:'would'},{id:2,text:'walk.'}]};
  await act(async()=>{root=create(h(WordHelpProvider,null,h(OrderAnswer,{task:order,onSubmit:v=>answers.push(v)})));});
  await act(async()=>button('I').props.onClick());
  await act(async()=>button('Перевод слов').props.onClick());
  await act(async()=>word('would').props.onClick(clickEvent));
  await act(async()=>button('Вернуться к заданию').props.onClick());
  await act(async()=>button('Собрать предложение').props.onClick());
  const assembly=root.root.findByProps({className:'sentenceAssembly'});
  assert.equal(assembly.findAllByType('button').length,1);assert.equal(assembly.findByType('button').children[0],'I');
  await act(async()=>button('would').props.onClick());await act(async()=>button('walk.').props.onClick());
  await act(async()=>button('Проверить предложение').props.onClick());assert.equal(answers.at(-1),'I would walk.');
  await act(async()=>root.unmount());

  // An old async result must never appear under the next word/sentence.
  const original=globalThis.fetch;let resolve;
  globalThis.fetch=()=>new Promise(r=>{resolve=r;});
  try {
    await act(async()=>{root=create(h(TranslateButton,{text:'Slow first lookup.',auto:true}));});
    await act(async()=>root.update(h(TranslateButton,{text:'The new sentence.',ru:'Новое предложение.',auto:true})));
    await act(async()=>resolve({ok:true,json:async()=>({responseStatus:200,responseData:{translatedText:'Старый перевод.'}})}));
    assert.match(JSON.stringify(root.toJSON()),/Новое предложение/);assert.doesNotMatch(JSON.stringify(root.toJSON()),/Старый перевод/);
    await act(async()=>root.unmount());
  } finally {globalThis.fetch=original;}
  console.log('✓ word UI: separate answer selection, modal cleanup, post-answer lookup, order preservation and stale request protection');
} finally {await server.close();}
