import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Plus, Share2, Download, ArrowLeft, RefreshCw, X, Users } from 'lucide-react';
import { useReview } from '@/store/ReviewStore';
import { check, exportReview, uploadRevision, type ReviewLink } from '@/lib/reviewApi';
import { supabase } from '@/lib/supabase';
import { inspectImage } from '@/lib/validation';
import { useDialog } from '@/lib/useDialog';

export function ProjectTools({projectId,reload}:{projectId:string;reload:()=>Promise<void>}) {
  const context=useReview();
  const [modal,setModal]=useState<'asset'|'share'|'members'|null>(null);
  const [notice,setNotice]=useState('');
  return <><div className="fp-project-tools"><a className="fp-btn" href="/workspace"><ArrowLeft size={15}/>Projects</a><span className="fp-tool-label">PRIVATE WORKSPACE</span><div className="fp-tool-actions">
    <button className="fp-btn" onClick={()=>void reload().then(()=>setNotice('Up to date')).catch(e=>setNotice(e.message))}><RefreshCw size={14}/>Refresh</button>
    <button className="fp-btn" onClick={()=>exportReview(context,context.projectName)}><Download size={14}/>Export record</button>
    {context.canEdit&&<><button className="fp-btn" onClick={()=>setModal('members')}><Users size={14}/>Team</button><button className="fp-btn" disabled={!context.selectedAssetId||!context.selectedVersionId} onClick={()=>setModal('share')}><Share2 size={14}/>Share asset</button><button className="fp-btn fp-btn-primary" onClick={()=>setModal('asset')}><Plus size={14}/>Add asset</button></>}
  </div>{notice&&<span role="status" className="fp-tool-feedback">{notice}</span>}</div>
  {modal&&<ToolDialog title={modal==='asset'?'Add an image asset':modal==='share'?'Share this asset':'Project team'} onClose={()=>setModal(null)}>
    {modal==='asset'?<NewAsset projectId={projectId} onDone={async()=>{await reload();setModal(null);}}/>:modal==='share'?<ShareAsset assetId={context.selectedAssetId}/>:<Members projectId={projectId}/>}
  </ToolDialog>}</>;
}

function ToolDialog({title,onClose,children}:{title:string;onClose:()=>void;children:React.ReactNode}){
  const ref=useDialog(onClose);
  return <div className="fp-overlay fp-overlay-modal"><section ref={ref} className="fp-tool-dialog" role="dialog" aria-modal="true" aria-labelledby="tool-title" tabIndex={-1}><header><h2 id="tool-title">{title}</h2><button className="fp-icon-btn" onClick={onClose} aria-label="Close dialog"><X size={20}/></button></header>{children}</section></div>;
}

function NewAsset({projectId,onDone}:{projectId:string;onDone:()=>Promise<void>}){
  const [name,setName]=useState('');const [subtitle,setSubtitle]=useState('');const [file,setFile]=useState<File|null>(null);const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  async function submit(e:FormEvent){e.preventDefault();if(!file||!name.trim())return;setBusy(true);setError('');let assetId:string|undefined;
    try{await inspectImage(file);const result=await supabase.from('assets').insert({project_id:projectId,name:name.trim(),subtitle:subtitle.trim()}).select('id').single();check(result.error);assetId=result.data!.id;await uploadRevision(projectId,assetId!,file);await onDone();}
    catch(e){setError(`${(e as Error).message}${assetId?' The empty asset was retained. Select it and retry New version.':''}`);setBusy(false);}
  }
  return <form className="fp-form" onSubmit={submit}><p>One asset, one version history. Upload a new revision later without replacing earlier feedback.</p><label>Asset name<input required maxLength={200} value={name} onChange={e=>setName(e.target.value)} placeholder="Spring campaign poster"/></label><label>Description (optional)<input maxLength={500} value={subtitle} onChange={e=>setSubtitle(e.target.value)} placeholder="Portrait artwork for client approval"/></label><label>Image file<input required type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setFile(e.target.files?.[0]??null)}/></label><small>PNG, JPEG or WebP. Up to 10 MB and 40 megapixels.</small>{error&&<p role="alert" className="fp-form-error">{error}</p>}<button className="fp-btn fp-btn-primary" disabled={busy||!file}>{busy?'Uploading first version...':'Create asset'}</button></form>;
}

