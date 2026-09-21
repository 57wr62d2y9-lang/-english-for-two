import { PHRASES as ORIGINAL_PHRASES, COLLOCATIONS as ORIGINAL_COLLOCATIONS, VERBS, VIDEOS } from './data.js';
import { B1_EXTRA, THIRD_EXAMPLES } from './content-extra.js';
import { A2_EXTRA } from './content-a2.js';
import { A2_BLOCK_2 } from './content-a2-2.js';
import { B1_BLOCK_2 } from './content-b1-2.js';
import { PHRASE_VARIATIONS, PHRASE_VIDEO_REFS } from './enrichment.js';

const fromRow = (row, id, level, set = 'Everyday 100') => ({
  id,
  level,
  phrase: row[0],
  explanation: row[1],
  ru: row[2],
  examples: row.slice(3, 6),
  topic: row[6] || 'Everyday English',
  cloze: true,
  set,
  variations: PHRASE_VARIATIONS[row[0]] || [],
  topics: [row[6] || 'Everyday English'],
  grammarTags: [],
  videoRefs: PHRASE_VIDEO_REFS[row[0]] || []
});

export const PHRASES = [
  ...ORIGINAL_PHRASES.map((item, index) => ({
    ...item,
    examples: [...item.examples, THIRD_EXAMPLES[index]].filter(Boolean),
    topic: item.level === 'A2' ? 'Everyday basics' : item.level === 'B1' ? 'Everyday fluency' : 'Expressing ideas',
    cloze: true,
    set: 'Everyday 100',
    variations: PHRASE_VARIATIONS[item.phrase] || [],
    topics: [item.level === 'A2' ? 'Everyday basics' : item.level === 'B1' ? 'Everyday fluency' : 'Expressing ideas'],
    grammarTags: [],
    videoRefs: PHRASE_VIDEO_REFS[item.phrase] || []
  })),
  ...A2_EXTRA.map((row, index) => fromRow(row, `a2_${String(index + 1).padStart(3, '0')}`, 'A2')),
  ...B1_EXTRA.map((row, index) => fromRow(row, `b1_${String(index + 1).padStart(3, '0')}`, 'B1')),
  ...A2_BLOCK_2.map((row, index) => fromRow(row, `a2_${String(index + 101).padStart(3, '0')}`, 'A2', 'Everyday 200')),
  ...B1_BLOCK_2.map((row, index) => fromRow(row, `b1_${String(index + 101).padStart(3, '0')}`, 'B1', 'Everyday 200'))
];

export const AVAILABLE_BY_LEVEL = Object.fromEntries(['A2', 'B1', 'B2', 'C1'].map(level => [level, PHRASES.filter(item => item.level === level).length]));
export { VERBS, VIDEOS };

const ORIGINAL_COLLOCATION_EXAMPLES = {
  c1: ['We need to deal with this issue today.', 'She deals with customer complaints calmly.', 'Let’s deal with the urgent problem first.'],
  c2: ['I’d like to raise an issue at the meeting.', 'Nobody raised the issue of cost.', 'She raised a serious safety concern.'],
  c3: ['You need to make an effort to practise.', 'He made a real effort to arrive on time.', 'Even a small daily effort makes a difference.'],
  c4: ['We finally came to a decision.', 'The team must come to a decision today.', 'They discussed it for hours before reaching a decision.'],
  c5: ['Please take the extra cost into account.', 'We forgot to take traffic into account.', 'Your experience will be taken into account.'],
  c6: ['Keep the deadline in mind.', 'I’ll keep your advice in mind.', 'Keep in mind that prices may change.'],
  c7: ['We’re running out of time.', 'The car ran out of fuel.', 'I ran out of ideas halfway through.'],
  c8: ['We can work something out together.', 'Did you work out what went wrong?', 'I’m sure they’ll work out a solution.'],
  c9: ['Why did you bring that up now?', 'She brought up an interesting point.', 'I didn’t want to bring up the argument again.'],
  c10: ['The project is getting back on track.', 'A clear plan helped us get back on track.', 'After the holiday, I need to get my routine back on track.'],
  c11: ['A short walk can make a difference.', 'Your support made a huge difference.', 'Will one small change really make a difference?'],
  c12: ['Don’t take her help for granted.', 'We often take clean water for granted.', 'He felt that his work was being taken for granted.']
};

