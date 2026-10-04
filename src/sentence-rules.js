// Short, answer-free construction notes. Full worked examples are shown only
// after submission. Sources: British Council grammar reference; Cambridge
// English Grammar Today (contractions and verb patterns).
const rules={
  order:{title:'Порядок слов',formula:'кто + действие + что / где / когда',ru:'В обычном утверждении сначала называем человека или предмет, затем действие. Сохрани лицо, время и отрицание из русского предложения.'},
  perfect:{title:'Present Perfect',formula:'кто + have / has + V3',ru:'Прошлое связано с настоящим: результат, опыт или незавершенный период. Has — с he/she/it, have — с I/you/we/they. V3 — третья форма глагола.'},
  perfectContinuous:{title:'Present Perfect Continuous',formula:'кто + have / has + been + V-ing',ru:'Процесс начался раньше и связан с настоящим. Been остается неизменным, основной глагол получает -ing.'},
  pastPerfect:{title:'Past Perfect',formula:'кто + had + V3',ru:'Действие произошло до другого момента в прошлом. Had одинаков для всех лиц.'},
  pastPerfectContinuous:{title:'Past Perfect Continuous',formula:'кто + had + been + V-ing',ru:'Процесс длился до другого момента в прошлом. Важна его длительность или результат к тому моменту.'},
  futurePerfect:{title:'Future Perfect',formula:'кто + will + have + V3',ru:'Действие завершится к указанному будущему моменту. После will форма have не меняется.'},
  past:{title:'Past Simple',formula:'кто + V2 · did not + V1 · did + кто + V1?',ru:'Завершенное действие в прошлом. В утверждении — прошедшая форма; после did/did not — начальная. V1 — начальная форма, V2 — прошедшая.'},
  continuous:{title:'Present Continuous',formula:'кто + am / is / are + V-ing',ru:'Действие происходит сейчас или в текущий временный период. I — am, he/she/it — is, you/we/they — are.'},
  pastContinuous:{title:'Past Continuous',formula:'кто + was / were + V-ing',ru:'Процесс происходил в определенный момент в прошлом. I/he/she/it — was, you/we/they — were.'},
  future:{title:'Будущее с will',formula:'кто + will + V1',ru:'После will нужна начальная форма без to и без -s. Will not можно сократить до won’t.'},
  going:{title:'План: be going to',formula:'кто + am / is / are + going to + V1',ru:'Заранее принятое намерение или прогноз по признакам. Меняется только am/is/are, после to — начальная форма.'},
  modal:{title:'Модальный глагол',formula:'кто + can / could / should / must / might / would + V1',ru:'После модального глагола нужна начальная форма без to и без -s. Сохрани значение: возможность, просьба, совет или предположение.'},
  conditional:{title:'Условное предложение',formula:'if + условие, затем результат',ru:'Реальная возможность: if + настоящее, will + V1. Воображаемая ситуация: if + прошедшая форма, would + V1. Нереальное прошлое: if + had + V3, would have + V3. Выбери смысл русского предложения.'}
};
export function sentenceRule(sentence='') {
  const s=sentence.toLowerCase().replaceAll('’',"'");
  const subject='(?:i|you|he|she|it|we|they|[a-z]+)';
  const participle='(?:been|done|gone|seen|sent|made|taken|given|known|left|found|bought|brought|read|written|eaten|drunk|run|come|got|gotten|fallen|forgotten|met|lost|won|[a-z]+ed)';
  const perfect=new RegExp('(?:\\b(?:have|has)|\\b(?:i|you|we|they)\'ve|\\b(?:he|she|it)\'s)\\s+(?:(?:not|already|just|never|ever)\\s+)*'+participle+'\\b');
  let key=/\bif\b/.test(s)?'conditional':
    /\bwill have\b/.test(s)?'futurePerfect':
    /\bhad been \w+ing\b/.test(s)?'pastPerfectContinuous':
    /\b(have|has) been \w+ing\b|\b(i|you|we|they)'ve been \w+ing\b|\b(he|she|it)'s been \w+ing\b/.test(s)?'perfectContinuous':
    new RegExp('\\bhad\\s+(?:(?:not|already|just|never)\\s+)*'+participle+'\\b').test(s)?'pastPerfect':
    perfect.test(s)?'perfect':
    /\b(am|is|are|'m|'re) going to\b/.test(s)?'going':
    /\b(was|were) \w+ing\b/.test(s)?'pastContinuous':
    /\b(am|is|are) \w+ing\b|\b(i'm|we're|they're|you're|he's|she's|it's) \w+ing\b/.test(s)?'continuous':
    /\bwill\b|\bwon't\b|\b\w+'ll\b/.test(s)?'future':
    /\b(can|could|should|must|might|would|cannot)\b|\bcan't\b/.test(s)?'modal':
    /\bdid(?:n't)?\b|\byesterday\b|\blast (week|night|year|month)\b/.test(s) ||
    new RegExp('\\b'+subject+'\\s+(?:[a-z]+ed|went|came|saw|sent|made|took|gave|bought|found|left|got|met|lost|felt|said|told|had|was|were)\\b').test(s)?'past':'order';
  const rule=rules[key];
  return /\bend(?:ed|s|ing)? up\s+\w+ing\b/.test(s)?{...rule,ru:rule.ru+' После сочетания, обозначающего итог, следующее действие в этом примере имеет форму с -ing.'}:rule;
}
