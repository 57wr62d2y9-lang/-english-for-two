import {LEXICON,lexicalKey} from './lexicon.js';
import {VOCABULARY} from './vocabulary.js';
import {GUIDES,examplesFor,wordHints} from './lesson-notes.js';
import {DAILY_IELTS} from './daily-ielts.js';
import {WORD_NOTES,WORD_FORMS,CONTRACTIONS,CONTEXT_PHRASES} from './word-notes.js';

const wordPattern=()=>/[\p{Script=Latin}]+(?:['’][\p{Script=Latin}]+)*(?:-[\p{Script=Latin}]+(?:['’][\p{Script=Latin}]+)*)*/gu;
export const normaliseWord=text=>String(text||'').normalize('NFKC').toLowerCase().replaceAll('’',"'");
export const lemmaFor=word=>WORD_FORMS[normaliseWord(word)] || normaliseWord(word);
export function englishTokens(text) {
  const value=String(text||'');const tokens=[];let at=0;
  for(const match of value.matchAll(wordPattern())) {
    if(match.index>at)tokens.push({text:value.slice(at,match.index),start:at,word:false});
    tokens.push({text:match[0],start:match.index,word:true});at=match.index+match[0].length;
  }
  if(at<value.length)tokens.push({text:value.slice(at),start:at,word:false});
  return tokens;
}
export function sentenceAt(text,index=0) {
  const value=String(text||'');let start=0;
  for(const match of value.matchAll(/[.!?](?:["”’']?)(?:\s+|$)/g)) {
    const end=match.index+match[0].length;
    if(index<end)return value.slice(start,end).trim();
    start=end;
  }
  return value.slice(start).trim();
}
function sentences(text) {const list=[];let at=0;while(at<text.length){const part=sentenceAt(text,at);if(!part)break;list.push(part);at=text.indexOf(part,at)+part.length;while(/\s/.test(text[at]||'')&&at<text.length)at++;}return list;}
const hasWord=(text,word)=>englishTokens(text).some(token=>token.word&&lemmaFor(token.text)===lemmaFor(word));
let corpus;
function exampleCorpus() {
  if(corpus)return corpus;
  const rows=[];
  for(const item of [...LEXICON])for(const example of examplesFor(item))rows.push({...example,level:item.level});
  for(const guide of Object.values(GUIDES))if(guide.example)rows.push({en:guide.example,ru:guide.translation||''});
  for(const item of DAILY_IELTS)if(item.passage)for(const en of sentences(item.passage))rows.push({en,ru:en===item.passage?item.passageRu||'':'',level:item.level});
  corpus=rows.map(row=>({...row,words:new Set(englishTokens(row.en).filter(t=>t.word).map(t=>lemmaFor(t.text)))}));
  return corpus;
}
export function phraseAt(text,index) {
  for(const item of CONTEXT_PHRASES) {
    const pattern=new RegExp(item.pattern.source,item.pattern.flags);
    for(const match of text.matchAll(pattern))if(index>=match.index&&index<match.index+match[0].length)return {en:match[0],ru:item.ru,note:item.note,examples:item.examples};
  }
  // An authored phrase's translation is shown only when that phrase is visible
  // at the tapped position, never by consulting a hidden task answer.
  const clean=normaliseWord(text);
  for(const item of [...LEXICON].sort((a,b)=>b.phrase.length-a.phrase.length)) {
    const phrase=normaliseWord(item.phrase.replace(/[.!?]+$/,'')).trim();
    if(!phrase.includes(' '))continue;
    let at=clean.indexOf(phrase);
    while(at!==-1){if(index>=at&&index<at+phrase.length&&(!at||!/[a-z]/i.test(clean[at-1]))&&!/[a-z]/i.test(clean[at+phrase.length]||''))return {en:text.slice(at,at+phrase.length),ru:item.ru,examples:examplesFor(item)};at=clean.indexOf(phrase,at+1);}
  }
  return null;
}

export function buildWordCard({word,text,index=0,ru='',level='B1'}) {
  const normalized=normaliseWord(word),lemma=lemmaFor(word),contraction=CONTRACTIONS[normalized];
  const lexical=VOCABULARY.filter(item=>lexicalKey(item.phrase)===lemma).sort((a,b)=>Number(b.level===level)-Number(a.level===level))[0];
  const note=WORD_NOTES[lemma] || (lexical?{ru:lexical.ru,note:lexical.usageRu,examples:examplesFor(lexical)}:null);
  const hint=wordHints(normalized).find(h=>h.word===normalized) || wordHints(lemma).find(h=>h.word===lemma);
  const context=sentenceAt(text,index);
  const phrase=phraseAt(text,index);
  const candidates=[...(phrase?.examples||[]),...(note?.examples||[]),...exampleCorpus().filter(row=>row.words.has(lemma)).sort((a,b)=>Number(b.level===level)-Number(a.level===level)||Number(Boolean(b.ru))-Number(Boolean(a.ru))||a.en.length-b.en.length)];
  const seen=new Set([normaliseWord(context)]),examples=[];
  for(const row of candidates) {
    if(!row.en||!hasWord(row.en,word)||seen.has(normaliseWord(row.en)))continue;
    seen.add(normaliseWord(row.en));examples.push({en:row.en,ru:row.ru||''});if(examples.length===2)break;
  }
  return {word,lemma,ru:contraction?.[1]||note?.ru||hint?.ru||'',
    note:contraction?`${word} = ${contraction[0]}. Переводи сокращение в составе предложения.`:note?.note||'',
    definition:hint?.en||lexical?.explanation||'',phrase,context:{en:context,ru:context.trim()===String(text).trim()?ru:''},examples};
}
