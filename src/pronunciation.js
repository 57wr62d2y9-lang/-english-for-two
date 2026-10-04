export function englishVoice(voices=[],accent='en-US') {
  const english=voices.filter(voice=>/^en(?:[-_]|$)/i.test(voice.lang));
  const normal=lang=>String(lang).replace('_','-').toLowerCase();
  return english.find(voice=>normal(voice.lang)===normal(accent)&&voice.localService)
    || english.find(voice=>normal(voice.lang)===normal(accent))
    || english.find(voice=>voice.default) || english[0] || null;
}
