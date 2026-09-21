// Short diagnostic tasks for grammar that matters in real communication.
// They use the same SRS records as phrases, but never count as CEFR route units.
// A correct answer schedules a later check; an error raises the weakness score
// and makes that distinction more likely to return in a future mixed session.
export const GRAMMAR_TASKS = [
  {
    id:'gr_a2_past_present', level:'A2', tag:'past-vs-present-perfect',
    title:'Past Simple or Present Perfect',
    prompt:'I _____ the email yesterday afternoon.',
    options:['sent','have sent','send','have send'], answer:'sent',
    explanation:'“Yesterday afternoon” is a finished past time, so use Past Simple.',
    examples:['I sent it yesterday.','I have already sent it.']
  },
  {
    id:'gr_a2_future', level:'A2', tag:'future-forms',
    title:'Plan or decision now',
    prompt:'We bought the tickets yesterday. We _____ fly on Friday.',
    options:['are going to','will just','have','were'], answer:'are going to',
    explanation:'The tickets show an existing plan, so “be going to” is natural.',
    examples:['We are going to fly on Friday.','I’ll answer the phone.']
  },
  {
    id:'gr_a2_articles', level:'A2', tag:'articles',
    title:'Articles in a real situation',
    prompt:'Could you open _____ window next to you?',
    options:['the','a','an','—'], answer:'the',
    explanation:'Both speakers can identify the particular window, so use “the”.',
    examples:['Open the window next to you.','We need a taxi.']
  },
  {
    id:'gr_a2_countable', level:'A2', tag:'countable-nouns',
    title:'Much or many',
    prompt:'How _____ time do we have before the train?',
    options:['much','many','few','several'], answer:'much',
    explanation:'“Time” is uncountable in this meaning, so use “much”.',
    examples:['How much time do we have?','How many bags are there?']
  },
  {
    id:'gr_b1_conditionals', level:'B1', tag:'conditionals',
    title:'Real future condition',
    prompt:'If we leave now, we _____ the last bus.',
    options:['will catch','would catch','caught','would have caught'], answer:'will catch',
    explanation:'This is a realistic future possibility: if + Present Simple, will + verb.',
    examples:['If we leave now, we’ll catch it.','If I had more time, I’d walk.']
  },
  {
    id:'gr_b1_deduction', level:'B1', tag:'modal-deduction',
    title:'Deduction from evidence',
    prompt:'Her car is outside, so she _____ be in the office.',
    options:['must','can’t','should have','would'], answer:'must',
    explanation:'“Must” expresses a strong conclusion based on present evidence.',
    examples:['She must be inside.','That can’t be the correct address.']
  },
  {
    id:'gr_b1_gerund', level:'B1', tag:'gerund-infinitive',
    title:'Gerund or infinitive',
    prompt:'I decided _____ the train instead of driving.',
    options:['to take','taking','take','to taking'], answer:'to take',
    explanation:'“Decide” is followed by to + infinitive.',
    examples:['I decided to wait.','I avoid driving at night.']
  },
  {
    id:'gr_b1_passive', level:'B1', tag:'passive',
    title:'Passive result',
    prompt:'The meeting _____ to Friday because the manager is away.',
    options:['was moved','moved','has moving','is move'], answer:'was moved',
    explanation:'The meeting receives the action, so use be + past participle.',
    examples:['The meeting was moved.','Your order has been sent.']
  },
  {
    id:'gr_b1_reported', level:'B1', tag:'reported-speech',
    title:'Reported speech',
    prompt:'Anna said she _____ tired after the journey.',
    options:['was','is being','has','will'], answer:'was',
    explanation:'When reporting a past statement later, “am/is” normally shifts to “was”.',
    examples:['She said she was tired.','He told me the train had left.']
  },
  {
    id:'gr_b2_used_to', level:'B2', tag:'used-to-family',
    title:'Used to, be used to, get used to',
    prompt:'I’m still getting used to _____ meetings in English.',
    options:['leading','lead','have led','led'], answer:'leading',
    explanation:'After “get used to”, “to” is a preposition, so use a noun or -ing form.',
    examples:['I used to work nights.','I’m used to working late.']
  },
  {
    id:'gr_b2_contrast', level:'B2', tag:'linking-contrast',
    title:'Although, despite, however',
    prompt:'_____ the delay, we arrived before the meeting started.',
    options:['Despite','Although','However','Even'], answer:'Despite',
    explanation:'“Despite” is followed by a noun or -ing form; “although” needs a clause.',
    examples:['Despite the delay, we arrived.','Although it was late, we continued.']
  },
  {
    id:'gr_b2_third_conditional', level:'B2', tag:'third-conditional',
    title:'Alternative past',
    prompt:'If we had checked the date, we _____ the wrong flight.',
    options:["wouldn’t have booked","won’t book","wouldn’t book","hadn’t booked"], answer:"wouldn’t have booked",
    explanation:'An unreal past result uses would have + past participle.',
    examples:['If we had left earlier, we would have caught it.','If I had known, I would have called.']
  },
  {
    id:'gr_b2_relative', level:'B2', tag:'relative-clauses',
    title:'Extra information clause',
    prompt:'The report, _____ was published yesterday, confirms the trend.',
    options:['which','that','what','where'], answer:'which',
    explanation:'A non-defining clause after a comma uses “which”, not “that”.',
    examples:['The report, which was published yesterday, is useful.','The report that I sent is useful.']
  },
  {
    id:'gr_c1_inversion', level:'C1', tag:'inversion',
    title:'Emphatic inversion',
    prompt:'Rarely _____ such a clear explanation of the problem.',
    options:['have I heard','I have heard','did I have heard','I heard'], answer:'have I heard',
    explanation:'A negative adverb at the front triggers auxiliary–subject inversion.',
    examples:['Rarely have I seen this happen.','Only then did we understand.']
  },
  {
    id:'gr_c1_cleft', level:'C1', tag:'cleft-sentences',
    title:'Focus with a cleft sentence',
    prompt:'What we need _____ a clear decision, not another meeting.',
    options:['is','are','be','being'], answer:'is',
    explanation:'The whole “what” clause is treated as one idea here, so the complement takes “is”.',
    examples:['What we need is more time.','It was Anna who noticed the error.']
  },
  {
    id:'gr_c1_participle', level:'C1', tag:'participle-clauses',
    title:'Participle clause',
    prompt:'_____ all the available evidence, the committee postponed its decision.',
    options:['Having reviewed','Reviewed','To reviewing','Has reviewed'], answer:'Having reviewed',
    explanation:'“Having + past participle” shows that the review was completed before the decision.',
    examples:['Having checked the figures, we approved the budget.','Faced with new evidence, they paused.']
  }
];

export function grammarForLevel(level, levels = ['A2','B1','B2','C1']) {
  const position = levels.indexOf(level);
  return GRAMMAR_TASKS.filter(task => levels.indexOf(task.level) <= position);
}
