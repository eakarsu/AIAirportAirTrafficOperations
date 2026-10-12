import {useEffect,useRef,useState}from'react';
export default function useNativeAIRequest(onCancel){
 const active=useRef(null),cancelled=useRef(onCancel),[notice,setNotice]=useState('');cancelled.current=onCancel;
 useEffect(()=>()=>{active.current?.controller.abort();active.current=null;},[]);
 const isCurrent=owner=>active.current===owner&&!owner.controller.signal.aborted;
 const begin=()=>{if(active.current)return null;const owner={controller:new AbortController()};active.current=owner;setNotice('');return owner;};
 const fetchOwned=async(owner,url,options={})=>{if(!isCurrent(owner))throw new DOMException('Cancelled','AbortError');const response=await fetch(url,{...options,signal:owner.controller.signal});if(!isCurrent(owner))throw new DOMException('Cancelled','AbortError');const json=response.json.bind(response);response.json=async()=>{const data=await json();if(!isCurrent(owner))throw new DOMException('Cancelled','AbortError');if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('The analysis service returned an invalid report.');return data;};return response;};
 const cancel=()=>{active.current?.controller.abort();active.current=null;cancelled.current?.();setNotice('Request cancelled. No completed response is shown.');};
 return{begin,fetch:fetchOwned,isCurrent,finish:owner=>{if(active.current===owner)active.current=null;},cancel,notice};
}