function ShareAsset({assetId}:{assetId:string}){
  const [links,setLinks]=useState<ReviewLink[]>([]);const [days,setDays]=useState('7');const [url,setUrl]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  const load=useCallback(async()=>{const r=await supabase.from('review_links').select('id,asset_id,expires_at,revoked_at').eq('asset_id',assetId).order('expires_at',{ascending:false}).returns<ReviewLink[]>();check(r.error);setLinks(r.data??[]);},[assetId]);
  useEffect(()=>{void load().catch(e=>setError(e.message));},[load]);
  async function create(){setBusy(true);setError('');try{const r=await supabase.rpc('create_review_link',{p_asset_id:assetId,p_days:Number(days)});check(r.error);setUrl(`${location.origin}/review#${r.data.token}`);await load();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function revoke(id:string){setBusy(true);try{const r=await supabase.rpc('revoke_review_link',{p_id:id});check(r.error);setUrl('');await load();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <div className="fp-form"><p>Anyone with this link can view all revisions of this asset, comment and record a decision. Send it only to intended reviewers. Guest names are self-reported.</p><label>Link expires after<select value={days} onChange={e=>setDays(e.target.value)}><option value="1">1 day</option><option value="7">7 days</option><option value="30">30 days</option></select></label><button className="fp-btn fp-btn-primary" disabled={busy} onClick={()=>void create()}>Create review link</button>{url&&<label>Copy this private link now<input readOnly value={url} onFocus={e=>e.target.select()}/><small>The full link is shown only at creation. It is not stored in plain text.</small></label>}{error&&<p role="alert" className="fp-form-error">{error}</p>}<h3>Existing links</h3>{links.length===0?<p>No links created.</p>:links.map(l=><div className="fp-link-row" key={l.id}><span>Expires {new Date(l.expires_at).toLocaleDateString()}<small>{l.revoked_at?'Revoked':new Date(l.expires_at)<new Date()?'Expired':'Active'}</small></span>{!l.revoked_at&&<button className="fp-btn" disabled={busy} onClick={()=>void revoke(l.id)}>Revoke</button>}</div>)}<small>Revocation blocks new requests immediately. Already loaded images and signed image URLs can remain available for up to two minutes.</small></div>;
}

function Members({projectId}:{projectId:string}){
  const [members,setMembers]=useState<{id:string;user_id:string;role:string}[]>([]);const [userId,setUserId]=useState('');const [role,setRole]=useState('reviewer');const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [admin,setAdmin]=useState(false);
  const load=useCallback(async()=>{const [r,p]=await Promise.all([supabase.from('project_members').select('id,user_id,role').eq('project_id',projectId),supabase.rpc('get_user_role',{p_project_id:projectId})]);check(r.error);check(p.error);setMembers(r.data??[]);setAdmin(p.data==='admin');},[projectId]);
  useEffect(()=>{void load().catch(e=>setError(e.message));},[load]);
  async function add(e:FormEvent){e.preventDefault();setBusy(true);setError('');try{const r=await supabase.from('project_members').insert({project_id:projectId,user_id:userId.trim(),role});check(r.error);setUserId('');await load();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function remove(id:string){setBusy(true);try{const r=await supabase.from('project_members').delete().eq('id',id);check(r.error);await load();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <div className="fp-form"><p>Use an expiring asset link for external reviewers. For a persistent team member, ask them to create an account and share their member ID from Projects. No email invitations are sent.</p>{members.map(m=><div className="fp-member-row" key={m.id}><code>{m.user_id}</code><span>{m.role}</span>{admin&&<button className="fp-btn" disabled={busy} onClick={()=>void remove(m.id)}>Remove access</button>}</div>)}{admin?<form className="fp-form" onSubmit={add}><label>Existing member ID<input required value={userId} onChange={e=>setUserId(e.target.value)} pattern="[0-9a-fA-F-]{36}" placeholder="Member account UUID"/></label><label>Role<select value={role} onChange={e=>setRole(e.target.value)}><option value="reviewer">Reviewer: view, comment and decide</option><option value="designer">Designer: also upload and share assets</option></select></label><button disabled={busy} className="fp-btn fp-btn-primary">Add member</button></form>:<p>Only project admins can change team access.</p>}{error&&<p role="alert" className="fp-form-error">{error}</p>}</div>;
}
