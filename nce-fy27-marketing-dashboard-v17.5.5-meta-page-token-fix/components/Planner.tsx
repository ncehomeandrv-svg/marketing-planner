'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, parseISO, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import { CalendarDays, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Copy, Download, FileText, Filter, Paperclip, Plus, Search, Ticket, Trash2, UploadCloud, UserRound, X } from 'lucide-react';
import type { ApprovalStatus, Attachment, Channel, ItemType, PlannerItem, Priority, Segment, Status } from '@/lib/types';
import { quarterFocus, strategyPillars } from '@/lib/strategy-data';
import DotdigitalPanel from '@/components/DotdigitalPanel';
import MetaPanel from '@/components/MetaPanel';
import LinkedInPanel from '@/components/LinkedInPanel';
import SharedHtmlPreview from '@/components/SharedHtmlPreview';
import CollaborationPanel from '@/components/CollaborationPanel';
import NotificationCentre from '@/components/NotificationCentre';
import FailureCentre from '@/components/FailureCentre';
import OutlookConnection from '@/components/OutlookConnection';

const channels:Array<'All'|Channel>=['All','Email','Organic','LinkedIn','Website','Print','Video','Research','Operations','Other'];
const segments:Array<'All'|Segment>=['All','OEM','Dealer','Retail','Repairer','Commercial','Multiple'];
const statuses:Array<'All'|Status>=['All','Brief Required','Brief Ready','In Production','Ready for Review','Changes Required','Approved','Scheduled','Published','Blocked'];
const approvalStatuses:Array<'All'|ApprovalStatus>=['All','Not required','Awaiting approval','Changes requested','Approved'];
const people=['Kieren','Jenna','Commercial','Olga','John','Sales','Design','Marketing','External Agency'];
const segmentClass:Record<Segment,string>={OEM:'segment-oem',Dealer:'segment-dealer',Retail:'segment-retail',Repairer:'segment-repairer',Commercial:'segment-commercial',Multiple:'segment-multiple'};

