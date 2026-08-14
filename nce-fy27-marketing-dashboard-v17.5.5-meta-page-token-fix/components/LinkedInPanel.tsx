'use client';

import { melbourneLocalToUtc, utcToMelbourneInput } from '@/lib/time';
import {useEffect,useMemo,useState} from 'react';
import {CheckCircle2,ChevronLeft,ChevronRight,ExternalLink,Image as ImageIcon,Linkedin,LoaderCircle,RefreshCw,Send} from 'lucide-react';
import type {PlannerItem} from '@/lib/types';

function normaliseUrls(value:string){return value.split(/\r?\n|,/).map(url=>url.trim()).filter(Boolean)}

export default function LinkedInPanel({item,onUpdate}:{item:PlannerItem;onUpdate:(item:PlannerItem)=>void}){
  const [connected,setConnected]=useState(false);const [configured,setConfigured]=useState<boolean|null>(null);const [loading,setLoading]=useState(false);const [message,setMessage]=useState('');
  const [organisationName,setOrganisationName]=useState('NCE');
  const [copy,setCopy]=useState(item.linkedinCaption??'');
  const initialUrls=item.linkedinMediaUrls?.length?item.linkedinMediaUrls:[];
  const [mediaInput,setMediaInput]=useState(initialUrls.join('\n'));
  const [websiteUrl,setWebsiteUrl]=useState(item.linkedinWebsiteUrl??'');
  const [sourceUrl,setSourceUrl]=useState(item.linkedinSourceUrl??'');
  const [scheduledAt,setScheduledAt]=useState(utcToMelbourneInput(item.linkedinScheduledAt)||`${item.date}T10:00`);
  const [previewIndex,setPreviewIndex]=useState(0);
  const mediaUrls=useMemo(()=>normaliseUrls(mediaInput),[mediaInput]);

  async function load(){setLoading(true);setMessage('');try{const r=await fetch('/api/linkedin/status');const b=await r.json();setConfigured(Boolean(b.configured));setConnected(Boolean(b.connected));setOrganisationName(b.organization?.localizedName||b.organization?.name||'NCE');if(!b.connected)setMessage(b.error||'Add LinkedIn credentials in Vercel.');}catch(e){setMessage(e instanceof Error?e.message:'LinkedIn connection failed');}finally{setLoading(false)}}
  useEffect(()=>{void load()},[]);
  useEffect(()=>{setPreviewIndex(0)},[mediaInput]);


  function saveDraft(){onUpdate({...item,linkedinCaption:copy,linkedinMediaUrls:mediaUrls,linkedinWebsiteUrl:websiteUrl,linkedinSourceUrl:sourceUrl,linkedinScheduledAt:scheduledAt?melbourneLocalToUtc(scheduledAt).toISOString():undefined,status:item.status==='Brief Required'?'In Production':item.status});setMessage('LinkedIn draft saved for review.')}

  async function schedule(){setLoading(true);setMessage('');try{const r=await fetch('/api/linkedin/schedule',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:copy,mediaUrls,websiteUrl,sourceUrl,scheduledAt:melbourneLocalToUtc(scheduledAt).toISOString(),approvalStatus:item.approvalStatus,itemId:item.id})});const b=await r.json();if(!r.ok)throw new Error(b.error||'Unable to schedule LinkedIn post');onUpdate({...item,status:'Scheduled',linkedinCaption:copy,linkedinMediaUrls:mediaUrls,linkedinWebsiteUrl:websiteUrl,linkedinSourceUrl:sourceUrl,linkedinScheduledAt:melbourneLocalToUtc(scheduledAt).toISOString(),linkedinJobId:b.job.id,linkedinStatus:'Scheduled'});setMessage('LinkedIn post scheduled for publishing.');}catch(e){setMessage(e instanceof Error?e.message:'Unable to schedule LinkedIn post');}finally{setLoading(false)}}

  const activeMedia=mediaUrls[Math.min(previewIndex,Math.max(0,mediaUrls.length-1))];
  return <section className="drawer-section linkedin-panel">
    <div className="linkedin-heading"><div><span className="integration-kicker">LINKEDIN</span><h4>Company Page review & scheduling</h4><p>Preview approved copy and images, then schedule the post directly from the calendar.</p></div><button className="icon-btn" type="button" onClick={()=>void load()} disabled={loading}>{loading?<LoaderCircle className="spin" size={18}/>:<RefreshCw size={18}/>}</button></div>
    <div className={`connection-state ${connected?'connected':'disconnected'}`}>{connected?<CheckCircle2 size={17}/>:<Linkedin size={17}/>}<strong>{connected?`LinkedIn connected · ${organisationName}`:configured===false?'LinkedIn not configured':'LinkedIn unavailable'}</strong></div>
    {connected&&<>
      <label className="integration-field"><span>Post copy</span><textarea rows={8} value={copy} onChange={e=>setCopy(e.target.value)} placeholder="Write or paste the approved LinkedIn post copy here."/></label>
      <label className="integration-field"><span>Public image URLs</span><textarea rows={5} value={mediaInput} onChange={e=>setMediaInput(e.target.value)} placeholder="One direct JPG or PNG URL per line"/><small>Add one image for a standard post or 2–20 images for a multi-image post.</small></label>
      <label className="integration-field"><span>Website link</span><input value={websiteUrl} onChange={e=>setWebsiteUrl(e.target.value)} placeholder="Optional https://nce.com.au/..."/><small>The URL is added to the end of the LinkedIn post copy.</small></label>
      <label className="integration-field"><span>Asset source link</span><input value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)} placeholder="Optional Canva, Google Drive or asset-folder link"/><small>This link is for internal review only and is not published.</small></label>
      <label className="integration-field"><span>Publish date and time (Melbourne)</span><input type="datetime-local" value={scheduledAt} onChange={e=>setScheduledAt(e.target.value)}/></label>

      <div className="linkedin-review-block">
        <div className="linkedin-review-toolbar"><div><span className="integration-kicker">POST PREVIEW</span><strong>{mediaUrls.length>1?`${mediaUrls.length} image post`:mediaUrls.length===1?'Single image post':'Text post'}</strong></div></div>
        <div className="linkedin-post-preview">
          <div className="linkedin-preview-account"><div className="linkedin-avatar">NCE</div><div><strong>{organisationName}</strong><span>Company Page · Just now</span></div><b>•••</b></div>
          <div className="linkedin-preview-copy"><p>{copy||'Approved LinkedIn copy will appear here.'}</p>{websiteUrl&&<p className="linkedin-link-text">{websiteUrl}</p>}</div>
          {activeMedia&&<div className="linkedin-preview-media"><img src={activeMedia} alt={`LinkedIn post preview ${previewIndex+1}`}/>{mediaUrls.length>1&&<><button className="carousel-nav prev" type="button" onClick={()=>setPreviewIndex(i=>(i-1+mediaUrls.length)%mediaUrls.length)} aria-label="Previous image"><ChevronLeft size={20}/></button><button className="carousel-nav next" type="button" onClick={()=>setPreviewIndex(i=>(i+1)%mediaUrls.length)} aria-label="Next image"><ChevronRight size={20}/></button><div className="carousel-count">{previewIndex+1}/{mediaUrls.length}</div></>}</div>}
          {!activeMedia&&<div className="linkedin-media-empty"><ImageIcon size={26}/><span>Add one or more public image URLs to preview the post.</span></div>}
          {mediaUrls.length>1&&<div className="carousel-dots">{mediaUrls.map((_,index)=><button key={index} type="button" className={index===previewIndex?'active':''} onClick={()=>setPreviewIndex(index)} aria-label={`View image ${index+1}`}/>)}</div>}
          <div className="linkedin-engagement"><span>Like</span><span>Comment</span><span>Repost</span><span>Send</span></div>
        </div>
        {sourceUrl&&<a className="source-link" href={sourceUrl} target="_blank" rel="noreferrer"><ExternalLink size={15}/>Open original asset source</a>}
      </div>

      <div className="integration-actions"><button className="btn secondary" type="button" onClick={saveDraft}>Save draft</button><button className="btn primary" type="button" onClick={()=>void schedule()} disabled={loading||!copy.trim()||mediaUrls.length>20||item.approvalStatus!=='Approved'}><Send size={16}/>Schedule LinkedIn post</button>{item.approvalStatus!=='Approved'&&<small>Jenna must approve this item first.</small>}{mediaUrls.length>20&&<small>LinkedIn supports a maximum of 20 images.</small>}</div>
    </>}
    {message&&<p className="integration-message">{message}</p>}
  </section>
}