const EXTRA_COLLOCATIONS = [
  ['ca2_1','A2','have breakfast','eat the morning meal','завтракать',['I usually have breakfast at seven.','Let’s have breakfast before we leave.','She didn’t have time for breakfast.']],
  ['ca2_2','A2','take a break','stop briefly to rest','сделать перерыв',['Let’s take a short break.','I need to take a break from the screen.','We took a break after an hour.']],
  ['ca2_3','A2','make a mistake','do something incorrectly','совершить ошибку',['Everyone makes mistakes.','I made a mistake in the address.','Don’t worry if you make a small mistake.']],
  ['ca2_4','A2','catch a bus','get on a bus before it leaves','успеть на автобус',['We need to catch the eight o’clock bus.','I ran to catch the last bus.','Did Anna catch the bus?']],
  ['ca2_5','A2','get ready','prepare yourself','собираться / подготовиться',['I need ten minutes to get ready.','Get ready — the taxi is here.','We got ready for work together.']],
  ['ca2_6','A2','feel better','be healthier or happier','чувствовать себя лучше',['I hope you feel better soon.','A good sleep made me feel better.','Do you feel any better today?']],
  ['cb2_1','B2','draw a conclusion','form an opinion from evidence','сделать вывод',['It is too early to draw a conclusion.','What conclusion can we draw from the data?','She drew the wrong conclusion from his silence.']],
  ['cb2_2','B2','meet a deadline','finish work by the required time','уложиться в срок',['We worked late to meet the deadline.','Can the team meet Friday’s deadline?','Extra help allowed us to meet the deadline.']],
  ['cb2_3','B2','reach an agreement','agree after discussion','достичь соглашения',['Both sides finally reached an agreement.','We hope to reach an agreement today.','They failed to reach an agreement on price.']],
  ['cb2_4','B2','address a concern','respond to a worry or problem','рассмотреть проблему',['The new plan addresses our main concern.','Could you address this concern in the report?','Management has not yet addressed staff concerns.']],
  ['cb2_5','B2','weigh up the options','compare choices carefully','взвесить варианты',['We need time to weigh up the options.','She weighed up both offers before deciding.','Let’s weigh up the risks and benefits.']],
  ['cc1_1','C1','pose a challenge','create a difficult problem','создавать сложность',['The tight schedule poses a serious challenge.','Remote work can pose new management challenges.','This requirement should not pose a problem.']],
  ['cc1_2','C1','strike a balance','find a fair middle position','найти баланс',['We need to strike a balance between speed and quality.','She struggles to strike a healthy work-life balance.','The policy strikes a reasonable balance.']],
  ['cc1_3','C1','shed light on','help explain something unclear','пролить свет на',['The report sheds light on the cause of the delay.','New evidence may shed light on what happened.','The interview sheds little light on his decision.']],
  ['cc1_4','C1','bear in mind','remember an important fact','принимать во внимание',['Bear in mind that the figures are provisional.','We should bear the long-term cost in mind.','Please bear in mind that conditions may change.']]
];

export const COLLOCATIONS = [
  ...EXTRA_COLLOCATIONS.filter(row => row[1] === 'A2').map(row => ({ id:row[0], level:row[1], phrase:row[2], explanation:row[3], ru:row[4], examples:row[5], cloze:true })),
  ...ORIGINAL_COLLOCATIONS.map(item => ({ ...item, level:'B1', examples:ORIGINAL_COLLOCATION_EXAMPLES[item.id], cloze:true })),
  ...EXTRA_COLLOCATIONS.filter(row => row[1] !== 'A2').map(row => ({ id:row[0], level:row[1], phrase:row[2], explanation:row[3], ru:row[4], examples:row[5], cloze:true }))
];