export default function Planner({initialItems}:{initialItems:PlannerItem[]}){
  const [month,setMonth]=useState(new Date('2026-08-01T00:00:00'));
  const [today]=useState(()=>new Date());
  const [items,setItems]=useState(initialItems);
  const [selected,setSelected]=useState<PlannerItem|null>(null);
  const [showCreate,setShowCreate]=useState(false);
  const [createType,setCreateType]=useState<ItemType>('campaign');
  const [query,setQuery]=useState('');
  const [channel,setChannel]=useState<'All'|Channel>('All');
  const [segment,setSegment]=useState<'All'|Segment>('All');
  const [status,setStatus]=useState<'All'|Status>('All');
  const [assignee,setAssignee]=useState('All');
  const [approval,setApproval]=useState<'All'|ApprovalStatus>('All');
  const [showStrategy,setShowStrategy]=useState(true);
  const [saveState,setSaveState]=useState<'idle'|'saving'|'saved'|'local'>('idle');
  const [currentPerson,setCurrentPerson]=useState('Kieren');
  const [showCreateMenu,setShowCreateMenu]=useState(false);
  const [draggedItemId,setDraggedItemId]=useState<string|null>(null);
  const [dragOverDate,setDragOverDate]=useState<string|null>(null);

  useEffect(()=>{
    const savedPerson=window.localStorage.getItem('nce-current-person');if(savedPerson)setCurrentPerson(savedPerson);
    const localDeletedRaw=window.localStorage.getItem('nce-fy27-deleted-item-ids');let localDeleted:string[]=[];if(localDeletedRaw){try{localDeleted=JSON.parse(localDeletedRaw) as string[]}catch{}}
    const local=window.localStorage.getItem('nce-fy27-planner-items');
    if(local){try{const saved=JSON.parse(local) as PlannerItem[];setItems(prev=>mergeItems(prev,saved).filter(item=>!localDeleted.includes(item.id)));}catch{}}
    else if(localDeleted.length)setItems(prev=>prev.filter(item=>!localDeleted.includes(item.id)));
    fetch('/api/drafts',{cache:'no-store'}).then(r=>r.json()).then(body=>{const deletedIds=Array.isArray(body.deletedIds)?body.deletedIds as string[]:[];if(deletedIds.length)window.localStorage.setItem('nce-fy27-deleted-item-ids',JSON.stringify(deletedIds));setItems(prev=>mergeItems(prev,Array.isArray(body.items)?body.items:[]).filter(item=>!deletedIds.includes(item.id)));}).catch(()=>{});
  },[]);

  useEffect(()=>{const id=new URLSearchParams(window.location.search).get('item');if(!id)return;const match=items.find(entry=>entry.id===id);if(match){setSelected(match);setMonth(parseISO(match.date));}},[items]);

  const days=useMemo(()=>eachDayOfInterval({start:startOfWeek(startOfMonth(month),{weekStartsOn:1}),end:endOfWeek(endOfMonth(month),{weekStartsOn:1})}),[month]);
  const monthKey=format(month,'yyyy-MM');

  const filtered=items.filter(item=>{
    if(item.type==='strategy') return false;
    const q=query.trim().toLowerCase();
    const searchable=`${item.title} ${item.description} ${item.owner} ${item.briefOwner??''} ${item.assetCreator??''} ${item.approver??''} ${item.publisher??''} ${item.channel} ${item.segment}`.toLowerCase();
    return (!q||searchable.includes(q))&&(channel==='All'||item.channel===channel)&&(segment==='All'||item.segment===segment)&&(status==='All'||item.status===status)&&(assignee==='All'||[item.owner,item.briefOwner,item.assetCreator,item.publisher].includes(assignee))&&(approval==='All'||(item.approvalStatus??'Not required')===approval);
  });

  const monthItems=items.filter(item=>item.date.startsWith(monthKey)&&item.type!=='strategy');
  const contentCount=monthItems.filter(item=>item.source==='Monthly Content Plan'&&item.type==='campaign').length;
  const briefCount=monthItems.filter(item=>item.status==='Brief Required').length;
  const reviewCount=monthItems.filter(item=>item.status==='Ready for Review'||item.approvalStatus==='Awaiting approval').length;
  const attachedCount=monthItems.reduce((total,item)=>total+(item.attachments?.length??0),0);

  function openCreate(type:ItemType){setCreateType(type);setShowCreate(true)}
  function clearFilters(){setQuery('');setChannel('All');setSegment('All');setStatus('All');setAssignee('All');setApproval('All')}
  async function moveItemToDate(itemId:string,date:string){const item=items.find(entry=>entry.id===itemId);if(!item||item.date===date)return;const updated={...item,date};await updateItem(updated);setDraggedItemId(null);setDragOverDate(null)}
  async function updateItem(updated:PlannerItem){
    setItems(prev=>{const next=prev.some(item=>item.id===updated.id)?prev.map(item=>item.id===updated.id?updated:item):[...prev,updated];window.localStorage.setItem('nce-fy27-planner-items',JSON.stringify(next));return next});
    setSelected(updated);setSaveState('saving');
    try{const response=await fetch('/api/drafts',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(updated)});const body=await response.json();setSaveState(body.configured?'saved':'local');}catch{setSaveState('local')}
  }

  async function duplicateItem(item:PlannerItem){
    const duplicate:PlannerItem={...item,id:crypto.randomUUID(),title:`${item.title} (Copy)`,status:item.approvalStatus==='Not required'?item.status:'Brief Required',approvalStatus:item.approvalStatus==='Not required'?'Not required':'Awaiting approval',dotdigitalSendId:undefined,dotdigitalSendStatus:undefined,dotdigitalScheduledAt:undefined,metaJobId:undefined,metaStatus:undefined,metaScheduledAt:undefined,linkedinJobId:undefined,linkedinStatus:undefined,linkedinScheduledAt:undefined};
    await updateItem(duplicate);
  }
  async function deleteItem(item:PlannerItem){
    if(!window.confirm(`Remove “${item.title}” from the calendar? This cannot be undone.`))return;
    setItems(prev=>{const next=prev.filter(entry=>entry.id!==item.id);window.localStorage.setItem('nce-fy27-planner-items',JSON.stringify(next));return next});
    const deletedRaw=window.localStorage.getItem('nce-fy27-deleted-item-ids');let deletedIds:string[]=[];try{deletedIds=deletedRaw?JSON.parse(deletedRaw):[]}catch{}window.localStorage.setItem('nce-fy27-deleted-item-ids',JSON.stringify(Array.from(new Set([...deletedIds,item.id]))));
    setSelected(null);setSaveState('saving');
    try{const response=await fetch('/api/drafts',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:item.id})});const body=await response.json();setSaveState(body.configured?'saved':'local')}catch{setSaveState('local')}
  }

  return <main className="shell">
    <header className="topbar">
      <div className="brand-lockup"><div className="logo-wrap"><Image src="/nce-logo-reverse.png" alt="NCE" width={188} height={90} priority/></div><div><h1>FY27 Marketing Dashboard</h1><p>Jenna briefs and approves · Kieren creates and schedules</p></div></div>
      <div className="top-actions"><label className="person-switch"><span>Viewing as</span><select value={currentPerson} onChange={e=>{setCurrentPerson(e.target.value);window.localStorage.setItem('nce-current-person',e.target.value)}}><option>Kieren</option><option>Jenna</option></select></label><NotificationCentre person={currentPerson}/><FailureCentre/><OutlookConnection/><span className={`save-indicator ${saveState}`}>{saveState==='saving'?'Saving…':saveState==='saved'?'Saved for team':saveState==='local'?'Saved in this browser':'Drafts autosave'}</span></div>
    </header>

    <section className="strategy-bar"><div className="strategy-title"><span className="strategy-kicker">FY27 MARKETING DIRECTION</span><h2><span>REVIEW</span><b>•</b><span>RESET</span><b>•</b><span className="red">REBUILD</span></h2></div><button className="strategy-toggle" onClick={()=>setShowStrategy(v=>!v)}>{showStrategy?'Hide strategy':'Show strategy'}</button></section>

    {showStrategy&&<section className="strategy-panel">
      <div className="quarter-grid">{Object.entries(quarterFocus).map(([quarter,data])=><article key={quarter} className="quarter-card"><div className="quarter-head"><strong>{quarter}</strong><span>{data.range}</span></div><div className="quarter-focus">{data.label}</div><p>{data.text}</p></article>)}</div>
      <div className="nn-section-head"><div><span>OPERATING FLOORS</span><strong>Visible for planning only — not placed into the calendar</strong></div></div>
      <div className="nn-grid">{strategyPillars.map(p=><article key={p.code} className="nn-card"><header><span>{p.code}</span><strong>{p.title}</strong></header><p>{p.floor}</p><footer><span>Execution: <b>{p.executor}</b></span><span>Strategy gate: <b>{p.owner}</b></span><em>{p.cadence}</em></footer></article>)}</div>
    </section>}

    <section className="workflow-strip"><div><span>1</span><strong>Jenna creates brief</strong></div><i>→</i><div><span>2</span><strong>Kieren creates assets</strong></div><i>→</i><div><span>3</span><strong>Jenna reviews</strong></div><i>→</i><div><span>4</span><strong>Kieren schedules</strong></div></section>

    <section className="controlbar"><div className="month-nav"><button className="icon-btn" onClick={()=>setMonth(subMonths(month,1))} aria-label="Previous month"><ChevronLeft size={19}/></button><button className="today-btn" onClick={()=>setMonth(today)}>Today · {format(today,'d MMM yyyy')}</button><button className="icon-btn" onClick={()=>setMonth(addMonths(month,1))} aria-label="Next month"><ChevronRight size={19}/></button><h2>{format(month,'MMMM yyyy')}</h2><span className="live-date">Live date: {format(today,'EEEE d MMMM yyyy')}</span></div><div className="search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search content, briefs, creators or approvers"/></div></section>

    <section className="filters"><div className="filter-title"><Filter size={16}/>Filters</div><Select label="Channel" value={channel} options={channels} onChange={v=>setChannel(v as 'All'|Channel)}/><Select label="Segment" value={segment} options={segments} onChange={v=>setSegment(v as 'All'|Segment)}/><Select label="Workflow" value={status} options={statuses} onChange={v=>setStatus(v as 'All'|Status)}/><Select label="Person" value={assignee} options={['All',...people]} onChange={setAssignee}/><Select label="Approval" value={approval} options={approvalStatuses} onChange={v=>setApproval(v as 'All'|ApprovalStatus)}/><button className="clear" onClick={clearFilters}>Clear filters</button><div className="legend">{(['OEM','Dealer','Retail','Repairer','Commercial'] as Segment[]).map(s=><span key={s}><i className={segmentClass[s]}/>{s}</span>)}</div></section>

    <section className="calendar-card"><div className="week-head">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=><div key={d}>{d}</div>)}</div><div className="calendar-grid">{days.map(day=>{const key=format(day,'yyyy-MM-dd');const dayItems=filtered.filter(item=>item.date===key);return <div key={key} className={`day ${!isSameMonth(day,month)?'outside':''} ${key===format(today,'yyyy-MM-dd')?'today':''} ${dragOverDate===key?'drag-over':''}`} onDragOver={e=>{e.preventDefault();setDragOverDate(key)}} onDragLeave={()=>setDragOverDate(current=>current===key?null:current)} onDrop={e=>{e.preventDefault();const itemId=e.dataTransfer.getData('text/plain')||draggedItemId;if(itemId)void moveItemToDate(itemId,key)}}><div className="day-number">{format(day,'d')}</div><div className="event-stack">{dayItems.slice(0,6).map(item=><button key={item.id} draggable className={`event ${segmentClass[item.segment]} ${item.type==='important-date'?'important':''} ${draggedItemId===item.id?'dragging':''}`} onDragStart={e=>{setDraggedItemId(item.id);e.dataTransfer.setData('text/plain',item.id);e.dataTransfer.effectAllowed='move'}} onDragEnd={()=>{setDraggedItemId(null);setDragOverDate(null)}} onClick={()=>setSelected(item)}>{item.approvalStatus==='Approved'&&item.type!=='important-date'&&<em className="complete-badge" title="Approved" aria-label="Approved"><CheckCircle2 size={13}/></em>}<strong>{item.title}</strong><span>{item.type==='important-date'?'Important date':item.status}</span>{item.type!=='important-date'&&<small><UserRound size={10}/>{item.assetCreator??item.owner}<i>•</i><CheckCircle2 size={10}/>{item.approvalStatus??'Not required'}{(item.attachments?.length??0)>0&&<><i>•</i><Paperclip size={10}/>{item.attachments?.length}</>}</small>}</button>)}{dayItems.length>6&&<span className="more">+{dayItems.length-6} more</span>}</div></div>})}</div></section>

    <section className="summary-row"><Summary label="Content items this month" value={contentCount}/><Summary label="Waiting for Jenna brief" value={briefCount}/><Summary label="Waiting for Jenna review" value={reviewCount}/><Summary label="Files attached" value={attachedCount}/></section>

    {selected&&<DetailDrawer item={selected} currentPerson={currentPerson} onClose={()=>setSelected(null)} onUpdate={updateItem} onDuplicate={duplicateItem} onDelete={deleteItem}/>} 
    {showCreate&&<CreateModal defaultType={createType} defaultDate={`${monthKey}-01`} onClose={()=>setShowCreate(false)} onCreate={item=>{void updateItem(item);setShowCreate(false)}}/>}
    <div className={`floating-create ${showCreateMenu?'open':''}`}>
      {showCreateMenu&&<div className="floating-create-menu" role="menu" aria-label="Create new item">
        <button role="menuitem" onClick={()=>{setShowCreateMenu(false);openCreate('campaign')}}><Plus size={17}/><span><strong>New Campaign</strong><small>Planned marketing activity</small></span></button>
        <button role="menuitem" onClick={()=>{setShowCreateMenu(false);openCreate('ticket')}}><Ticket size={17}/><span><strong>New Ticket</strong><small>Ad hoc task or request</small></span></button>
        <button role="menuitem" onClick={()=>{setShowCreateMenu(false);openCreate('important-date')}}><CalendarDays size={17}/><span><strong>Important Date</strong><small>Add a key calendar date</small></span></button>
      </div>}
      <button className="floating-new-campaign" aria-expanded={showCreateMenu} aria-haspopup="menu" onClick={()=>setShowCreateMenu(value=>!value)}><Plus size={20}/>New Campaign<ChevronDown size={17}/></button>
    </div>
  </main>
}

