'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Mail, RefreshCw, Send, X, XCircle } from 'lucide-react';
import { formatMelbourne } from '@/lib/time';

type OutlookStatus = {configured:boolean;connected:boolean;email?:string};
type DeliveryLog = {id:string;to:string;subject:string;status:'sent'|'failed';message:string;createdAt:string};

export default function OutlookConnection(){
  const [status,setStatus]=useState<OutlookStatus|null>(null);
  const [open,setOpen]=useState(false);
  const [to,setTo]=useState('');
  const [busy,setBusy]=useState(false);
  const [result,setResult]=useState<{ok:boolean;message:string}|null>(null);
  const [logs,setLogs]=useState<DeliveryLog[]>([]);
  const [connectionError,setConnectionError]=useState<{stage:string;reason:string}|null>(null);

  const load=useCallback(async()=>{
    try{
      const [statusResponse,logResponse]=await Promise.all([
        fetch('/api/microsoft/status',{cache:'no-store'}),
        fetch('/api/microsoft/delivery-log',{cache:'no-store'})
      ]);
      const statusBody=await statusResponse.json() as OutlookStatus;
      const logBody=await logResponse.json() as {logs?:DeliveryLog[]};
      setStatus(statusBody);
      setLogs(logBody.logs||[]);
      if(statusBody.email)setTo(current=>current||statusBody.email||'');
    }catch{}
  },[]);

  useEffect(()=>{
    void load();
    const params=new URLSearchParams(window.location.search);
    if(params.get('outlook')==='error'){
      setConnectionError({stage:params.get('outlook_stage')||'Connection',reason:params.get('outlook_reason')||'Microsoft returned an unknown error.'});
    }
  },[load]);

  async function sendTest(){
    setBusy(true);setResult(null);
    try{
      const response=await fetch('/api/microsoft/test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to})});
      const body=await response.json();
      setResult({ok:response.ok,message:response.ok?`${body.message} Sent to ${body.to}.`:body.error||'Test email failed.'});
      await load();
    }catch(error){setResult({ok:false,message:error instanceof Error?error.message:'Test email failed.'})}
    finally{setBusy(false)}
  }

  async function disconnect(){
    if(!window.confirm('Disconnect Outlook notifications?'))return;
    await fetch('/api/microsoft/disconnect',{method:'POST'});
    setOpen(false);setResult(null);await load();
  }

  if(!status)return <span className="save-indicator">Checking Outlook…</span>;
  if(!status.configured)return <span className="save-indicator local">Outlook variables missing</span>;
  if(!status.connected)return <div className="outlook-connect-wrap"><a className="btn secondary" href="/api/microsoft/connect"><Mail size={16}/>Connect Outlook</a>{connectionError&&<button className="outlook-error-chip" onClick={()=>setOpen(true)}><XCircle size={15}/>Connection failed</button>}{open&&connectionError&&<div className="overlay" onMouseDown={()=>setOpen(false)}><aside className="notification-drawer outlook-drawer" onMouseDown={event=>event.stopPropagation()}><div className="drawer-head"><div><span className="eyebrow">Microsoft Outlook</span><h3>Connection diagnostic</h3></div><button className="icon-btn" onClick={()=>setOpen(false)} aria-label="Close"><X size={20}/></button></div><div className="outlook-result error outlook-connection-error"><XCircle size={18}/><div><strong>{connectionError.stage}</strong><span>{connectionError.reason}</span></div></div><p className="outlook-help">The dashboard has not stored an Outlook token. Correct the issue shown above, then start the connection again.</p><a className="btn primary" href="/api/microsoft/connect"><Mail size={15}/>Try Outlook connection again</a></aside></div>}</div>;

  return <>
    <button className="btn secondary" title={status.email||'Outlook connected'} onClick={()=>{setOpen(true);void load()}}><Mail size={16}/>Outlook connected</button>
    {open&&<div className="overlay" onMouseDown={()=>setOpen(false)}>
      <aside className="notification-drawer outlook-drawer" onMouseDown={event=>event.stopPropagation()}>
        <div className="drawer-head"><div><span className="eyebrow">Microsoft Outlook</span><h3>Email notifications</h3></div><button className="icon-btn" onClick={()=>setOpen(false)} aria-label="Close"><X size={20}/></button></div>
        <div className="outlook-connected"><CheckCircle2 size={18}/><div><strong>Connected</strong><span>{status.email}</span></div></div>
        <section className="outlook-test-card">
          <h4>Send a test email</h4>
          <p>This confirms Microsoft Graph can send from the connected Outlook account.</p>
          <label>Recipient email<input type="email" value={to} onChange={event=>setTo(event.target.value)} placeholder="name@nce.com.au"/></label>
          <button className="btn primary" disabled={busy||!to.trim()} onClick={()=>void sendTest()}>{busy?<RefreshCw className="spin" size={15}/>:<Send size={15}/>} {busy?'Sending…':'Send test email'}</button>
          {result&&<div className={`outlook-result ${result.ok?'success':'error'}`}>{result.ok?<CheckCircle2 size={17}/>:<XCircle size={17}/>}<span>{result.message}</span></div>}
        </section>
        <section className="outlook-log"><div className="outlook-log-head"><h4>Recent delivery log</h4><button onClick={()=>void load()}><RefreshCw size={14}/>Refresh</button></div>
          {logs.length===0?<p className="empty-centre">No Outlook delivery attempts recorded yet.</p>:logs.slice(0,20).map(item=><article key={item.id} className={item.status}><div>{item.status==='sent'?<CheckCircle2 size={16}/>:<XCircle size={16}/>}<strong>{item.status==='sent'?'Accepted by Microsoft':'Failed'}</strong></div><p>{item.subject}</p><span>To: {item.to}</span><span>{formatMelbourne(item.createdAt)}</span>{item.status==='failed'&&<small>{item.message}</small>}</article>)}
        </section>
        <button className="outlook-disconnect" onClick={()=>void disconnect()}>Disconnect Outlook</button>
      </aside>
    </div>}
  </>
}
