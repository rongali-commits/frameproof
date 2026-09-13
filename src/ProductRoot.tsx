import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ArrowUpRight, ArrowRight, ArrowLeft, Frame, Check, Plus, LogOut, Layers, MousePointer2, GitCompareArrows, ShieldCheck } from 'lucide-react';
import { Workspace } from './App';
import { ReviewProvider, useReview } from './store/ReviewStore';
import { CloudReview } from './store/CloudReview';
import { ProjectTools } from './components/ProjectTools';
import { backendConfigured, supabase } from './lib/supabase';
import { check, exportReview, type ProjectRow } from './lib/reviewApi';
import artV1 from './artworks/aster-spring-v1.svg';
import artV2 from './artworks/aster-spring-v2.svg';
import './product.css';

function Logo(){return <a className="fp-brand" href="/" aria-label="FrameProof home"><Frame size={23}/><span>FrameProof<span className="fp-brand-dot">.</span></span></a>;}
function Header(){return <header className="fp-site-header"><Logo/><nav aria-label="Main navigation"><a href="/#workflow">The workflow</a><a href="/demo">Try demo</a><a className="fp-btn fp-btn-dark" href="/workspace">Open workspace <ArrowUpRight size={16}/></a></nav></header>;}

export function ProductRoot(){
  const path=location.pathname.replace(/\/$/,'')||'/';
  if(path==='/')return <Landing/>;
  if(path==='/demo')return <ReviewProvider><div className="fp-workspace-shell"><div className="fp-demo-top"><a href="/"><ArrowLeft size={14}/>FrameProof</a><span>INTERACTIVE DEMO · LOCAL TO THIS DEVICE</span><a href="/workspace">Use your own artwork <ArrowUpRight size={14}/></a></div><Workspace/></div></ReviewProvider>;
  if(path==='/review')return <GuestPage/>;
  if(['/signin','/signup','/reset'].includes(path))return <AuthPage mode={path.slice(1) as 'signin'|'signup'|'reset'}/>;
  if(path==='/workspace'||/^\/project\/[0-9a-f-]{36}$/.test(path))return <Authenticated path={path}/>;
  return <div className="fp-route-state"><Logo/><h1>This page is out of frame.</h1><p>The link may have changed. Your projects are still in your workspace.</p><a className="fp-btn fp-btn-primary" href="/">Back to FrameProof</a></div>;
}

