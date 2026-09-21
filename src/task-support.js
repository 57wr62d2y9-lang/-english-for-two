import { DAILY_GRAMMAR, GUIDES } from './lesson-notes.js';

// Original explanations for the actual sentences, not a repeated topic summary.
// Each pair is [translation of the completed sentence, reason for this answer].
const grammarRows = {
  'A2-present': [
    ['Моя сестра работает недалеко от станции.', 'My sister = she. В утверждении Present Simple после she добавляем -s: works. Work подходит к I/you/we/they; working требует is, а is work здесь неверно.'],
    ['Твой друг любит кофе?', 'Your friend = he или she, поэтому вопрос начинается с Does. После does основной глагол like уже без -s. Is нужен с be, а не для вопроса с like.']
  ],
  'A2-past': [
    ['Мы посетили музей в прошлую субботу.', 'Last Saturday — законченный момент в прошлом. Поэтому visit → visited (Past Simple). Have visited связывает опыт с настоящим и не сочетается здесь с конкретной прошлой субботой.'],
    ['Ты прочитал сообщение вчера?', 'Прошедшее время уже выражено словом Did. После него нужна начальная форма read, а не reads или reading. В этом вопросе read произносится /riːd/.']
  ],
  'A2-continuous': [
    ['Пожалуйста, потише. Ребёнок спит.', 'Просьба говорить тише показывает: действие идёт сейчас. The baby = it, поэтому is + sleeping. Sleeps every day означает привычку, а не то, что происходит сейчас.'],
    ['Смотри! Они бегут к автобусу.', 'Look! обращает внимание на действие сейчас. С they нужен are, затем running. Is относится к he/she/it, а не к they.']
  ],
  'A2-articles': [
    ['Мне нужен зонт. Идёт дождь.', 'Umbrella — один исчисляемый предмет, впервые упомянутый. Слово начинается с гласного звука, поэтому an umbrella, не a umbrella.'],
    ['Здесь есть кафе. Это кафе открывается в восемь.', 'Первое a café вводит новый предмет. Во второй фразе уже понятно, о каком кафе речь, поэтому The café. Артикль the указывает на это конкретное кафе.']
  ],
  'A2-count': [
    ['У нас совсем мало времени до автобуса.', 'Time здесь — неисчисляемое количество времени. Very little означает «очень мало». Few/many/a few относятся к отдельным предметам во множественном числе.'],
    ['Сколько билетов тебе нужно?', 'Tickets можно посчитать: one ticket, two tickets. Поэтому How many tickets? Much употребляют с неисчисляемыми словами: How much time?']
  ],
  'A2-future': [
    ['Я решил: собираюсь научиться водить.', 'I have decided показывает уже принятое намерение. Нужна конструкция I am going to learn. Am меняется по подлежащему, а после to стоит начальная форма learn.'],
    ['Эта сумка выглядит тяжёлой. Я понесу её за тебя.', 'Человек прямо сейчас предлагает помощь. Для такого решения подходит will + carry. После will не нужны to, am или окончание -s.']
  ],
  'A2-comparison': [
    ['Эта комната больше нашей.', 'Than показывает сравнение двух комнат. У короткого big сравнительная форма bigger: согласная g удваивается. Biggest — «самый большой», а more big здесь не употребляют.'],
    ['Новый стул удобнее старого.', 'Comfortable — длинное прилагательное: more comfortable than. Most comfortable означает «самый удобный» и используется для превосходной степени.']
  ],
  'B1-conditional': [
    ['Если погода улучшится, мы поедим на улице.', 'Это реальная возможность в будущем: погода может улучшиться. В условии уже стоит Present Simple — improves. Результат строим как will + eat. По-русски в обеих частях будущее, но по-английски после обычного if здесь настоящее.'],
    ['Если бы я жил ближе, я бы ходил на работу пешком.', 'Lived здесь не означает «жил когда-то»: это воображаемое настоящее — сейчас я живу не так близко. Это Second Conditional: if + Past Simple → would + глагол. Would walk = «ходил бы пешком». Will walk = «пойду/буду ходить» при реальном будущем условии. Сравни: If I live closer, I will walk to work — «Если буду жить ближе, буду ходить пешком». Меняются обе части: live → lived, will → would.']
  ],
  'B1-perfect': [
    ['Я работаю здесь с марта, и мне по-прежнему это нравится.', 'Since March задаёт начало периода, который продолжается сейчас. С I нужен have + worked. Worked yesterday означало бы отдельное законченное действие, а не работу с марта до сегодняшнего дня.'],
    ['Мы ещё не забронировали билеты.', 'Yet в этом отрицании означает «ещё». Важен результат к настоящему моменту: билетов пока нет. Нужны have not (haven’t) + третья форма booked. Haven’t book неверно: после have нужна третья форма.']
  ],
  'B1-modal': [
    ['Он только что очень плотно поел. Не может быть, чтобы он был голоден.', 'Из большого обеда делаем вывод, что голод маловероятен: can’t be hungry. Must be означало бы противоположный уверенный вывод — «должно быть, голоден». Здесь can’t — не запрет, а вывод.'],
    ['В офисе темно, но, возможно, она работает дома.', 'Тёмный офис не доказывает, что она не работает вообще. Might be working выражает возможность. После might идёт be без to; остальные варианты не образуют нужную конструкцию.']
  ],
  'B1-infinitive': [
    ['Она избегает поездок за рулём в час пик.', 'После avoid следующий глагол имеет форму -ing: avoids driving. Это особенность управления avoid, а не время действия. To drive после avoid не ставят.'],
    ['Мы договорились разделить расходы поровну.', 'Agree соединяется со следующим действием через to: agreed to share. Sharing после agreed не подходит. Equally — «поровну».']
  ],
  'B1-passive': [
    ['Посылку доставили сегодня утром.', 'Посылка не доставляет что-то сама — её доставляют. Нужен пассив: was + delivered. Delivered без was означало бы активное действие посылки; was deliver неверно, нужна третья форма.'],
    ['Эту форму необходимо заполнить до пятницы.', 'Form — объект действия: форму заполняют. После must начальная форма be, затем третья форма completed: must be completed. Must complete означало бы, что сама форма что-то заполняет.']
  ],
  'B1-reported': [
    ['Вчера он сказал мне, что поможет нам на следующий день.', 'Передаём вчерашнее обещание: исходное “I will help” превращается в he would help. Would здесь — «будущее из прошлого», не обязательно условное «бы». The next day относится ко дню после того разговора.'],
    ['Она сказала мне, что офис закрыт.', 'После tell ставим адресата прямо: told me. После say понадобился бы to: said to me. Spoke me и talked me не передают здесь конструкцию «сказала мне, что…».']
  ],
  'B1-relative': [
    ['Это тот коллега, который мне помог.', 'Colleague — человек, поэтому who. Это слово одновременно связывает части и заменяет «он/она». Where относится к месту, which обычно к предмету.'],
    ['Вот файл, который ты просил.', 'File — предмет. В определяющем придаточном без запятых подходит that (также возможно which, но его нет среди вариантов). Who — о человеке, whose — о принадлежности.']
  ],
  'B2-used': [
    ['Она привыкла рано вставать.', 'Is used to означает «привыкла», а to здесь предлог. После предлога действие выражаем через -ing: getting up. Не путай с used to get up — «раньше вставала».'],
    ['Раньше я жил за границей, но в прошлом году вернулся домой.', 'Описана прежняя ситуация, которая изменилась: used to + live. Am used to live неверно: для «привык жить» нужно am used to living.']
  ],
  'B2-contrast': [
    ['Несмотря на усталость, она закончила отчёт.', 'После пропуска уже стоит being tired — оборот с -ing, поэтому Despite. Для Although потребовалась бы полная часть: Although she was tired. However обычно связывает отдельные высказывания.'],
    ['Хотя поезд опоздал, мы приехали до полудня.', 'The train was late — полная часть с подлежащим и сказуемым. Её вводит Although. После Despite потребовалось бы существительное или -ing: despite the delay.']
  ],
  'B2-third': [
    ['Если бы ты позвонил, я бы заехал за тобой.', 'Had called — несостоявшееся условие в прошлом: звонка не было. Результат тоже в прошлом, поэтому would have + picked. Это Third Conditional, а will pick — реальное будущее. Pick somebody up здесь означает «заехать за кем-то».'],
    ['Если бы я тогда согласился на ту работу, сейчас жил бы в Берлине.', 'Условие относится к прошлому (had taken), а слово now переносит результат в настоящее. Это Mixed Conditional: if + had + V3 → would + live. Would have lived описывало бы прошлый результат, не нынешнее место жительства.']
  ],
  'B2-deductionPast': [
    ['Дверь заперта. Они, должно быть, уже ушли.', 'Запертая дверь — основание для вывода об уже совершённом действии. Нужна связка must have + left. Must left неверно; must здесь не обязанность, а «должно быть».'],
    ['Она ничего об этом не знала. Не может быть, чтобы она прочитала письмо.', 'Незнание противоречит предположению, что письмо уже прочитано: can’t have + read. Must have read означало бы «должно быть, прочитала» — противоположный вывод.']
  ],
  'B2-relative': [
    ['Мой руководитель, который живёт неподалёку, ездит на работу на велосипеде.', 'Информация между запятыми — добавочное пояснение. О человеке используем who. That в таком придаточном с запятыми не употребляется.'],
    ['Предложение, которое мы обсуждали вчера, было принято.', 'The proposal — предмет, а пояснение отделено запятыми. Поэтому which; that здесь не подходит из-за типа придаточного, хотя в определяющем придаточном без запятых оно возможно.']
  ],
  'B2-passive': [
    ['Сейчас строят новый мост.', 'At the moment — действие в процессе. Мост не строит сам себя: нужен пассив Present Continuous, is being + built. Is built — обычный факт, а is building — активное действие.'],
    ['К тому времени, как мы приехали, решение уже приняли.', 'Решение приняли раньше нашего приезда в прошлом: Past Perfect. Само решение — объект действия, поэтому пассив had been + made, а не had made.']
  ],
  'B2-perfect': [
    ['К следующему июню я проработаю здесь пять лет.', 'By next June — точка в будущем. К ней накопится пять лет работы: will have + worked (Future Perfect). Смотрим из будущего назад на весь период.'],
    ['Она устала, потому что работала всю ночь.', 'Усталость была в прошлом, а долгий процесс привёл к ней раньше: had been + working. Past Perfect Continuous подчёркивает длительность all night и объясняет прошлый результат.']
  ],
  'C1-inversion': [
    ['Только после завершения аудита мы заметили расхождение.', 'Отрицательное ограничение Not until вынесено в начало. Поэтому в главной части инверсия: did + we + notice. Прошедшее время несёт did, а notice остаётся в начальной форме.'],
    ['Ни при каких обстоятельствах не следует сообщать пароль.', 'После начального Under no circumstances нужен обратный порядок: should you share. Отрицание уже есть в обстоятельстве; конструкция подчёркивает строгий запрет.']
  ],
  'C1-cleft': [
    ['Именно выбранный момент сделал предложение трудным для принятия.', 'Это выделительная конструкция It was X that…: выделяем the timing. После выделенного элемента нужна связка that. When не завершает эту конструкцию.'],
    ['Самое важное — насколько надёжны доказательства.', 'Вся часть What matters most выступает одним подлежащим: «то, что важнее всего». Поэтому is, а не are. Whether вводит вопрос о надёжности.']
  ],
  'C1-participle': [
    ['Оценив риски, совет директоров решил продолжить.', 'Оценка завершилась до решения. Having + assessed обозначает предшествующее действие. Обе части относятся к одному исполнителю — the board.'],
    ['Столкнувшись с противоречивыми данными, она воздержалась от суждения.', 'Faced with — сокращение от being faced with: «оказавшись перед чем-то». With входит именно в эту конструкцию. Facing conflicting evidence было бы возможно без with, но не facing herself with в данном смысле.']
  ],
  'C1-hedging': [
    ['Выборка мала. Результаты могут указывать на более широкую тенденцию.', 'Маленькая выборка требует осторожного вывода. May indicate допускает тенденцию, но не утверждает её доказанность. Prove beyond doubt и always guarantee преувеличивают силу данных.'],
    ['Эта мера, по-видимому, помогла.', 'Appears to have helped означает вероятный положительный эффект, а не абсолютный успех. Остальные варианты с every, everywhere и never делают всеобъемлющие выводы, для которых нет оснований.']
  ],
  'C1-third': [
    ['Если бы мы знали об ограничении, то спланировали бы всё иначе.', 'Had we known = If we had known: инверсия заменяет if. Условие и результат в нереальном прошлом, поэтому would have + planned.'],
    ['Если бы финансирование прекратилось, проект перестал бы быть жизнеспособным.', 'Were funding to be withdrawn = If funding were to be withdrawn. Это гипотетическое будущее условие, поэтому would + be. No longer означает «больше не», а не отрицание в прошлом.']
  ],
  'C1-contrast': [
    ['Хотя доказательства убедительны, некоторые вопросы остаются.', 'While здесь означает «хотя» и вводит полную часть the evidence is compelling. Despite перед такой частью без перестройки не ставят.'],
    ['Программа дорогая; тем не менее её преимущества могут оправдать затраты.', 'Точка с запятой разделяет два самостоятельных высказывания. Nevertheless вводит контраст: «тем не менее». Although должно было бы превратить одну часть в придаточную, а despite требует существительного или -ing.']
  ],
  'C1-reported': [
    ['Комитет рекомендовал пересмотреть эту политику.', 'После recommended that в формальной рекомендации используем начальную форму be, независимо от подлежащего. Policy получает действие: be reviewed. Вариант should be reviewed тоже возможен, но его нет в ответах.'],
    ['Он отрицал, что у него был доступ к конфиденциальным файлам.', 'После denied нужна форма -ing, не to. Having had — перфектный герундий: доступ был раньше отрицания. Первое having строит форму, а had — третья форма смыслового have («иметь»).']
  ]
};

