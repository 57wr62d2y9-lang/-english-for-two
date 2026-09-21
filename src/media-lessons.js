import { LISTENING_LESSONS } from './catalog.js';
import { VLOG_LESSONS } from './vlog-lessons.js';

const followups = {
  'listen-a2-briefing':['What is the speaker mainly doing?','Giving practical instructions to staff','Booking a holiday|Interviewing a customer','The points concern parking and canteen payments.','Речь идёт о рабочих инструкциях: парковке и оплате в столовой.'],
  'listen-a2':['What is the purpose of the call?','To agree on a new meeting time','To hire a new employee|To discuss a finished project','Lucy asks to move an existing meeting earlier.','Люси просит перенести уже назначенную встречу на более раннее время.'],
  'listen-a2-message':['What should the person taking the message do?','Pass on the request for a return call','Cancel Maria’s appointments|Send Peter a lunch menu','Peter needs a call back about the project figures.','Нужно передать Марии просьбу перезвонить по поводу цифр проекта.'],
  'listen-b1-call':['Which description best fits the negotiation?','A temporary exception to payment terms','A permanent end to all payments|A complaint about product colour','Andrea asks for a one-off extension, not cancellation of the debt.','Обсуждают разовое продление срока оплаты, а не отмену долга.'],
  'listen-b1a':['What does David’s final response show?','Acceptance with a remaining concern','Complete withdrawal from the team|Certainty that planning is unnecessary','He accepts the decision but still wants additional time.','Дэвид соглашается с решением, но продолжает просить дополнительное время.'],
  'listen-b1b':['What is the meeting intended to produce?','Practical steps towards inclusion','A change to sales prices|A decision to cancel training','The discussion moves from guidelines to finding a trainer.','Участники переходят от общих принципов к практическим действиям, включая поиск тренера.'],
  'listen-b1-balance':['What tension does the interview explore?','Flexibility versus being available beyond office hours','Travel versus office decoration|Paper files versus printing costs','Technology enables flexibility but also connects people to work outside the office.','Технологии дают гибкость, но сохраняют связь с работой вне офиса.'],
  'listen-b2-business':['What is the business model built around?','Connecting demand with approved tutors','Making all lessons take place in one building|Eliminating human teaching','The platform connects students to a pool of tutors.','Платформа связывает учеников с отобранными преподавателями.'],
  'listen-b2':['Which summary fits Amanda’s approach?','Gradually reducing digital interruptions','Giving up all work immediately|Using more notifications to stay focused','Turning off notifications is a first step before a longer break.','Отключение уведомлений — первый шаг перед более долгим перерывом.'],
  'listen-b2-motivation':['What general claim is challenged?','More money always improves creative performance','People never respond to incentives|Creative work requires no effort','The experiment shows that a financial incentive can hinder a complex task.','Эксперимент показывает: денежное поощрение может мешать решению сложной задачи.'],
  'listen-c1-interview':['How is the candidate positioning the move?','As an opportunity to develop a specialised contribution','As an escape from any responsibility|As a complete rejection of HR','Her motivation is linked to the scope of the L&D role.','Мотивация кандидата связана с возможностью специализироваться в обучении и развитии.'],
  'listen-c1':['What management principle is illustrated by helping Matteo?','Adjust capacity to match project responsibilities','Allocate work without regard to workload|Replace research with assumptions','Temporary help with routine duties makes room for project design work.','Временная помощь с текущими обязанностями освобождает время на проект.'],
  'listen-c1-challenges':['What do the charter and SMART goals have in common?','They make expectations and priorities explicit','They remove the need to communicate|They guarantee there will be no disruption','Both tools clarify how work should be organised.','Оба инструмента помогают явно определить правила работы, ожидания и приоритеты.']
};

export const AUDIO_LESSONS = LISTENING_LESSONS.map(lesson => {
  const extra = followups[lesson.id];
  return {...lesson,kind:'listening',sourceLevel:lesson.level,questions:[
    ...lesson.questions.map(q=>({...q,explanation:'Listen again for the detail that answers this question.',ru:'Переслушай фрагмент и найди конкретную деталь, которая отвечает на вопрос.'})),
    {prompt:extra[0],options:[extra[1],...extra[2].split('|')],answer:0,explanation:extra[3],ru:extra[4]}
  ]};
});