function Landing(){return <div className="fp-site-scroll"><Header/><main id="main-content" className="fp-landing">
  <section className="fp-hero"><div className="fp-hero-copy"><p className="fp-eyebrow"><span/> FOR PEOPLE WHO MAKE THINGS VISUAL</p><h1>Good work.<br/>Clear feedback.<br/><em>One final version.</em></h1><p className="fp-hero-description">A focused place to review artwork, compare revisions and move from “nearly there” to approved.</p><div className="fp-hero-ctas"><a className="fp-btn fp-btn-dark" href="/demo">Enter the demo <ArrowRight size={18}/></a><a href="/signup" className="fp-link-inline">Create your workspace <ArrowUpRight size={16}/></a></div><p className="fp-hero-footnote">No signup to explore. Fictional artwork, real interactions.</p></div>
  <div className="fp-hero-proof" aria-label="Product example: Aster Studio poster revision with pinned feedback"><div className="fp-proof-top"><span><span className="fp-live-dot"/> ASTER STUDIO</span><span>SPRING IDENTITY / 02</span></div><div className="fp-proof-art"><img src={artV2} alt="Aster Studio spring poster, second version"/><span className="fp-proof-pin">1</span><div className="fp-proof-comment"><span className="fp-proof-avatar">JL</span><div><strong>Jules · Creative lead</strong><p>The type feels right. Let’s keep this direction.</p><small>FICTIONAL DEMO FEEDBACK</small></div></div></div><div className="fp-proof-bottom"><div><img src={artV1} alt="Version one thumbnail"/><span>v1</span><i/><img src={artV2} alt="Version two thumbnail"/><span>v2</span></div><span className="fp-proof-status"><Check size={14}/> A clearer direction</span></div></div>
  </section>
  <div className="fp-principles"><span><MousePointer2 size={16}/> Point to the exact detail</span><span><GitCompareArrows size={16}/> Compare the actual revisions</span><span><ShieldCheck size={16}/> Keep the decision with the version</span></div>
  <section id="workflow" className="fp-workflow-section"><div className="fp-section-intro"><p className="fp-eyebrow">LESS INTERPRETING. MORE MAKING.</p><h2>The feedback is in the frame.<br/><em>Not lost in the thread.</em></h2><p>A practical review loop for brand designers, studios and creative teams. Bring your images. Keep your process.</p></div><div className="fp-workflow-grid">
    <article><span className="fp-step-number">01 / PIN</span><MousePointer2 size={27}/><h3>“Right here.”</h3><p>Pin a comment to the artwork. Replies stay with that detail, and resolved threads remain in the record.</p></article>
    <article><span className="fp-step-number">02 / COMPARE</span><GitCompareArrows size={27}/><h3>See what changed.</h3><p>Move between revisions, use the before-and-after slider, or compare side by side. Earlier uploads stay intact.</p></article>
    <article><span className="fp-step-number">03 / DECIDE</span><Check size={27}/><h3>Approve this version.</h3><p>Record approval or request changes on the exact image. A new revision always starts with a fresh decision.</p></article>
  </div></section>
  <section className="fp-share-section"><div><p className="fp-eyebrow">INVITE A REVIEW, NOT A NEW WORKFLOW</p><h2>A link for your client.<br/><em>A workspace for your team.</em></h2></div><div><p>Keep your files private. Share one asset through an expiring review link, or add a signed-in teammate with a defined role.</p><ul><li>PNG, JPEG and WebP images up to 10 MB</li><li>Expiring and revocable asset links</li><li>Version-specific comments and decision history</li><li>Downloadable review activity record</li></ul><p className="fp-scope-note">Built for image review. Video annotation, live websites and legally binding e-signatures are not included.</p></div></section>
  <section className="fp-final-cta"><p className="fp-eyebrow">MAKE ROOM FOR THE WORK</p><h2>Less “which version?”<br/>More <em>“that’s the one.”</em></h2><a className="fp-btn fp-btn-dark" href="/demo">Take it for a review <ArrowRight size={18}/></a></section>
  </main><footer className="fp-site-footer"><Logo/><span>A focused product by Noerong.</span><a href="https://noerong.com" target="_blank" rel="noopener noreferrer">Visit the studio <ArrowUpRight size={14}/></a></footer></div>;}

