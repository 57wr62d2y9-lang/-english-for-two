import React,{useEffect,useRef,useState} from 'react';
import {englishVoice} from './pronunciation.js';

export default function PronunciationButton({text,preferredAccent='en-US'}) {
  const [accent,setAccent]=useState(preferredAccent),[playing,setPlaying]=useState(false),[message,setMessage]=useState('');
  const utterance=useRef(null),voices=useRef([]);
  const synth=globalThis.speechSynthesis,Utterance=globalThis.SpeechSynthesisUtterance;
  const supported=Boolean(synth&&Utterance);
  function stop(){const active=utterance.current;utterance.current=null;if(active){active.onend=null;active.onerror=null;active.onstart=null;synth?.cancel();}setPlaying(false);}
  useEffect(()=>{
    function refresh(){try{voices.current=synth?.getVoices?.()||[];}catch{voices.current=[];}}
    function hidden(){if(globalThis.document?.hidden)stop();}
    refresh();synth?.addEventListener?.('voiceschanged',refresh);globalThis.document?.addEventListener?.('visibilitychange',hidden);
    return()=>{synth?.removeEventListener?.('voiceschanged',refresh);globalThis.document?.removeEventListener?.('visibilitychange',hidden);
      const active=utterance.current;utterance.current=null;if(active){active.onend=null;active.onerror=null;active.onstart=null;synth?.cancel();}};
  },[synth,text]);
  function play(){
    if(utterance.current){stop();return;}
    if(!supported)return;
    setMessage('');
    try {
      const speech=new Utterance(String(text).replace(/[.…]+$/,''));
      const available=synth.getVoices?.()||voices.current,voice=englishVoice(available.length?available:voices.current,accent);
      speech.lang=voice?.lang||accent;if(voice)speech.voice=voice;
      if(voice&&voice.lang.replace('_','-').toLowerCase()!==accent.toLowerCase())setMessage('Выбранного акцента нет среди голосов устройства. Используется доступный английский голос.');
      speech.rate=.85;speech.volume=1;speech.pitch=1;
      speech.onstart=()=>{if(utterance.current===speech)setPlaying(true);};
      speech.onend=()=>{if(utterance.current===speech){utterance.current=null;setPlaying(false);}};
      speech.onerror=event=>{if(utterance.current!==speech)return;utterance.current=null;setPlaying(false);
        if(!['canceled','interrupted'].includes(event.error))setMessage('Не удалось включить звук. Проверь громкость и попробуй еще раз.');};
      synth.cancel();utterance.current=speech;setPlaying(true);synth.speak(speech);
    } catch {utterance.current=null;setPlaying(false);setMessage('Озвучивание недоступно в этом браузере.');}
  }
  return <div className="pronunciation"><div className="pronunciationControls"><button type="button" className="soundButton" onClick={play} disabled={!supported} aria-label={playing?'Остановить произношение':'Послушать произношение'} aria-pressed={playing}>
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z"/>{playing?<path d="M16 9v6m4-6v6"/>:<><path d="M15 8a6 6 0 0 1 0 8"/><path d="M18 5a10 10 0 0 1 0 14"/></>}</svg><span>{playing?'Стоп':'Послушать'}</span></button>
    <div className="accentChoice" aria-label="Акцент произношения">{[['en-US','US','Американский'],['en-GB','UK','Британский']].map(([lang,label,title])=><button type="button" key={lang} aria-label={title+' акцент'} aria-pressed={accent===lang} onClick={()=>{stop();setAccent(lang);setMessage('');}}>{label}</button>)}</div></div>
    {(!supported||message)&&<small role="status">{message||'Озвучивание недоступно в этом браузере.'}</small>}
  </div>;
}
