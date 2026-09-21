// Public creator videos. Original questions, not copied worksheet exercises.
// Only links are stored; video and full transcript remain with the publisher.
const rows = [
  ['B1','london','Прогулка по Лондону','day-around-london','ihC-1DJG7cw',[
    ['Why choose the bus instead of the Tube?','To enjoy the sights along the route','To avoid buying a ticket|Because the Tube was closed','The choice was about sightseeing, not speed.','Из автобуса можно рассматривать город.'],
    ['What limited the view from the observation wheel?','Fog','A broken window|Heavy snow','Visibility was poor because of the weather.','Обзор закрывал туман.'],
    ['How does Sophia feel about the day overall?','Positive despite the weather','Disappointed with every activity|Angry about missing a flight','Bad visibility did not spoil the whole experience.','Несмотря на погоду, прогулка ей понравилась.']]],
  ['B2','berlin','Два дня в Берлине','taste-berlin','7xIFcg4MPP4',[
    ['What is the purpose of Urban Spree in this account?','Supporting the local graffiti culture','Replacing street art with advertisements|Providing airport transfers','The visitors describe a space for preserving local street art.','Это место помогает сохранять местное уличное искусство.'],
    ['How do they explore the city on day two?','With a guided walk','On a river cruise|In a hired car','They learn about historical sites on foot with a guide.','Они идут на пешеходную экскурсию.'],
    ['Which description best fits their account?','Personal impressions mixed with a travel recommendation','A complete comparison of hotel prices|A warning to avoid the entire city','They combine reactions to the city with a suggestion for visitors.','Личные впечатления сочетаются с советом туристам.']]],
  ['C1','manchester','Выходные в Манчестере','weekend-manchester','S5fl830XHm8',[
    ['Why is eating outdoors presented as noteworthy?','It contrasts with expectations for November weather','Outdoor cafés are normally illegal|The friends had never eaten together','The season makes the pleasant outdoor meal less expected.','Для ноября такая погода неожиданно приятна.'],
    ['What changes in the final section of the narration?','A retrospective update replaces the on-location account','A new speaker contradicts every detail|The trip becomes a fictional story','The speaker is home and reports what happened afterwards.','Она уже дома и рассказывает, чем закончилась поездка.'],
    ['Which conclusion would go beyond the evidence?','Everyone would enjoy exactly the same itinerary','The speaker enjoyed the visit|The visit included a museum','One positive personal account does not establish a universal preference.','Личные впечатления не доказывают, что маршрут понравится всем.']]],
];
export const VLOG_LESSONS=rows.map(([level,slug,title,path,youtubeId,questions])=>({
  id:`vlog-${level}-${slug}`,level,sourceLevel:level,title,kind:'video',format:'vlog',youtubeId,
  source:'British Council · YouTuber zone',url:`https://www.youtube.com/watch?v=${youtubeId}`,
  transcriptUrl:`https://learnenglishteens.britishcouncil.org/study-break/youtubers/${path}`,
  note:'Короткий влог целиком. Слушай в наушниках; затем — три вопроса и ответ про себя.',verifiedAt:'2026-09-21',
  questions:questions.map(([prompt,answer,alternatives,explanation,ru])=>({prompt,options:[answer,...alternatives.split('|')],answer:0,explanation,ru})),
}));
