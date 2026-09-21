import assert from 'node:assert/strict';
import {englishTokens,sentenceAt,lemmaFor,phraseAt,buildWordCard} from '../src/word-lookup.js';
import {translateToRussian} from '../src/translation.js';
let passed=0;
async function test(name,fn){await fn();passed++;console.log(`✓ ${name}`);}
await test('word tokenisation preserves spacing, punctuation, contractions and Latin accents',()=>{
  const text='I’m in a café. По-русски — 15 минут. Well-known!';
  const tokens=englishTokens(text);
  assert.equal(tokens.map(t=>t.text).join(''),text);
  assert.deepEqual(tokens.filter(t=>t.word).map(t=>t.text),['I’m','in','a','café','Well-known']);
  assert.equal(englishTokens('Только русский').filter(t=>t.word).length,0);
});
await test('repeated words select the actual tapped sentence, not the first occurrence',()=>{
  const text='We work here. They work there. Work starts at nine.';
  assert.equal(sentenceAt(text,text.indexOf('work',8)),'They work there.');
  assert.equal(sentenceAt(text,text.lastIndexOf('Work')),'Work starts at nine.');
});
await test('will and would have distinct offline meanings and two translated examples',()=>{
  for(const word of ['will','would']){const card=buildWordCard({word,text:word});assert.ok(card.note);assert.equal(card.examples.length,2);assert.ok(card.examples.every(e=>e.ru));}
  assert.match(buildWordCard({word:'would',text:'would walk'}).ru,/бы/);
  assert.match(buildWordCard({word:'will',text:'will walk'}).note,/не «бы»/);
});
await test('idioms are matched at the tapped position rather than translated word for word',()=>{
  const text='That works for me. I work for a company.';
  assert.match(phraseAt(text,text.indexOf('works')).ru,/устраивает/);
  assert.equal(phraseAt(text,text.indexOf('company')),null);
  assert.equal(phraseAt('The platform works for metal processing.',13),null);
});
await test('known forms and curly contractions resolve without unsafe general stemming',()=>{
  assert.equal(lemmaFor('works'),'work');assert.equal(lemmaFor('news'),'news');assert.equal(lemmaFor('business'),'business');
  assert.match(buildWordCard({word:'I’m',text:'I’m ready.'}).note,/I am/);
  assert.match(buildWordCard({word:'lived',text:'If I lived closer…'}).note,/воображаемое/);
});
await test('context never substitutes a hidden answer or a translation of another sentence',()=>{
  const card=buildWordCard({word:'lived',text:'If I lived closer, I _____ to work.',index:5,answer:'would walk'});
  assert.equal(card.context.en,'If I lived closer, I _____ to work.');
  assert.equal(card.context.ru,'');
  const multi=buildWordCard({word:'bus',text:'A bus is here. We leave now.',index:2,ru:'Автобус здесь. Мы уходим.'});
  assert.equal(multi.context.ru,'');
});
await test('examples are real course sentences, distinct from context and relevant to the word',()=>{
  const card=buildWordCard({word:'employees',text:'Employees can ask for help.'});
  assert.equal(card.examples.length,2);assert.ok(card.examples.every(e=>/employees/i.test(e.en)));
  assert.equal(new Set(card.examples.map(e=>e.en)).size,2);
  const absent=buildWordCard({word:'xyzzypqr',text:'xyzzypqr'});assert.equal(absent.examples.length,0);assert.equal(absent.ru,'');
});
await test('concurrent identical translations share one request and failed requests can retry',async()=>{
  const original=globalThis.fetch;let calls=0,resolve;
  globalThis.fetch=()=>{calls++;return new Promise(r=>{resolve=r;});};
  try {
    const a=translateToRussian('A unique translation test.'),b=translateToRussian('A unique translation test.');
    assert.equal(calls,1);resolve({ok:true,json:async()=>({responseStatus:200,responseData:{translatedText:'Уникальная проверка перевода.'}})});
    assert.equal(await a,await b);assert.equal(await translateToRussian('A unique translation test.'),'Уникальная проверка перевода.');assert.equal(calls,1);
    globalThis.fetch=async()=>{calls++;return {ok:false};};
    await assert.rejects(translateToRussian('Retry-only test.'));await assert.rejects(translateToRussian('Retry-only test.'));assert.equal(calls,3);
  } finally {globalThis.fetch=original;}
});
console.log(`${passed} word lookup checks passed.`);
