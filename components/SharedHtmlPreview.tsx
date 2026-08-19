'use client';
import { useMemo, useState } from 'react';
import { ExternalLink, FileCode2, Trash2, UploadCloud } from 'lucide-react';
import type { PlannerItem, SharedPreviewRecord } from '@/lib/types';

export default function SharedHtmlPreview({item,onUpdate}:{item:PlannerItem,onUpdate:(item:PlannerItem)=>void}){
  const [busy,setBusy]=useState(false); const [message,setMessage]=useState('');
  const previews=useMemo<SharedPreviewRecord[]>(()=>item.sharedPreviews?.length?item.sharedPreviews:(item.sharedPreviewId&&item.sharedPreviewUrl?[{id:item.sharedPreviewId,url:item.sharedPreviewUrl,fileName:item.sharedPreviewFileName||'HTML preview',uploadedAt:new Date().toISOString()}]:[]),[item]);
  async function upload(files:FileList|null){
    if(!files?.length) return; setBusy(true); setMessage('');
    try{
      const added:SharedPreviewRecord[]=[];
      for(const file of Array.from(files)){
        const form=new FormData(); form.set('file',file); form.set('itemId',item.id);
        const response=await fetch('/api/previews',{method:'POST',body:form}); const body=await response.json();
        if(!response.ok) throw new Error(body.error||`Unable to upload ${file.name}.`);
        added.push({id:body.previewId,url:body.previewUrl,fileName:body.fileName,mediaUrls:body.mediaUrls??[],uploadedAt:new Date().toISOString()});
      }
      onUpdate({...item,sharedPreviews:[...previews,...added],sharedPreviewId:undefined,sharedPreviewUrl:undefined,sharedPreviewFileName:undefined});
      setMessage(`${added.length} shared preview${added.length===1?'':'s'} saved.`);
    }catch(error){setMessage(error instanceof Error?error.message:'Upload failed.')}finally{setBusy(false)}
  }
  async function remove(preview:SharedPreviewRecord){
    setBusy(true);setMessage('');
    try{await fetch(`/api/previews?id=${encodeURIComponent(preview.id)}`,{method:'DELETE'});onUpdate({...item,sharedPreviews:previews.filter(entry=>entry.id!==preview.id)});setMessage('Preview removed.')}catch(error){setMessage(error instanceof Error?error.message:'Unable to remove preview.')}finally{setBusy(false)}
  }
  return <section id="review-assets" className="drawer-section shared-html-preview"><div className="section-heading"><div><h4>Shared HTML previews</h4><p>Upload one HTML preview for a single post or multiple HTML files for carousel slides. These are shared across signed-in browsers.</p></div><label className="upload-button"><UploadCloud size={17}/>{busy?'Working…':'Add HTML'}<input disabled={busy} multiple type="file" accept=".html,.htm,text/html" onChange={e=>{void upload(e.target.files);e.currentTarget.value=''}}/></label></div>
    {previews.length?<div className="shared-preview-list">{previews.map((preview,index)=><div className="shared-preview-card" key={preview.id}><FileCode2 size={20}/><div><strong>{preview.fileName}</strong><span>Preview {index+1} · {preview.mediaUrls?.length??0} schedulable media file(s) detected</span></div><a href={preview.url} target="_blank" rel="noreferrer"><ExternalLink size={15}/>Open</a><button className="remove-preview" type="button" onClick={()=>void remove(preview)} aria-label={`Remove ${preview.fileName}`}><Trash2 size={15}/></button></div>)}</div>:<div className="empty-files"><FileCode2 size={22}/><span>No shared HTML previews uploaded yet</span></div>}
    {message&&<p className="integration-message">{message}</p>}
  </section>
}
