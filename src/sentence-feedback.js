import {normaliseAnswer} from './answer-check.js';
import {sentenceRule} from './sentence-rules.js';

// Suggestions after submission, never an assertion that every different
// translation is incorrect. Independent lexical recall is checked separately.
export function sentenceFeedback(task,value) {
  const expected=normaliseAnswer(task.answer),actual=normaliseAnswer(value);
  if(!/[a-z]/.test(actual))return {title:'Напиши по-английски',text:'Здесь нужно английское предложение. Сравни его с учебным примером и попробуй ещё раз.'};
  const negative=text=>text.split(' ').filter(w=>['not','cannot','never','no'].includes(w)).join(' ');
  if(negative(expected)!==negative(actual))return {title:'Проверь отрицание',text:'Сравни not, cannot, never или no. Добавление или пропуск отрицания меняет смысл предложения.'};
  const person=text=>text.replace(/^(today|tomorrow|yesterday) /,'').match(/^(?:have |has |had |can |could |would |will |do |does |did |am |is |are )?(i|you|he|she|it|we|they)\b/)?.[1];
  if(person(expected)&&person(actual)&&person(expected)!==person(actual))return {title:'Проверь, кто выполняет действие',text:'Сохрани лицо из русского предложения: я, ты, он, она или мы. Вместе с ним может меняться вспомогательный глагол.'};
  const rule=sentenceRule(task.answer),submittedRule=sentenceRule(value);
  if(rule.title!==submittedRule.title && rule.title!=='Порядок слов')return {title:`Сравни конструкцию · ${rule.title}`,text:'Учебный пример использует эту конструкцию. Проверь время, вспомогательный глагол и форму основного глагола.'};
  return {title:'Сравни с учебным примером',text:'Проверь слова, артикли, предлоги и порядок слов. Другая формулировка тоже может быть верной: приложение принимает только проверенные варианты.'};
}
