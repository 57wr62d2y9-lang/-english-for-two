// Original bilingual examples. Dictionary links attest meaning/register,
// not a frequency ranking or official CEFR placement. Levels are teaching bands.
const dictionary=slug=>'https://dictionary.cambridge.org/dictionary/english/'+slug;
const rows=[
  ['A2',"What's up?",'Как дела? Что нового?','US/UK · разговорное','what-s-up','Неформальное приветствие друзьям. В другой ситуации может означать «Что случилось?».',
    ["Hey, what's up?",'Привет, как дела?'],["What's up? You look worried.",'Что случилось? Ты выглядишь встревоженным.'],["Hi, Anna! What's up?",'Привет, Аня! Что нового?']],
  ['A2',"I'm just kidding.",'Я просто шучу.','US/UK · разговорное','kid','Поясни, что сказанное было шуткой. Не отменяет обидную фразу автоматически.',
    ["I'm just kidding. You can keep the last slice.",'Я просто шучу. Можешь забрать последний кусок.'],["Don't worry, I'm just kidding.",'Не переживай, я просто шучу.'],["I'm just kidding; I haven't sold your bike.",'Я просто шучу, я не продал твой велосипед.']],
  ['B1','hang out','проводить время вместе; тусоваться','US/UK · разговорное','hang-out','Hang out with someone — проводить время с кем-то без особого плана. Для официальной встречи лучше meet.',
    ['Do you want to hang out after class?','Хочешь провести время вместе после занятий?'],['We often hang out at this café.','Мы часто тусуемся в этом кафе.'],["Let's hang out this weekend.",'Давай встретимся и проведем время вместе на выходных.']],
  ['B1','grab a coffee','выпить кофе; встретиться за кофе','US/UK · разговорное','grab','Неформальное предложение быстро выпить кофе. Grab здесь не нужно переводить буквально как «схватить».',
    ["Let's grab a coffee before the film.",'Давай выпьем кофе перед фильмом.'],['Do you have time to grab a coffee?','У тебя есть время выпить кофе?'],["I'll grab a coffee on the way.",'Я возьму кофе по дороге.']],
  ['B1','chill','отдыхать; расслабляться','US/UK · разговорное','chill','Здесь глагол про отдых. Chill out — расслабиться; команда chill out может прозвучать резко.',
    ['I just want to chill at home tonight.','Сегодня вечером я просто хочу отдохнуть дома.'],["Let's chill by the pool.",'Давай отдохнем у бассейна.'],['We can chill here until the rain stops.','Можем отдохнуть здесь, пока дождь не закончится.']],
  ['B1','No biggie.','Ничего страшного. Не проблема.','US/UK · очень неформальное','no-biggie','Короткая дружеская реакция на мелкую неприятность. Нейтральнее: no problem; для серьезного переживания может звучать обесценивающе.',
    ['No biggie. We can catch the next train.','Ничего страшного. Поедем следующим поездом.'],['You forgot the charger? No biggie.','Забыл зарядку? Не проблема.'],['No biggie. Just send it tomorrow.','Ничего страшного. Просто отправь завтра.']],
  ['B1','Catch you later.','Увидимся позже.','US/UK · разговорное','catch','Дружеское прощание, а не буквальное обещание кого-то поймать. Нейтрально: see you later.',
    ['I need to head home. Catch you later.','Мне пора домой. Увидимся позже.'],['Catch you later. Have a good shift.','Увидимся позже. Хорошей смены.'],['Catch you later, Artur!','Увидимся позже, Артур!']],
  ['B1',"It's a bummer.",'Обидно. Вот досада.','чаще US · разговорное','bummer','Реакция на неприятность или разочарование. A bummer — неприятная ситуация; не подходит для соболезнований.',
    ["It's a bummer. The concert sold out.",'Обидно. Билеты на концерт закончились.'],["It's a bummer that you can't come.",'Жаль, что ты не можешь прийти.'],["It's a bummer, but we can try next week.",'Вот досада, но можем попробовать на следующей неделе.']],
  ['B1',"I'm knackered.",'Я совсем вымотался.','UK · сленг','knackered','Британское неформальное «очень устал». Между друзьями; нейтральный вариант для работы — I am exhausted.',
    ["I'm knackered after that long walk.",'Я совсем вымотался после той долгой прогулки.'],["I'm knackered. Let's stay in tonight.",'Я вымотался. Давай сегодня останемся дома.'],["I'm knackered, so I'm going to bed.",'Я вымотался, так что иду спать.']],
  ['B1',"I'm gutted.",'Я очень расстроен.','UK · сленг','gutted','Сильное разочарование, например отменили поездку. В США нейтральнее I am really disappointed.',
    ["I'm gutted that the trip was cancelled.",'Я очень расстроен, что поездку отменили.'],["I'm gutted. I really wanted to see that band.",'Я очень расстроен. Я правда хотел увидеть эту группу.'],["I'm gutted, but there's nothing we can do.",'Я очень расстроен, но мы ничего не можем сделать.']],
  ['B1','Cheers.','Спасибо!','UK · разговорное','cheers','Здесь cheers означает «спасибо», не тост. В США thanks понятнее; за столом cheers может означать «за нас».',
    ['Cheers. That really helped.','Спасибо! Это очень помогло.'],['Cheers for the lift.','Спасибо, что подвез.'],['Cheers. I owe you one.','Спасибо! Я у тебя в долгу.']],
  ['B1','vibe','атмосфера; ощущение от места','US/UK · разговорное','vibe','О настроении или впечатлении: a relaxed vibe. Также говорят good vibes; в официальном тексте лучше atmosphere.',
    ['This café has a relaxed vibe.','В этом кафе расслабленная атмосфера.'],['I like the vibe here.','Мне нравится здешняя атмосфера.'],['The music changes the whole vibe.','Музыка полностью меняет атмосферу.']],
  ['B1','go-to','любимый; проверенный вариант','US/UK · разговорное','go-to','Прилагательное перед существительным: my go-to place. То, что обычно выбираешь или к кому обращаешься.',
    ['This is my go-to café for breakfast.','Это мое любимое кафе для завтрака.'],['Pasta is my go-to meal when I am busy.','Когда я занят, паста — мой проверенный вариант еды.'],['She is our go-to person for travel advice.','За советами о поездках мы обычно обращаемся к ней.']],
  ['B2','low-key','слегка; втайне; без лишнего шума','US/UK · интернет-сленг','low-key','Здесь наречие в неформальном общении: I low-key want… Может смягчать признание. Low-key party как прилагательное означает спокойную, неброскую вечеринку.',
    ['I low-key want to stay home tonight.','Если честно, мне немного хочется сегодня остаться дома.'],['I low-key love this song.','Мне, честно говоря, очень нравится эта песня, хоть я и не афиширую это.'],['She was low-key excited about the surprise.','Она была рада сюрпризу, но особо этого не показывала.']],
  ['B2','ghost','внезапно перестать отвечать и общаться','US/UK · разговорное, переписка','ghost','Здесь глагол ghost someone, не «призрак». Обычно о человеке, который исчез из общения без объяснения.',
    ["Please don't ghost me after making plans.",'Пожалуйста, не пропадай без ответа после того, как мы договорились.'],["Why do people ghost instead of saying no?",'Почему люди просто перестают отвечать вместо того, чтобы сказать нет?'],["I don't want to ghost anyone; I'll reply tonight.",'Я не хочу пропадать без ответа, отвечу сегодня вечером.']],
  ['B2','red flag','тревожный сигнал; повод насторожиться','US/UK · разговорное','red-flag','Признак возможной проблемы, в том числе в общении. Не доказательство и не диагноз человеку.',
    ['Being rude to the waiter is a red flag for me.','Грубость по отношению к официанту для меня тревожный сигнал.'],['The missing contact details are a red flag.','Отсутствие контактных данных — повод насторожиться.'],["That's a red flag, not proof that he is lying.",'Это тревожный сигнал, а не доказательство того, что он лжет.']],
  ['B2','FOMO','страх упустить интересное событие','US/UK · интернет-общение','fomo','Fear of missing out. О тревоге, что другие весело проводят время без тебя, например после просмотра соцсетей.',
    ['I get FOMO when everyone posts party photos.','Мне тревожно, что я что-то упускаю, когда все выкладывают фотографии с вечеринок.'],["Don't let FOMO ruin your evening at home.",'Не позволяй страху упустить что-то испортить твой вечер дома.'],['I turned off notifications to reduce FOMO.','Я отключил уведомления, чтобы меньше переживать из-за упущенных событий.']],
  ['B2','cringe','испытывать сильную неловкость','US/UK · разговорное','cringe','Здесь глагол: I cringe when… — мне неловко, когда… В сети слово также используют как оценку неловкого контента.',
    ['I cringe when I watch my old videos.','Мне очень неловко, когда я смотрю свои старые видео.'],['That joke made me cringe.','От этой шутки мне стало неловко.'],['I still cringe at that awkward message.','Мне до сих пор неловко из-за того неудачного сообщения.']]
];
const definitions={
  'what-s-up':'a casual greeting or question about what is happening',kid:'say something as a joke',
  'hang-out':'spend time with friends without a formal plan',grab:'get a coffee or meet briefly for coffee',
  chill:'relax without doing much','no-biggie':'a minor problem that does not matter much',catch:'a casual way to say goodbye',
  bummer:'a disappointing event or situation',knackered:'very tired',gutted:'very disappointed',cheers:'a casual British way to say thank you',
  vibe:'the feeling or atmosphere of a place','go-to':'a person or choice you usually rely on',
  'low-key':'express a feeling quietly or without making it a big issue',ghost:'stop replying to someone without explaining why',
  'red-flag':'a sign that a situation may be problematic',fomo:'anxiety about missing enjoyable events',cringe:'feel embarrassed about something'
};
export const CONVERSATION_CONTENT=rows.map(([level,phrase,ru,register,slug,usageRu,...examples])=>({
  id:'talk-'+level.toLowerCase()+'-'+phrase.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''),
  level,phrase,ru,kind:phrase.split(/\s+/).length===1?'word':'phrase',pack:'conversation-2026-10',register,
  source:dictionary(slug),checkedOn:'2026-10-04',usageRu,definition:definitions[slug],
  ...(phrase==='low-key'?{accepted:['lowkey']}:{}),
  examples:examples.map(([en])=>en),exampleRu:examples.map(([,ru])=>ru)
}));

