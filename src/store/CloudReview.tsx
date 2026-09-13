import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ReviewContext, type ReviewContextValue } from './ReviewStore';
import { supabase } from '@/lib/supabase';
import { check, guestRequest, loadGuest, loadProject, uploadRevision, type Snapshot, type Role } from '@/lib/reviewApi';

export function CloudReview({projectId,token,guestName,children,onReady}:{projectId?:string;token?:string;guestName?:string;children:ReactNode;onReady?:(reload:()=>Promise<void>)=>void}) {
  const [snapshot,setSnapshot]=useState<Snapshot>({assets:[],comments:[],decisions:[]});
  const [name,setName]=useState('Review workspace');
  const [role,setRole]=useState<Role>('reviewer');
  const [selection,setSelection]=useState({asset:'',version:''});
  const [selectedCommentId,selectComment]=useState<string|null>(null);
  const [error,setError]=useState<string|null>(null);
  const [loaded,setLoaded]=useState(false);
  const [busy,setBusy]=useState(false);
  const saving=useRef(false);
  const mounted=useRef(true);
  const refresh=useCallback(async()=>{
    const result=token?await loadGuest(token):await loadProject(projectId!);
    if(!mounted.current)return;
    setSnapshot(result.snapshot);
    if('project' in result){setName(result.project.name);setRole(result.role);}else setName(result.name);
    setSelection(old=>{const asset=result.snapshot.assets.find(a=>a.id===old.asset)??result.snapshot.assets[0];return {asset:asset?.id??'',version:asset?.versions.some(v=>v.id===old.version)?old.version:asset?.versions.at(-1)?.id??''};});
    setLoaded(true);setError(null);
  },[projectId,token]);
  useEffect(()=>{
    mounted.current=true;
    void refresh().catch(e=>{if(mounted.current){setError(e.message);setLoaded(true);}});
    const reload=()=>{if(document.visibilityState==='visible'&&!saving.current)void refresh().catch(e=>{if(mounted.current)setError(e.message);});};
    const timer=setInterval(reload,token?90000:600000);window.addEventListener('focus',reload);
    return()=>{mounted.current=false;clearInterval(timer);window.removeEventListener('focus',reload);};
  },[refresh,token]);
  useEffect(()=>onReady?.(refresh),[onReady,refresh]);
  async function mutate(action:()=>Promise<void>){
    if(saving.current)throw new Error('Please wait for the current save to finish.');
    saving.current=true;setBusy(true);setError(null);
    try{await action();await refresh();}catch(e){setError((e as Error).message);throw e;}finally{saving.current=false;if(mounted.current)setBusy(false);}
  }
  async function insert(table:string,value:Record<string,unknown>){const result=await supabase.from(table).insert(value);check(result.error);}
  function guest(action:string,payload:Record<string,unknown>){if(!guestName?.trim())throw new Error('Enter your name in the review bar first.');return guestRequest(token!,action,selection.version,guestName.trim(),payload);}
  const value:ReviewContextValue={...snapshot,selectedAssetId:selection.asset,selectedVersionId:selection.version,selectedCommentId,
    selectAsset:id=>{const a=snapshot.assets.find(a=>a.id===id);if(a){setSelection({asset:id,version:a.versions.at(-1)?.id??''});selectComment(null);}},
    selectVersion:id=>{if(snapshot.assets.find(a=>a.id===selection.asset)?.versions.some(v=>v.id===id)){setSelection(s=>({...s,version:id}));selectComment(null);}},selectComment,
    addComment:(pin,body)=>mutate(async()=>{if(token)await guest('comment',{x:pin.x,y:pin.y,body});else await insert('threads',{version_id:selection.version,x:pin.x,y:pin.y,body:body.trim(),author_name:'Workspace member'});}),
    addReply:(id,body)=>mutate(async()=>{if(token)await guest('reply',{thread_id:id,body});else await insert('replies',{thread_id:id,body:body.trim(),author_name:'Workspace member'});}),
    toggleResolved:id=>mutate(async()=>{if(token)throw new Error('Only project designers can resolve comments.');const result=await supabase.from('threads').update({resolved:!snapshot.comments.find(c=>c.id===id)?.resolved}).eq('id',id).select('id');check(result.error);if(!result.data?.length)throw new Error('You do not have permission to resolve this comment.');}),
    setDecision:(status,note)=>mutate(async()=>{if(token)await guest('decision',{status,note});else await insert('decisions',{version_id:selection.version,status,note,author_name:'Workspace member'});}),
    uploadVersion:file=>mutate(async()=>{if(token)throw new Error('Guest links cannot upload files.');const id=await uploadRevision(projectId!,selection.asset,file);setSelection(s=>({...s,version:id}));}),
    resetDemo:async()=>{},versionBlobURLs:{},isDemo:false,canEdit:!token&&role!=='reviewer',canResolve:!token&&role!=='reviewer',projectName:name,error,dismissError:()=>setError(null),busy,
  };
  if(!loaded)return <div className="fp-route-state" role="status"><div className="fp-spinner"/><h1>Opening your review</h1><p>Loading private artwork and version history.</p></div>;
  if(error&&!snapshot.assets.length)return <div className="fp-route-state"><h1>Workspace unavailable</h1><p role="alert">{error}</p><button className="fp-btn fp-btn-primary" onClick={()=>void refresh().catch(e=>setError(e.message))}>Try again</button><a href="/workspace">Back to projects</a></div>;
  return <ReviewContext.Provider value={value}>{children}</ReviewContext.Provider>;
}
