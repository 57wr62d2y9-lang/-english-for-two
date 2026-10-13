// Curated requests only. Can/could are NOT interchangeable for ability,
// possibility, past events or permission being granted.
// Cambridge English Grammar Today: can, could or may; requests.
const requestIds=new Set(`a2_001 a2_002 a2_008 a2_009 a2_011 a2_015 a2_026 a2_033 a2_050 a2_053 a2_064 a2_113 a2_126 a2_134 a2_136 a2_141 a2_144 a2_146 a2_149 a2_154 a2_160 a2_164 a2_168 a2_199 b1_005 b1_015 b1_022 b1_035 b1_038 b1_068 b1_121 b1_127 b1_163 b1_166 b1_174 b1_177 b2_040 b2_071 lex-a2-could-you-move-a-little- lex-a2-could-i-have-a-napkin- lex-a2-can-i-get-this-to-go- lex-a2-could-you-wrap-it-please- lex-a2-can-i-charge-my-phone-here- lex-a2-can-you-save-me-a-seat- lex-a2-could-you-leave-the-door-open- lex-a2-can-you-give-me-a-lift- lex-a2-could-you-speak-up-a-little-`.split(' '));
const takeawayIds=new Set(['a2_149','lex-a2-can-i-get-this-to-go-']);
export function acceptedVariants(task) {
  if(!['recall','context','write'].includes(task?.type))return [];
  const answers=[task.answer,...(task.accepted||[])].filter(x=>typeof x==='string');
  const item=task.item||{};
  if(takeawayIds.has(item.id))for(const value of [...answers]) {
    if(/\bto take away\b/i.test(value))answers.push(value.replace(/\bto take away\b/i,'to go'));
    if(/\bto go\b/i.test(value))answers.push(value.replace(/\bto go\b/i,'to take away'));
  }
  if(requestIds.has(item.id)&&!task.requiredModal)for(const value of [...answers]) {
    if(/^(can|could) (i|you|we)\b/i.test(value)&&!/\b(yesterday|last year|last week|when I was)\b/i.test(value))
      answers.push(value.replace(/^(can|could)\b/i,word=>word.toLowerCase()==='can'?'Could':'Can'));
  }
  return [...new Set(answers)];
}
export const requestVariantNote=item=>requestIds.has(item?.id)?
  `В этой просьбе подходят и can, и could: could звучит вежливее.${takeawayIds.has(item.id)?' To go (US) и to take away (UK) здесь значат «с собой».':''}`:'';
