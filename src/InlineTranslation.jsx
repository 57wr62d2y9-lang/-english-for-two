import React,{useEffect,useRef,useState} from 'react';
import {translateToRussian} from './translation.js';

export function TranslateButton({text,ru='',label='Показать перевод предложения',onHint,auto=false}) {
  const key=`${text}\u0000${ru}`;
  const current=useRef(key);current.current=key;
  const alive=useRef(true);
  const [state,setState]=useState({key,value:'',loading:false,error:false});
  const visible=state.key===key?state:{value:'',loading:false,error:false};
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  async function translate() {
    const requestKey=key;onHint?.();setState({key,value:'',loading:true,error:false});
    try {
      const value=ru || await translateToRussian(text);
      if(alive.current&&current.current===requestKey)setState({key:requestKey,value,loading:false,error:false});
    } catch {
      if(alive.current&&current.current===requestKey)setState({key:requestKey,value:'',loading:false,error:true});
    }
  }
  useEffect(()=>{if(auto&&text)translate();},[key,auto]);
  if(!text)return null;
  return <div className="optionalTranslation" aria-live="polite">{visible.value?<p lang="ru">{visible.value}</p>:<><button type="button" onClick={translate} disabled={visible.loading}>{visible.loading?'Загружаю перевод…':visible.error?'Повторить перевод':label}</button>{visible.error&&<small role="status">Сервис перевода пока недоступен. Сохранённые переводы и встроенные примеры работают без интернета.</small>}</>}</div>;
}