const existing={
  'no worries': ['US/UK · разговорное','no-worries','Дружеский ответ на извинение или благодарность. В серьезной ситуации лучше более сочувственный ответ.'],
  'my bad': ['US/UK · очень неформальное','my-bad','Признание небольшой собственной ошибки. Для серьезного извинения лучше I am sorry.'],
  "i’m down": ['US/UK · разговорное','down','В ответ на предложение — «я за». Без контекста может означать грустное настроение.'],
  'fair enough': ['US/UK · разговорное','fair-enough','Признать объяснение или точку зрения разумными, не обязательно полностью согласиться.'],
  'what do you reckon': ['чаще UK · разговорное','reckon','Спросить мнение. В США нейтральнее What do you think?'],
  "i haven’t got round to it": ['UK · разговорное','get-round-to','В США часто I have not gotten around to it. Смысл — пока не нашел время заняться этим.'],
  'sounds good': ['US/UK · разговорное','sound','Коротко согласиться с предложением или планом.'],
  'let’s catch up': ['US/UK · разговорное','catch-up','Встретиться или созвониться и обменяться новостями. Не путай с catch up on work — наверстать работу.']
};
const existingExamples={
  'no worries': [['No worries. We can meet tomorrow.','Ничего страшного. Можем встретиться завтра.'],['Sorry I kept you waiting. No worries.','Извини, что заставил тебя ждать. Ничего страшного.'],['No worries. You can use my charger.','Не проблема. Можешь воспользоваться моей зарядкой.']],
  'my bad': [['My bad. I sent you the wrong link.','Моя ошибка. Я отправил тебе не ту ссылку.'],['My bad. I thought we were meeting at six.','Моя ошибка. Я думал, мы встречаемся в шесть.'],['My bad. I forgot to reply.','Моя ошибка. Я забыл ответить.']],
  "i’m down": [["I'm down. Let's go for a walk.",'Я за. Давай пойдем гулять.'],["I'm down for a quiet evening at home.",'Я за спокойный вечер дома.'],["Coffee after work? I'm down.",'Кофе после работы? Я за.']],
  'fair enough': [['Fair enough. You need some rest.','Логично. Тебе нужно отдохнуть.'],["You can't make it tonight? Fair enough.",'Ты сегодня не можешь прийти? Понимаю.'],['Fair enough. We can try somewhere else.','Хорошо, понимаю. Можем попробовать другое место.']],
  'what do you reckon': [['What do you reckon? Shall we take the train?','Как думаешь? Поедем на поезде?'],['What do you reckon about this place?','Что думаешь об этом месте?'],['What do you reckon? Is it worth the money?','Как думаешь? Это стоит своих денег?']],
  "i haven’t got round to it": [["I haven't got round to it. I'll book the table tonight.",'Я пока не нашел на это время. Сегодня вечером забронирую столик.'],["I haven't got round to it yet, but it's on my list.",'Пока не нашел на это время, но это есть в моем списке.'],["I haven't got round to it because work has been busy.",'Я пока не нашел на это время, потому что на работе много дел.']],
  'sounds good': [['A walk after dinner? Sounds good.','Прогулка после ужина? Отлично.'],['Sounds good. See you at seven.','Хорошо. Увидимся в семь.'],['Sounds good. Send me the address.','Отлично. Пришли мне адрес.']],
  'let’s catch up': [["Let's catch up over coffee this weekend.",'Давай на выходных встретимся за кофе и поболтаем.'],["Let's catch up when you get back.",'Давай пообщаемся, когда ты вернешься.'],["It's been a while. Let's catch up.",'Давно не виделись. Давай пообщаемся и расскажем новости.']]
};
export function conversationalDetails(item) {
  const key=String(item.phrase).toLowerCase().replace(/[.!?…]+$/g,'').trim();
  const detail=existing[key];
  const examples=existingExamples[key];
  return detail?{...item,register:detail[0],source:dictionary(detail[1]),checkedOn:'2026-10-04',usageRu:detail[2],
    examples:examples.map(([en])=>en),exampleRu:examples.map(([,ru])=>ru)}:item;
}