export function grammarDetail(task) {
  const item=DAILY_GRAMMAR.find(entry=>entry.id === task?.id) || task || {};
  const match=/^daily-(.+)-(\d+)$/.exec(item.id || '');
  const detail=match && grammarRows[match[1]]?.[Number(match[2])];
  return {sentence:item.prompt?.includes('_____') ? item.prompt.replace('_____',item.answer) : item.answer,
    translation:detail?.[0] || '',why:detail?.[1] || item.ru || '',en:item.explanation || ''};
}

export const CONDITIONAL_TYPES = [
  {id:'zero',title:'0 · Zero — правило или закономерность',formula:'If + Present Simple → Present Simple',ru:'Результат повторяется всякий раз при этом условии. Речь не об одном будущем случае.',en:'If I drink coffee late, I sleep badly.',translation:'Если я поздно пью кофе, то плохо сплю.'},
  {id:'first',title:'1 · First — реальная возможность',formula:'If + Present Simple → will + V',ru:'Допускаем, что условие выполнится в будущем. V — начальная форма глагола, без to. Will стоит в результате, не в обычной части с if.',en:'If my shift ends early, I will call you.',translation:'Если моя смена закончится рано, я тебе позвоню.'},
  {id:'second',title:'2 · Second — «если бы… сейчас»',formula:'If + Past Simple → would + V',ru:'Воображаем настоящее или будущее. Прошедшая форма подчёркивает нереальность или малую вероятность, а не прошлое время. Would часто соответствует русскому «бы».',en:'If my flat were bigger, I would buy a piano.',translation:'Если бы моя квартира была больше, я бы купил пианино.'},
  {id:'third',title:'3 · Third — другое прошлое',formula:'If + had + V3 → would have + V3',ru:'Условие уже не случилось; представляем другой результат тогда. V3 — третья форма: gone, seen, worked. Реальное прошлое этим уже не изменить.',en:'If I had saved the address, I would have found the café.',translation:'Если бы я сохранил адрес, я бы нашёл кафе.'},
  {id:'mixed',title:'Mixed — условие и результат в разное время',formula:'If + had + V3 → would + V (now)',ru:'Прошлое условие → результат сейчас. Бывает и наоборот: нынешнее свойство → прошлый результат: If I were less shy, I would have spoken at the meeting — «Если бы я был менее застенчив, я бы выступил на том собрании».',en:'If I had charged my phone, it would work now.',translation:'Если бы я зарядил телефон, он бы сейчас работал.'}
];

