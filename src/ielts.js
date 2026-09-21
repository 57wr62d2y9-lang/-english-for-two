// All prompts and passages below were written specifically for English for Two.
// They imitate public IELTS task formats, not copyrighted test-book questions.
export const IELTS_SKILLS = ['Listening', 'Reading', 'Writing', 'Speaking'];

export const IELTS_READING_TASKS = [
  {
    id:'ielts-read-1', mode:'Both', skill:'Reading', taskType:'True / False / Not Given',
    title:'A quieter morning commute', minutes:4,
    passage:'A regional bus company tested a quiet zone on twelve early-morning services. Passengers in the first four rows were asked not to make phone calls or play audio without headphones. After six weeks, 68 per cent of surveyed passengers wanted the trial to continue. The company has not yet decided whether the rule will be introduced on evening routes.',
    question:'The quiet-zone rule already applies to evening buses.',
    options:['True','False','Not Given'], answer:'False',
    explanation:'The text says the company has not decided about evening routes, so the statement contradicts the passage.'
  },
  {
    id:'ielts-read-2', mode:'Academic', skill:'Reading', taskType:'Matching heading',
    title:'Cooling cities with trees', minutes:4,
    passage:'Street trees cool cities in two ways. Their leaves block part of the sun’s energy before it reaches roads and buildings. Trees also release water vapour, which cools the surrounding air. However, planners must choose species carefully because roots can damage pavements and some trees need more water than a dry city can provide.',
    question:'Choose the best heading.',
    options:['Why one solution requires careful planning','The history of urban parks','Why all cities need the same tree','A cheap replacement for public transport'], answer:'Why one solution requires careful planning',
    explanation:'The paragraph explains benefits and then the practical limits planners must consider.'
  },
  {
    id:'ielts-read-3', mode:'General', skill:'Reading', taskType:'Short answer',
    title:'Community gym notice', minutes:3,
    passage:'The Riverside Community Gym will close at 6 p.m. on Friday for electrical maintenance. Members may use the North Street branch at no extra cost. Please show your membership card at reception. Normal opening hours will resume on Saturday morning.',
    question:'What must members show at the alternative branch?',
    options:['A membership card','A passport','A payment receipt','A medical form'], answer:'A membership card',
    explanation:'The notice directly says to show a membership card at reception.'
  }
];

export const IELTS_LISTENING_TASKS = [
  {
    id:'ielts-listen-1', mode:'Both', skill:'Listening', taskType:'Multiple choice',
    title:'A team makes a decision', minutes:5,
    source:'British Council',
    url:'https://learnenglish.britishcouncil.org/free-resources/listening/b1/making-decision',
    instruction:'Listen once without the transcript. Then answer the question.',
    question:'Which approach does the team finally choose?',
    options:['Start the first stage while planning later stages','Wait until every detail is complete','Cancel the project','Ask another team to decide'], answer:'Start the first stage while planning later stages',
    explanation:'Listen for the final group decision, not only the objections raised earlier.'
  },
  {
    id:'ielts-listen-2', mode:'Both', skill:'Listening', taskType:'Note completion',
    title:'Changing a meeting time', minutes:4,
    source:'British Council',
    url:'https://learnenglish.britishcouncil.org/free-resources/listening/a2/changing-meeting-time',
    instruction:'Listen for the requested change and complete the note.',
    question:'New meeting time: _____.',
    options:['9:00','10:00','11:00','12:00'], answer:'9:00',
    explanation:'Numbers and corrected details are common traps in completion tasks.'
  }
];

export const IELTS_WRITING_TASKS = [
  {
    id:'ielts-write-a1', mode:'Academic', skill:'Writing', taskType:'Academic Task 1 planning',
    title:'Remote-work survey', minutes:8, words:'Plan only · full task: 150+ words',
    prompt:'A company survey compares the percentage of staff working remotely in four departments in 2024 and 2026. Plan an introduction, a clear overview and two comparison paragraphs.',
    checklist:['Paraphrase the task','State two main trends in the overview','Group similar departments','Compare figures instead of listing everything'],
    structure:'Introduction → overview → strongest comparisons → remaining comparisons.'
  },
  {
    id:'ielts-write-g1', mode:'General', skill:'Writing', taskType:'General Task 1 planning',
    title:'Letter about a damaged delivery', minutes:8, words:'Plan only · full task: 150+ words',
    prompt:'You received a damaged appliance from an online shop. Plan a letter explaining what you ordered, describing the damage and stating what action you want.',
    checklist:['Choose a formal tone','Cover all three bullet points','Make the requested solution specific','Use a clear closing'],
    structure:'Purpose → order details → problem → requested action → polite closing.'
  },
  {
    id:'ielts-write-2', mode:'Both', skill:'Writing', taskType:'Task 2 planning',
    title:'Public transport or roads?', minutes:10, words:'Plan only · full task: 250+ words',
    prompt:'Some people think cities should spend more on public transport than on new roads. To what extent do you agree or disagree?',
    checklist:['Take a clear position','Plan two distinct main ideas','Add a specific example to each idea','Check that the conclusion matches the position'],
    structure:'Introduction + position → main idea 1 → main idea 2 → conclusion.'
  }
];

export const IELTS_SPEAKING_TASKS = [
  {
    id:'ielts-speak-1', mode:'Both', skill:'Speaking', taskType:'Part 1',
    title:'Daily travel', minutes:3,
    questions:['How do you usually travel to work or study?','What do you like about that journey?','Would you change anything about public transport in your area?'],
    checklist:['Answer directly','Add one reason or example','Avoid memorised long speeches']
  },
  {
    id:'ielts-speak-2', mode:'Both', skill:'Speaking', taskType:'Part 2',
    title:'A useful skill you learned', minutes:3,
    prompt:'Describe a useful skill you learned. Say what it is, why you learned it, how you practised it and how it helps you now.',
    checklist:['Prepare for 1 minute','Speak for up to 2 minutes','Use a past story plus the present result','Link ideas with clear sequencing']
  },
  {
    id:'ielts-speak-3', mode:'Both', skill:'Speaking', taskType:'Part 3',
    title:'Learning throughout life', minutes:4,
    questions:['Why do some adults stop learning new skills?','Should employers give staff time to study?','How might education change in the next twenty years?'],
    checklist:['Give an opinion','Explain why','Consider another side','Use an example where useful']
  }
];

export const IELTS_TASKS = [...IELTS_LISTENING_TASKS, ...IELTS_READING_TASKS, ...IELTS_WRITING_TASKS, ...IELTS_SPEAKING_TASKS];

export function tasksForMode(mode, skill) {
  return IELTS_TASKS.filter(task => task.skill === skill && (task.mode === 'Both' || task.mode === mode));
}