function applyChannelOwnership(item:PlannerItem):PlannerItem{
  if(item.channel!=='LinkedIn')return item;
  return {...item,owner:'Kieren',briefOwner:'Jenna',assetCreator:'Kieren',accountable:'Jenna',approver:'Jenna',publisher:'Jenna',approvalStatus:item.approvalStatus==='Not required'?'Awaiting approval':item.approvalStatus};
}
function isRemovedTradeOemBlog(item:PlannerItem){return item.id.includes('-trade-oem-blog-')||(/^Trade \/ OEM Blog/i.test(item.title)&&item.channel==='Website')}
function mergeItems(base:PlannerItem[],saved:PlannerItem[]){const map=new Map(base.filter(item=>!isRemovedTradeOemBlog(item)).map(item=>[item.id,applyChannelOwnership(item)]));saved.filter(item=>!isRemovedTradeOemBlog(item)).forEach(item=>map.set(item.id,applyChannelOwnership(item)));return Array.from(map.values())}

function Select({label,value,options,onChange}:{label:string,value:string,options:string[],onChange:(v:string)=>void}){return <label className="select"><span>{label}</span><select value={value} onChange={e=>onChange(e.target.value)}>{options.map(o=><option key={o}>{o}</option>)}</select></label>}
function Summary({label,value}:{label:string,value:number}){return <div className="summary"><span>{label}</span><strong>{value}</strong></div>}
async function uploadAttachments(files:FileList|File[]|null):Promise<Attachment[]>{if(!files)return[];const uploaded:Attachment[]=[];for(const file of Array.from(files)){const form=new FormData();form.append('file',file);const response=await fetch('/api/assets',{method:'POST',body:form});const body=await response.json();if(!response.ok)throw new Error(body.error||`Unable to upload ${file.name}`);uploaded.push(body.attachment as Attachment)}return uploaded}
function readableSize(size:number){if(size<1024)return`${size} B`;if(size<1024*1024)return`${(size/1024).toFixed(1)} KB`;return`${(size/(1024*1024)).toFixed(1)} MB`}