const conditionals='https://englex.ru/conditional-sentences/';
export const GRAMMAR_INDEX='https://englex.ru/cat-grammar/';
export const RULE_LINKS={
  conditional:conditionals,third:conditionals,conditionalInversion:conditionals,
  relative:'https://englex.ru/subordinate-clauses/',
  modal:'https://englex.ru/modal-verbs-in-english/',deductionPast:'https://englex.ru/modal-verbs-in-english/',
  articles:'https://englex.ru/using-articles-in-english/'
};
export function ruleResource(guide) {
  const key=Object.keys(GUIDES).find(key=>GUIDES[key].title===guide?.title);
  if(!key || key==='phrase')return null;
  return {url:RULE_LINKS[key] || GRAMMAR_INDEX,label:RULE_LINKS[key] ? 'Подробный разбор на русском · Инглекс ↗' : 'Другие правила на русском · Инглекс ↗'};
}
export const isConditionalGuide=guide=>['conditional','third','conditionalInversion'].some(key=>GUIDES[key].title===guide?.title);

export function translationTarget(task) {
  if(task.passage)return {text:task.passage,ru:task.passageRu || '',label:'Показать перевод всего текста'};
  if(task.type==='grammar') {const detail=grammarDetail(task.item || task);return {text:detail.sentence,ru:detail.translation,label:'Показать перевод предложения'};}
  if(task.type==='recognition')return {text:task.prompt,ru:task.item?.ru || '',label:'Показать перевод выражения'};
  if(task.type==='context' && !task.prompt?.includes('_____'))return {text:task.prompt,ru:'',label:'Перевести значение'};
  if(task.type==='recall')return {text:'',ru:'',label:''}; // the prompt is already Russian
  if(task.example?.en)return {text:task.example.en,ru:task.example.ru || '',label:'Показать перевод предложения'};
  if(task.type==='ielts' && task.skill==='Writing' && task.answer)return {text:task.prompt.includes('_____')?task.prompt.replace('_____',task.answer):task.answer,ru:task.answerRu || '',label:'Показать перевод примера ответа'};
  if(task.practice)return {text:task.model,ru:'',label:'Показать перевод примера ответа'};
  return {text:task.prompt,ru:task.prompt===task.item?.phrase?task.item.ru:'',label:task.lesson?'Перевести вопрос':'Показать перевод фразы'};
}
