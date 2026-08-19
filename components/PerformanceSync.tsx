'use client';

import { useMemo, useState } from 'react';
import { addDays, format, parseISO } from 'date-fns';
import { BarChart3, RefreshCw } from 'lucide-react';
import type { PlannerItem, PlannerPerformance } from '@/lib/types';

type SyncResponse={
  performance?:PlannerPerformance;
  sources?:Record<string,{matched?:number;metrics?:Record<string,number>}>;
  warnings?:string[];
  confidence?:'high'|'medium'|'low';
  matchedSourceCount?:number;
  note?:string;
  error?:string;
};

export default function PerformanceSync({item,onUpdate}:{item:PlannerItem;onUpdate:(item:PlannerItem)=>void}){
  const fallbackEnd=useMemo(()=>format(addDays(parseISO(item.date),6),'yyyy-MM-dd'),[item.date]);
  const [start,setStart]=useState(item.performance?.analyticsWindowStart||item.date);
  const [end,setEnd]=useState(item.performance?.analyticsWindowEnd||item.endDate||fallbackEnd);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [warnings,setWarnings]=useState<string[]>([]);
  const [sources,setSources]=useState<string[]>(item.performance?.analyticsSources??[]);

  async function pull(){
    setBusy(true);setMessage('');setWarnings([]);
    try{
      const response=await fetch('/api/performance',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          start,end,title:item.title,channel:item.channel,contentFormat:item.contentFormat,
          productSkus:item.productSkus??[],dotdigitalCampaignId:item.dotdigitalCampaignId,
          dotdigitalCampaignName:item.dotdigitalCampaignName
        })
      });
      const text=await response.text();let body:SyncResponse={};
      try{body=text?JSON.parse(text):{}}catch{throw new Error(text||'Unable to read analytics response.')}
      if(!response.ok)throw new Error(body.error||'Unable to pull campaign performance.');
      const matchedSources=Object.entries(body.sources??{}).filter(([,source])=>Number(source?.matched||0)>0).map(([name])=>name);
      const current=item.performance??{};
      const pulled=body.performance??{};
      const next:PlannerPerformance={
        ...current,...pulled,
        analyticsLastSyncedAt:new Date().toISOString(),
        analyticsConfidence:body.confidence,
        analyticsWindowStart:start,
        analyticsWindowEnd:end,
        analyticsSources:matchedSources
      };
      setWarnings(body.warnings??[]);setSources(matchedSources);
      setMessage(matchedSources.length?`Pulled from ${matchedSources.length} matched source${matchedSources.length===1?'':'s'}.`:'No strong analytics match found.');
      onUpdate({...item,performance:next});
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to pull performance.')}finally{setBusy(false)}
  }

  return <div className="performance-sync">
    <div className="performance-sync-head"><div><BarChart3 size={17}/><span><strong>Marketing dashboard sync</strong><small>Read-only pull from the NCE analytics dashboard.</small></span></div><button type="button" className="btn secondary" onClick={()=>void pull()} disabled={busy}><RefreshCw size={15} className={busy?'spin':''}/>{busy?'Pulling…':item.performance?.analyticsLastSyncedAt?'Refresh results':'Pull performance'}</button></div>
    <div className="performance-window"><label><span>Stats from</span><input type="date" value={start} onChange={e=>setStart(e.target.value)}/></label><label><span>Stats to</span><input type="date" value={end} onChange={e=>setEnd(e.target.value)}/></label></div>
    {item.performance?.analyticsLastSyncedAt&&<small className="sync-meta">Last synced {new Date(item.performance.analyticsLastSyncedAt).toLocaleString('en-AU')} · Confidence: {item.performance.analyticsConfidence??'unknown'}{sources.length?` · ${sources.join(', ')}`:''}</small>}
    {message&&<p className="sync-message">{message}</p>}
    {warnings.length>0&&<div className="sync-warnings">{warnings.map(warning=><small key={warning}>{warning}</small>)}</div>}
  </div>
}