function DetailDrawer({item,currentPerson,onClose,onUpdate,onDuplicate,onDelete}:{item:PlannerItem,currentPerson:string,onClose:()=>void,onUpdate:(item:PlannerItem)=>void,onDuplicate:(item:PlannerItem)=>void,onDelete:(item:PlannerItem)=>void}){
  const patch=(changes:Partial<PlannerItem>)=>{
    const normalizedChanges=changes.status==='Changes Required'?{...changes,approvalStatus:'Changes requested' as ApprovalStatus}:changes;
    const updated={...item,...normalizedChanges};
    onUpdate(updated);
  };
  const addFiles=async(files:FileList|null)=>{try{const uploaded=await uploadAttachments(files);patch({attachments:[...(item.attachments??[]),...uploaded]})}catch(error){window.alert(error instanceof Error?error.message:'Unable to upload files')}};
  const removeFile=async(id:string)=>{const file=(item.attachments??[]).find(entry=>entry.id===id);patch({attachments:(item.attachments??[]).filter(entry=>entry.id!==id)});if(file?.downloadUrl)void fetch(`/api/assets?id=${encodeURIComponent(id)}`,{method:'DELETE'})};
  return <div className="overlay" onMouseDown={onClose}><aside className="drawer" onMouseDown={e=>e.stopPropagation()}><div className="drawer-head"><div><span className="eyebrow">{item.type.replace('-',' ')}</span><h3>{item.title}</h3></div><button className="icon-btn" onClick={onClose}><X size={20}/></button></div><div className={`segment-strip ${segmentClass[item.segment]}`}>{item.segment}</div>
    <section className="drawer-section item-title-editor"><label><span>Calendar card title</span><input value={item.title} onChange={e=>patch({title:e.target.value})} placeholder="Name this campaign, blog or content item"/></label><small>This title appears on the calendar card and can be updated at any time.</small></section>
    <dl className="details"><div><dt>Date</dt><dd>{format(parseISO(item.date),'d MMMM yyyy')}</dd></div>{item.endDate&&<div><dt>End date</dt><dd>{format(parseISO(item.endDate),'d MMMM yyyy')}</dd></div>}<div><dt>Channel</dt><dd>{item.type==='important-date'?'Important date':item.channel}</dd></div><div><dt>Priority</dt><dd>{item.priority}</dd></div></dl>
    {item.type!=='important-date'&&<section className="drawer-section workflow-editor"><h4>Workflow and ownership</h4><div className="edit-grid"><FieldSelect label="Workflow stage" value={item.status} options={statuses.slice(1)} onChange={v=>patch({status:v as Status})}/><FieldSelect label="Brief owner" value={item.briefOwner??'Jenna'} options={people} onChange={v=>patch({briefOwner:v})}/><FieldSelect label="Asset creator" value={item.assetCreator??item.owner} options={people} onChange={v=>patch({assetCreator:v,owner:v})}/><FieldSelect label="Approver" value={item.approver??'Jenna'} options={people} onChange={v=>patch({approver:v})}/><FieldSelect label="Approval status" value={item.approvalStatus??'Awaiting approval'} options={approvalStatuses.slice(1)} onChange={v=>patch({approvalStatus:v as ApprovalStatus})}/><FieldSelect label="Publisher" value={item.publisher??'Kieren'} options={people} onChange={v=>patch({publisher:v})}/></div></section>}
    <section className="drawer-section"><h4>Scope of work</h4><p>{item.description}</p></section>
    {item.type!=='important-date'&&item.channel==='Email'&&<DotdigitalPanel item={item} onUpdate={onUpdate}/>}
    {item.type!=='important-date'&&item.channel==='Organic'&&<MetaPanel item={item} onUpdate={onUpdate}/>}
    {item.type!=='important-date'&&item.channel==='LinkedIn'&&<LinkedInPanel item={item} onUpdate={onUpdate}/>}
    {item.type!=='important-date'&&item.channel!=='Email'&&<SharedHtmlPreview item={item} onUpdate={onUpdate}/>}
    {item.type!=='important-date'&&<CollaborationPanel item={item} currentPerson={currentPerson} onUpdate={onUpdate}/>}
    {item.type!=='important-date'&&<section className="drawer-section"><div className="section-heading"><div><h4>Briefs, drafts and assets</h4><p>Jenna uploads briefs. Kieren uploads working and final assets. Keep revisions together on this item.</p></div><label className="upload-button"><UploadCloud size={17}/>Upload files<input type="file" multiple onChange={e=>{void addFiles(e.target.files);e.currentTarget.value=''}}/></label></div><div className="file-list">{(item.attachments??[]).length===0?<div className="empty-files"><FileText size={22}/><span>No files uploaded yet</span></div>:(item.attachments??[]).map(file=><div className="file-row" key={file.id}><FileText size={18}/><div><strong>{file.name}</strong><span>{readableSize(file.size)} · {new Date(file.uploadedAt).toLocaleDateString('en-AU')}</span></div><div className="file-actions">{file.downloadUrl&&<a href={file.downloadUrl} download aria-label={`Download ${file.name}`} title="Download asset"><Download size={16}/></a>}<button onClick={()=>void removeFile(file.id)} aria-label={`Remove ${file.name}`} title="Remove asset"><Trash2 size={16}/></button></div></div>)}</div></section>}
    <section className="drawer-item-actions"><button className="btn secondary" onClick={()=>onDuplicate(item)}><Copy size={16}/>Duplicate card</button><button className="btn danger" onClick={()=>onDelete(item)}><Trash2 size={16}/>Remove item</button></section>
  </aside></div>
}