const videoRows = [
  ['A2','A2','showing-interest','Проявляем интерес','showing-interest',[
    ['Where had Bob lived?','Canada','Spain|Australia','Bob recalls a winter in Canada.','Боб вспоминает зиму в Канаде.'],
    ['How did Bob meet his wife?','She treated him in hospital','They worked in a café|They met on a train','His future wife was the doctor who examined his injury.','Его будущая жена была врачом, которая осматривала его травму.'],
    ['Which response expresses sympathy?','I’m sorry to hear that.','Congratulations!|You must be joking about lunch.','This phrase responds kindly to bad news.','Так сочувствуют человеку, услышав плохую новость.']]],
  ['A2','A2','apologising','Извиняемся по-английски','apologising',[
    ['Why does Paul apologise?','He caused Noelia to fall','He lost her phone|He cancelled her holiday','Paul says he did not see Noelia.','Пол говорит, что не заметил Ноэлию.'],
    ['What does Noelia say about responsibility?','Both of them were involved','Only Bob was responsible|Nobody had been moving','She acknowledges that she had been running.','Ноэлия признаёт, что сама бежала, и говорит об общей ответственности.'],
    ['Which expression accepts an apology?','That’s all right.','It was your fault alone.|Go away immediately.','It reassures the person apologising.','Эта фраза успокаивает того, кто извиняется.']]],
  ['B1','B1','conversation','Поддерживаем разговор','keeping-conversation-going',[
    ['What recent event does Bob mention?','His dog’s birthday','A new job|A cancelled flight','He mentions his dog turning fourteen.','Он рассказывает о четырнадцатом дне рождения собаки.'],
    ['What did Bob do when he lived in Spain?','He ran a small bar','He studied medicine|He taught in a school','He refers to having a bar on the Costa Brava.','Он вспоминает свой небольшой бар на Коста-Браве.'],
    ['What is the function of “By the way”?','Introducing a related new topic','Ending the conversation immediately|Rejecting everything just said','Bob uses it before asking about Noelia’s hometown.','Боб так переходит к вопросу о родном городе Ноэлии.']]],
  ['B1','B1','agreement','Соглашаемся и возражаем','agreeing-disagreeing',[
    ['What initially worries Emir about the design?','It looks too simple','It is too expensive to print|It uses no circles at all','Emir sees the minimal design as overly simple.','Эмиру минималистичный дизайн кажется слишком простым.'],
    ['How do they reach agreement?','They simplify some elements together','They ignore the client’s brief|They abandon the design completely','They remove some elements while retaining interest.','Они убирают часть элементов, сохраняя интересный вид.'],
    ['What does “You’ve got a point” communicate?','Recognition of a reasonable argument','A demand to end the meeting|Complete confusion','It acknowledges that the other person’s reasoning has value.','Это признание того, что в доводе собеседника есть смысл.']]],
  ['B2','B2','challenge','Обсуждаем спорную идею','challenging-someones-ideas',[
    ['Why does Paul question the cat-video proposal?','It may not fit the agency’s purpose','Nobody can find cat videos|The company sells pet food','He questions its relevance to a branding agency.','Пол сомневается, подходит ли такая идея брендинговому агентству.'],
    ['What compromise does Emir propose?','Try it for a limited period','Buy a pet shop|Stop using social media','He suggests a short trial and checking the effect.','Эмир предлагает короткий пробный период и оценку результата.'],
    ['What does acknowledging a point before saying “but” achieve?','Respectful disagreement','Unconditional agreement|A change to a different language','It recognises part of the argument before challenging it.','Так признают разумную часть довода перед возражением.']]],
  ['B2','B2','advantages','Взвешиваем плюсы и минусы','discussing-advantages-disadvantages',[
    ['What unusual office feature is proposed?','A trampoline','A swimming pool|A cinema for clients','Noelia proposes a trampoline for a creativity space.','Ноэлия предлагает батут для творческой зоны.'],
    ['What worries Yuna?','Noise, client impressions and possible injuries','A shortage of email addresses|The lack of blue furniture','She raises practical and safety concerns.','Юна обращает внимание на шум, впечатление клиентов и травмы.'],
    ['Does Yuna give final approval?','No, she only agrees to consider it','Yes, she signs the purchase|Yes, she orders it immediately','Considering the idea is not the same as accepting it.','Согласие подумать ещё не означает согласия на покупку.']]],
  ['C1','B2','persuasion','Скрытый смысл убеждения','persuading-someone-do-something',[
    ['How does Noelia’s strategy develop?','From a tentative request to praise and personal appeal','From a formal order to a legal threat|From indifference to changing the subject','Her wording gradually increases encouragement and personal relevance.','Она постепенно усиливает убеждение: просьба, похвала, затем личная значимость помощи.'],
    ['What does Paul’s concern about credibility imply?','His reluctance includes reputational risk','He has already promised to perform|He only wants a larger payment','His reservation is not simply whether he is available.','Он опасается не только занятости, но и впечатления, которое произведёт.'],
    ['How should the ending be interpreted?','His commitment remains tentative','He has given an unconditional promise|He has explicitly refused forever','A promise to think about a request is not a definite acceptance.','Обещание подумать не равно твёрдому согласию.']]],
  ['C1','B2','problem','Подтекст непростого разговора','dealing-problem',[
    ['Why does Vanya ask to speak privately?','She is disclosing a potentially embarrassing mistake','She is announcing a public promotion|She needs a room for a party','The privacy request frames the following disclosure as sensitive.','Просьба поговорить наедине показывает деликатность признания.'],
    ['How does the information about the amount affect the exchange?','It increases the seriousness of the initial disclosure','It proves that no money was spent|It changes the purchase into a business expense','The size of the personal charge escalates the concern.','Размер личной траты усиливает серьёзность ситуации.'],
    ['What contrast drives the humour near the end?','Vanya’s relief versus Yuna’s intention to tell Noelia','A disagreement about which day it is|The discovery that the card was never used','Relief after disclosure does not mean the matter will remain private.','После признания Ваня успокаивается, но Юна намерена рассказать Ноэлии.']]]
];

export const VIDEO_LESSONS = videoRows.map(([level,sourceLevel,id,title,slug,rows]) => ({
  id:`video-${level}-${id}`,level,sourceLevel,title,kind:'video',source:'British Council',
  url:`https://learnenglish.britishcouncil.org/free-resources/speaking/${sourceLevel.toLowerCase()}/${slug}`,
  note:level === 'C1' ? 'Источник B2; вопросы C1 проверяют подтекст, намерение и аргументацию.' : 'Короткая учебная сцена. Смотри диалог, затем ответь на три вопроса.',
  verifiedAt:'2026-09-21',questions:rows.map(row=>({prompt:row[0],options:[row[1],...row[2].split('|')],answer:0,explanation:row[3],ru:row[4]}))
}));
export const MEDIA_LESSONS = [...AUDIO_LESSONS,...VIDEO_LESSONS,...VLOG_LESSONS];
