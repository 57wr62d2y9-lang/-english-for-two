import { PHRASES as ORIGINAL_PHRASES, COLLOCATIONS, VERBS, VIDEOS } from './data.js';
import { B1_EXTRA, THIRD_EXAMPLES } from './content-extra.js';
import { A2_EXTRA } from './content-a2.js';

const fromRow = (row, id, level) => ({
  id,
  level,
  phrase: row[0],
  explanation: row[1],
  ru: row[2],
  examples: row.slice(3, 6),
  topic: row[6] || 'Everyday English',
  cloze: true,
  set: 'Everyday 100'
});

export const PHRASES = [
  ...ORIGINAL_PHRASES.map((item, index) => ({
    ...item,
    examples: [...item.examples, THIRD_EXAMPLES[index]].filter(Boolean),
    topic: item.level === 'A2' ? 'Everyday basics' : item.level === 'B1' ? 'Everyday fluency' : 'Expressing ideas',
    cloze: true,
    set: 'Everyday 100'
  })),
  ...A2_EXTRA.map((row, index) => fromRow(row, `a2_${String(index + 1).padStart(3, '0')}`, 'A2')),
  ...B1_EXTRA.map((row, index) => fromRow(row, `b1_${String(index + 1).padStart(3, '0')}`, 'B1'))
];

export const AVAILABLE_BY_LEVEL = Object.fromEntries(['A2', 'B1', 'B2', 'C1'].map(level => [level, PHRASES.filter(item => item.level === level).length]));
export { COLLOCATIONS, VERBS, VIDEOS };

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