function FieldSelect({label,value,options,onChange}:{label:string,value:string,options:string[],onChange:(v:string)=>void}){return <label><span>{label}</span><select value={value} onChange={e=>onChange(e.target.value)}>{options.map(o=><option key={o}>{o}</option>)}</select></label>}

function CreateModal({defaultType,defaultDate,onClose,onCreate}:{defaultType:ItemType,defaultDate:string,onClose:()=>void,onCreate:(i:PlannerItem)=>void}){
  const [form,setForm]=useState({title:'',type:defaultType,date:defaultDate,channel:'Email' as Channel,segment:'Retail' as Segment,status:(defaultType==='important-date'?'Approved':'Brief Required') as Status,owner:'Kieren',briefOwner:'Jenna',assetCreator:'Kieren',accountable:'Jenna',approver:'Jenna',publisher:'Kieren',approvalStatus:(defaultType==='important-date'?'Not required':'Awaiting approval') as ApprovalStatus,description:'',priority:'Normal' as Priority,attachments:[] as Attachment[]});
  const [pendingFiles,setPendingFiles]=useState<File[]>([]);const [creating,setCreating]=useState(false);
  const update=(key:string,value:string|Attachment[])=>setForm(prev=>({...prev,[key]:value}));
  return <div className="overlay"><form className="modal" onSubmit={async e=>{e.preventDefault();setCreating(true);try{const attachments=pendingFiles.length?await uploadAttachments(pendingFiles):[];onCreate({...form,attachments,id:crypto.randomUUID(),source:form.type==='important-date'?'Retail Calendar':form.type==='ticket'?'Monthly Content Plan':'Monthly Content Plan'} as PlannerItem)}catch(error){window.alert(error instanceof Error?error.message:'Unable to create campaign')}finally{setCreating(false)}}}><div className="drawer-head"><div><span className="eyebrow">Create new</span><h3>{form.type==='campaign'?'Campaign':form.type==='ticket'?'Ad hoc ticket':'Important date'}</h3></div><button type="button" className="icon-btn" onClick={onClose}><X size={20}/></button></div><div className="form-grid">
    <label className="full"><span>Title</span><input required value={form.title} onChange={e=>update('title',e.target.value)} placeholder={form.type==='ticket'?'e.g. Update dealer landing page':form.type==='important-date'?'e.g. Melbourne Cup Day':'e.g. September dealer EDM'}/></label><label><span>Type</span><select value={form.type} onChange={e=>update('type',e.target.value)}><option value="campaign">Campaign</option><option value="ticket">Ad hoc ticket</option><option value="important-date">Important date</option></select></label><label><span>Date</span><input type="date" value={form.date} onChange={e=>update('date',e.target.value)}/></label><label><span>Channel</span><select value={form.channel} onChange={e=>update('channel',e.target.value)}>{channels.slice(1).map(o=><option key={o}>{o}</option>)}</select></label><label><span>Segment</span><select value={form.segment} onChange={e=>update('segment',e.target.value)}>{segments.slice(1).map(o=><option key={o}>{o}</option>)}</select></label><label><span>Workflow stage</span><select value={form.status} onChange={e=>update('status',e.target.value)}>{statuses.slice(1).map(o=><option key={o}>{o}</option>)}</select></label><label><span>Brief owner</span><select value={form.briefOwner} onChange={e=>update('briefOwner',e.target.value)}>{people.map(o=><option key={o}>{o}</option>)}</select></label><label><span>Asset creator</span><select value={form.assetCreator} onChange={e=>{update('assetCreator',e.target.value);update('owner',e.target.value)}}>{people.map(o=><option key={o}>{o}</option>)}</select></label><label><span>Approver</span><select value={form.approver} onChange={e=>update('approver',e.target.value)}>{people.map(o=><option key={o}>{o}</option>)}</select></label><label><span>Approval status</span><select value={form.approvalStatus} onChange={e=>update('approvalStatus',e.target.value)}>{approvalStatuses.slice(1).map(o=><option key={o}>{o}</option>)}</select></label><label><span>Publisher</span><select value={form.publisher} onChange={e=>update('publisher',e.target.value)}>{people.map(o=><option key={o}>{o}</option>)}</select></label><label><span>Priority</span><select value={form.priority} onChange={e=>update('priority',e.target.value)}>{['Low','Normal','High','Urgent'].map(o=><option key={o}>{o}</option>)}</select></label><label className="full"><span>Scope of work</span><textarea required rows={5} value={form.description} onChange={e=>update('description',e.target.value)} placeholder={form.type==='ticket'?'Describe the ad hoc task, owner, deadline and required outcome.':form.type==='important-date'?'Add any notes about why this date matters.':'Jenna outlines the objective, audience, key message, offer, CTA and required formats.'}/></label><label className="full file-input"><span>Briefs, drafts and assets</span><input type="file" multiple onChange={e=>setPendingFiles(Array.from(e.target.files??[]))}/>{pendingFiles.length>0&&<small>{pendingFiles.length} file(s) ready to upload</small>}</label>
  </div><div className="modal-actions"><button type="button" className="btn secondary" onClick={onClose}>Cancel</button><button className="btn primary" type="submit" disabled={creating}>{creating?'Creating…':'Create item'}</button></div></form></div>
}