export const RULES = [
  { id:'r1', level:'A2', title:'Past Simple or Present Perfect?', summary:'Finished time uses Past Simple. Life experience or a result connected to now often uses Present Perfect.', examples:['I saw her yesterday.','I’ve already sent the email.'], note:'Words such as yesterday and last week normally close the time period.' },
  { id:'r2', level:'A2', title:'Plans and predictions', summary:'Use be going to for intentions or visible evidence; will for a decision made now, an offer, or a neutral prediction.', examples:['We’re going to leave early.','I’ll carry that bag for you.'], note:'For a fixed arrangement, Present Continuous is common: I’m meeting Anna at seven.' },
  { id:'r3', level:'B1', title:'First and second conditionals', summary:'The first conditional describes a realistic future possibility. The second describes an imagined or less likely situation.', examples:['If we leave now, we’ll catch the bus.','If I had more time, I’d learn another language.'], note:'Do not put will after if in these standard patterns.' },
  { id:'r4', level:'B1', title:'Modal verbs for deduction', summary:'Use must when evidence makes something very likely, might or could for possibility, and can’t when evidence makes it impossible.', examples:['She must be at work; her car is outside.','That can’t be the right address.'], note:'For the past: must have, might have, can’t have + past participle.' },
  { id:'r5', level:'B1', title:'Gerund or infinitive', summary:'Some verbs are followed by -ing, others by to + verb. A few change meaning depending on the pattern.', examples:['I avoid driving at night.','I decided to take the train.'], note:'Remember doing = recall a memory. Remember to do = do not forget a task.' },
  { id:'r6', level:'B1', title:'Defining relative clauses', summary:'Who describes people, which describes things, and that can often replace either in a defining clause.', examples:['The colleague who helped me has left.','This is the file that I mentioned.'], note:'You can omit the relative pronoun when it is the object: The film we watched was excellent.' },
  { id:'r7', level:'B1', title:'Passive voice', summary:'Use be + past participle when the action or result matters more than the person who performs it.', examples:['The meeting was moved to Friday.','Your order has been sent.'], note:'Mention the agent with by only when that information is useful.' },
  { id:'r8', level:'B1', title:'Reported speech', summary:'When reporting later, tense and time words often move back to match the new viewpoint.', examples:['She said she was tired.','He told me the meeting had been cancelled.'], note:'Tell normally needs a person; say does not: she told me, she said that.' },
  { id:'r9', level:'B2', title:'Past habits and adaptation', summary:'Used to describes a past state or habit. Be used to means something is familiar. Get used to means become familiar.', examples:['I used to work nights.','I’m getting used to the new schedule.'], note:'After be/get used to, use a noun or -ing form.' },
  { id:'r10', level:'B2', title:'Linking and contrast', summary:'Use although within one sentence, despite before a noun or -ing form, and however to connect separate statements.', examples:['Although it was late, we continued.','Despite the delay, we arrived on time.'], note:'That being said is a conversational way to add a balancing point.' },
  { id:'r11', level:'B2', title:'Third and mixed conditionals', summary:'The third conditional imagines a different past. A mixed conditional connects an unreal past cause to a present result.', examples:['If we had left earlier, we would have caught it.','If I had accepted the job, I would live there now.'], note:'These patterns express hindsight, regret, or an alternative outcome.' },
  { id:'r12', level:'C1', title:'Emphasis and inversion', summary:'Negative or restrictive expressions can move to the front, followed by auxiliary–subject inversion.', examples:['Rarely have I seen such a clear result.','Only then did we understand the problem.'], note:'Use this selectively; it sounds formal and strongly emphatic.' }
];

export const LISTENING_LESSONS = [
  {
    id:'listen-a2', level:'A2', title:'Changing a meeting time', source:'British Council',
    url:'https://learnenglish.britishcouncil.org/free-resources/listening/a2/changing-meeting-time',
    note:'A short practical conversation. Open the human recording, complete its preparation, then answer here.',
    questions:[
      { prompt:'What change does Lucy request?', options:['Move the meeting from eleven to nine','Move the meeting from nine to eleven','Cancel the meeting'], answer:0 },
      { prompt:'Why is the earlier time useful for Lucy?', options:['She has another important meeting later','She wants to leave the company','She has not prepared an agenda'], answer:0 }
    ]
  },
  {
    id:'listen-b1a', level:'B1', title:'Making a decision', source:'British Council',
    url:'https://learnenglish.britishcouncil.org/free-resources/listening/b1/making-decision',
    note:'A team discusses how to begin a project and reaches a majority decision.',
    questions:[
      { prompt:'Which approach does the team choose?', options:['Begin the first stage while planning later stages','Wait until every detail is complete','Cancel the project'], answer:0 },
      { prompt:'How does David respond at the end?', options:['He accepts the decision but asks for extra time','He leaves the project','He says there is no risk'], answer:0 }
    ]
  },
  {
    id:'listen-b1b', level:'B1', title:'A team meeting about diversity', source:'British Council',
    url:'https://learnenglish.britishcouncil.org/free-resources/listening/b1/team-meeting-about-diversity',
    note:'A workplace discussion about an inclusive charter and practical next steps.',
    questions:[
      { prompt:'What does Nina want staff to help create?', options:['Inclusive guidelines','A sales forecast','A travel policy'], answer:0 },
      { prompt:'What task does Stefano take?', options:['Find a trainer','Book the venue','Write the final report'], answer:0 }
    ]
  },
  {
    id:'listen-b2', level:'B2', title:'A digital detox podcast', source:'British Council',
    url:'https://learnenglish.britishcouncil.org/free-resources/listening/b2/digital-detox-podcast',
    note:'Listen for the speakers’ reasons, evidence, and contrasting opinions rather than every word.',
    questions:[
      { prompt:'What was Amanda’s first practical change?', options:['She turned off most notifications','She sold her phone','She stopped using email at work'], answer:0 },
      { prompt:'What longer detox do Amanda and her partner plan?', options:['A full week in summer','One hour next month','A year without the internet'], answer:0 }
    ]
  },
  {
    id:'listen-c1', level:'C1', title:'A project management meeting', source:'British Council',
    url:'https://learnenglish.britishcouncil.org/free-resources/listening/c1/project-management-meeting',
    note:'Focus on implied agreement, disagreement, priorities, and how speakers manage the meeting.',
    questions:[
      { prompt:'Who agrees to lead the customer questionnaire?', options:['Akiko','John','Matteo'], answer:0 },
      { prompt:'How does the team free Matteo’s time for the designs?', options:['Barbara temporarily helps with his regular work','They cancel the customer survey','John removes Matteo from the project'], answer:0 }
    ]
  }
];
