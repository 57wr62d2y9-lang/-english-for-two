// Compare spelling variants, never erase tense or negation. In particular,
// 'd is not always would: "I'd better" and "I'd finished" contain had.
// Reference: dictionary.cambridge.org/grammar/british-grammar/contractions
const participles=new Set('been had done gone seen taken given known thought bought brought caught taught found felt heard held kept left lost made met paid said sold sent sat slept stood told understood won written eaten drunk driven ridden risen fallen broken chosen forgotten spoken stolen worn thrown grown flown drawn shown spent built lent meant learnt learned read cut put set hit hurt shut cost let spread split bet burst cast run come become got gotten'.split(' '));
const sameAsBase=new Set('read cut put set hit hurt shut cost let spread split bet burst cast run come become'.split(' '));
const baseEndingEd=new Set('need feed bleed speed breed succeed proceed exceed bed shed wed shred'.split(' '));
const adverbs=new Set('not never already just always ever only really probably certainly still previously recently finally'.split(' '));
const isParticiple=word=>participles.has(word) || (/ed$/.test(word) && !baseEndingEd.has(word));

function prepare(text) {
  return String(text ?? '').normalize('NFKC').toLowerCase().replace(/[’‘ʼ`]/g,"'")
    .replace(/\bi'm\b/g,'i am').replace(/\blet's\b/g,'let us')
    .replace(/\bcan't\b/g,'cannot').replace(/\bcan\s+not\b/g,'cannot')
    .replace(/\bwon't\b/g,'will not').replace(/\bshan't\b/g,'shall not').replace(/n't\b/g,' not')
    .replace(/'re\b/g,' are').replace(/'ve\b/g,' have').replace(/'ll\b/g,' will')
    .replace(/[^a-z0-9а-яё\s']/gi,' ').replace(/\s+/g,' ').trim();
}
const plain=text=>text.replace(/'/g,' ').replace(/\s+/g,' ').trim();

export function answerForms(text) {
  const words=prepare(text).split(' ');
  let variants=[''];
  for(let index=0;index<words.length;index++) {
    const token=words[index],match=/^(i|you|he|she|it|we|they|there|that|this|here|what|who|where|when|why|how)'([ds])$/.exec(token);
    let choices=[token];
    if(match) {
      let next=index+1;
      while(adverbs.has(words[next]))next++;
      const following=words[next] || '',perfect=isParticiple(following);
      if(match[2]==='d') {
        const auxiliaries=following==='better' || following==='best' ? ['had']
          : perfect ? (sameAsBase.has(following)?['had','would']:['had']) : ['would'];
        choices=auxiliaries.map(auxiliary=>match[1]+' '+auxiliary);
      } else {
        const auxiliaries=['been','had','got','gotten'].includes(following)?['has']
          : perfect?['is','has']:['is'];
        choices=auxiliaries.map(auxiliary=>match[1]+' '+auxiliary);
      }
    }
    variants=variants.flatMap(prefix=>choices.map(choice=>prefix+' '+choice)).slice(0,64);
  }
  return [...new Set(variants.map(plain))];
}
export const normaliseAnswer=text=>answerForms(text)[0] || '';
export function isAnswerCorrect(task,value) {
  if(!String(value ?? '').trim())return false;
  const submitted=new Set(answerForms(value));
  return [task?.answer,...(task?.accepted || [])].filter(answer=>String(answer ?? '').trim())
    .some(answer=>answerForms(answer).some(form=>submitted.has(form)));
}