function AuthPage({mode}:{mode:'signin'|'signup'|'reset'}){
  const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [name,setName]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [notice,setNotice]=useState('');const [recovery,setRecovery]=useState(false);
  useEffect(()=>{const {data}=supabase.auth.onAuthStateChange(event=>{if(event==='PASSWORD_RECOVERY')setRecovery(true);});return()=>data.subscription.unsubscribe();},[]);
  async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError('');setNotice('');
    try{if(!backendConfigured)throw new Error('The private backend is not configured yet. You can still explore the demo.');
      if(mode==='signup'){const r=await supabase.auth.signUp({email,password,options:{data:{display_name:name.trim()},emailRedirectTo:`${location.origin}/workspace`}});check(r.error);if(r.data.session)location.assign('/workspace');else setNotice('Check your email to confirm your account before signing in.');}
      else if(mode==='reset'){if(recovery){const r=await supabase.auth.updateUser({password});check(r.error);location.assign('/workspace');}else{const r=await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${location.origin}/reset`});check(r.error);setNotice('If an account exists for that email, a recovery link will be sent.');}}
      else{const r=await supabase.auth.signInWithPassword({email,password});check(r.error);location.assign('/workspace');}
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  return <div className="fp-site-scroll"><Header/><main className="fp-auth-layout"><div className="fp-auth-editorial"><p className="fp-eyebrow">YOUR WORK, IN GOOD ORDER</p><h1>Keep the feedback.<br/><em>Lose the friction.</em></h1><p>Private projects, clear revisions, thoughtful reviews.</p><img src={artV2} alt="Aster Studio poster example"/></div><section className="fp-auth-card"><Logo/><h2>{mode==='signup'?'Make space for your work.':mode==='reset'?'Recover your workspace.':'Welcome back.'}</h2><p>{mode==='signup'?'Create an account to start your first private project.':mode==='reset'?'Use your account email to request a secure recovery link.':'Sign in to pick up where the review left off.'}</p><form className="fp-form" onSubmit={submit}>
    {mode==='signup'&&<label>Your display name<input required autoComplete="name" maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label>}
    {!recovery&&<label>Email<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>}
    {(mode!=='reset'||recovery)&&<label>{recovery?'New password':'Password'}<input type="password" required minLength={mode==='signin'?1:12} autoComplete={mode==='signin'?'current-password':'new-password'} value={password} onChange={e=>setPassword(e.target.value)}/>{mode==='signup'&&<small>Use at least 12 characters and a unique password.</small>}</label>}
    {error&&<p role="alert" className="fp-form-error">{error}</p>}{notice&&<p role="status" className="fp-form-success">{notice}</p>}
    <button className="fp-btn fp-btn-dark" disabled={busy}>{busy?'Please wait...':mode==='signup'?'Create account':mode==='reset'?(recovery?'Save new password':'Send recovery link'):'Sign in'}<ArrowRight size={16}/></button>
  </form><div className="fp-auth-links">{mode==='signin'?<><a href="/signup">New here? Create an account</a><a href="/reset">Forgot password?</a></>:<a href="/signin">Back to sign in</a>}<a href="/demo">Explore without an account</a></div><small className="fp-auth-privacy">Your email is used for account access. Project files are private to authorized members and people you give review links to. Do not upload sensitive or confidential client material without permission.</small></section></main></div>;
}

function Authenticated({path}:{path:string}){
  const [session,setSession]=useState<Session|null>(null);const [ready,setReady]=useState(false);
  useEffect(()=>{let alive=true;supabase.auth.getSession().then(({data})=>{if(alive){setSession(data.session);setReady(true);}});const {data}=supabase.auth.onAuthStateChange((_e,s)=>{setSession(s);setReady(true);});return()=>{alive=false;data.subscription.unsubscribe();};},[]);
  if(!backendConfigured)return <div className="fp-route-state"><h1>Private workspace is being configured.</h1><a href="/demo">Explore the interactive demo</a></div>;
  if(!ready)return <div className="fp-route-state" role="status">Opening workspace...</div>;
  if(!session)return <AuthPage mode="signin"/>;
  return path==='/workspace'?<ProjectList session={session}/>:<ProjectPage id={path.split('/')[2]}/>;
}

function ProjectList({session}:{session:Session}){
  const [projects,setProjects]=useState<ProjectRow[]>([]);const [name,setName]=useState('');const [description,setDescription]=useState('');const [error,setError]=useState('');const [loaded,setLoaded]=useState(false);const [busy,setBusy]=useState(false);const [showNew,setShowNew]=useState(false);
  useEffect(()=>{let alive=true;supabase.from('projects').select('*').order('created_at',{ascending:false}).returns<ProjectRow[]>().then(r=>{if(alive){if(r.error)setError(r.error.message);else setProjects(r.data??[]);setLoaded(true);}});return()=>{alive=false;};},[]);
  async function create(e:FormEvent){e.preventDefault();if(!name.trim())return;setBusy(true);setError('');try{const r=await supabase.from('projects').insert({name:name.trim(),description:description.trim()}).select('id').single();check(r.error);location.assign(`/project/${r.data!.id}`);}catch(e){setError((e as Error).message);setBusy(false);}}
  return <div className="fp-site-scroll"><header className="fp-site-header"><Logo/><nav><a href="/demo">Explore demo</a><button className="fp-btn" onClick={()=>void supabase.auth.signOut().then(()=>location.assign('/'))}><LogOut size={15}/>Sign out</button></nav></header><main className="fp-projects-page"><div className="fp-projects-heading"><div><p className="fp-eyebrow">YOUR REVIEW ROOM</p><h1>Work in progress.<br/><em>All in one place.</em></h1><p>Hello, {session.user.user_metadata.display_name||'designer'}. Let’s get the next detail right.</p></div><button className="fp-btn fp-btn-dark" onClick={()=>setShowNew(!showNew)}><Plus size={17}/>{showNew?'Close form':'New project'}</button></div>
  {showNew&&<form onSubmit={create} className="fp-form fp-project-create"><h2>Start a project</h2><label>Project name<input autoFocus required maxLength={200} value={name} onChange={e=>setName(e.target.value)} placeholder="Client / Project name"/></label><label>Description (optional)<textarea maxLength={2000} value={description} onChange={e=>setDescription(e.target.value)} placeholder="What are we reviewing?"/></label><button className="fp-btn fp-btn-primary" disabled={busy}>{busy?'Creating...':'Create private project'}</button></form>}
  {error&&<p role="alert" className="fp-form-error">{error}</p>}{!loaded?<p role="status">Loading your projects...</p>:projects.length?<div className="fp-project-grid">{projects.map((p,i)=><a className="fp-project-card" key={p.id} href={`/project/${p.id}`}><div><span>{String(i+1).padStart(2,'0')}</span><ArrowUpRight size={24}/></div><Layers size={32}/><h2>{p.name}</h2><p>{p.description||'Artwork, feedback and decisions in one private workspace.'}</p><footer>Open review workspace <ArrowRight size={16}/></footer></a>)}</div>:<div className="fp-project-empty"><Layers size={44}/><h2>Your first review starts here.</h2><p>Create a project, upload an image, then invite a reviewer with an expiring link.</p><button className="fp-btn fp-btn-primary" onClick={()=>setShowNew(true)}>Create your first project</button></div>}
  <details className="fp-member-id"><summary>Your member ID</summary><p>Share this ID only with a project owner who needs to add you to their team.</p><code>{session.user.id}</code></details></main></div>;
}

function ProjectPage({id}:{id:string}){
  const reloadRef=useRef<()=>Promise<void>>(async()=>{});
  const onReady=useCallback((reload:()=>Promise<void>)=>{reloadRef.current=reload;},[]);
  const reload=useCallback(()=>reloadRef.current(),[]);
  return <CloudReview projectId={id} onReady={onReady}><div className="fp-workspace-shell"><ProjectTools projectId={id} reload={reload}/><Workspace/></div></CloudReview>;
}

function GuestPage(){
  const token=location.hash.slice(1);const [name,setName]=useState('');
  if(!/^[a-f0-9]{64}$/.test(token))return <div className="fp-route-state"><Logo/><h1>This review link is incomplete.</h1><p>Ask the project owner for the full review link, including the part after #.</p><a href="/">About FrameProof</a></div>;
  return <CloudReview token={token} guestName={name}><div className="fp-workspace-shell"><div className="fp-guest-bar"><Logo/><label>Your name for feedback<input maxLength={80} placeholder="Enter your name" value={name} onChange={e=>setName(e.target.value)}/></label><span>Guest names are self-reported.</span><GuestExport/></div><Workspace/></div></CloudReview>;
}
function GuestExport(){const r=useReview();return <button className="fp-btn" onClick={()=>exportReview(r,r.projectName)}>Export record</button>;}
