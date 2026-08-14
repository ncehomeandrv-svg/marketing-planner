import { kvCommand, kvConfigured } from '@/lib/kv';

export type MetaScheduleState='Planned'|'Queued'|'Published'|'Failed'|'Cancelled';

export interface StoredMetaJob{
  id:string;
  itemId:string;
  platforms:string[];
  message:string;
  postType:'image'|'carousel'|'video';
  mediaUrls:string[];
  mediaUrl:string;
  scheduledAt:string;
  createdAt:string;
  updatedAt:string;
  status:MetaScheduleState;
  qstashMessageId?:string|null;
  error?:string;
}

const indexKey='nce:meta-scheduled-items';
const jobKey=(itemId:string)=>`nce:meta-scheduled:${itemId}`;

export function metaScheduleConfigured(){return kvConfigured()}

export async function getMetaJob(itemId:string):Promise<StoredMetaJob|null>{
  if(!itemId||!kvConfigured())return null;
  const raw=await kvCommand<string|null>(['GET',jobKey(itemId)]);
  if(!raw)return null;
  try{return JSON.parse(raw) as StoredMetaJob}catch{return null}
}

export async function saveMetaJob(job:StoredMetaJob){
  await kvCommand(['SET',jobKey(job.itemId),JSON.stringify(job)]);
  await kvCommand(['SADD',indexKey,job.itemId]);
  return job;
}

export async function removeMetaJob(itemId:string){
  await kvCommand(['DEL',jobKey(itemId)]);
  await kvCommand(['SREM',indexKey,itemId]);
}

export async function listMetaJobIds():Promise<string[]>{
  if(!kvConfigured())return [];
  return await kvCommand<string[]>(['SMEMBERS',indexKey])||[];
}

export function qstashBaseUrl(){
  const raw=process.env.QSTASH_URL||'https://qstash.upstash.io';
  return (/^https?:\/\//i.test(raw)?raw:`https://${raw}`).replace(/\/$/,'');
}

export function qstashToken(){return process.env.QSTASH_TOKEN||''}

export async function queueMetaJob(job:StoredMetaJob,destination:string){
  const token=qstashToken();
  if(!token)throw new Error('QStash is not configured. Add QSTASH_TOKEN in Vercel.');
  if(!/^https?:\/\//i.test(destination))throw new Error(`Invalid QStash destination: ${destination}`);
  const notBefore=Math.max(Math.floor(Date.now()/1000)+1,Math.floor(new Date(job.scheduledAt).getTime()/1000));
  const response=await fetch(`${qstashBaseUrl()}/v2/publish/${destination}`,{
    method:'POST',
    headers:{
      Authorization:`Bearer ${token}`,
      'Content-Type':'application/json',
      'Upstash-Not-Before':String(notBefore),
      'Upstash-Retries':'3',
      'Upstash-Forward-Authorization':`Bearer ${token}`,
    },
    body:JSON.stringify(job),
    cache:'no-store',
  });
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(result?.error||result?.message||`QStash returned ${response.status}`);
  return String(result.messageId||'');
}

export async function cancelQstashMessage(messageId:string){
  const token=qstashToken();
  if(!token)throw new Error('QStash is not configured.');
  const response=await fetch(`${qstashBaseUrl()}/v2/messages/${encodeURIComponent(messageId)}`,{
    method:'DELETE',headers:{Authorization:`Bearer ${token}`},cache:'no-store'
  });
  if(response.status===404)return;
  if(!response.ok){
    const result=await response.json().catch(()=>({}));
    throw new Error(result?.error||result?.message||`QStash cancellation returned ${response.status}`);
  }
}

export async function ensureMetaDispatcher(destination:string){
  const token=qstashToken();
  if(!token)throw new Error('QStash is not configured. Add QSTASH_TOKEN in Vercel.');
  if(!/^https?:\/\//i.test(destination))throw new Error(`Invalid dispatcher destination: ${destination}`);
  const response=await fetch(`${qstashBaseUrl()}/v2/schedules/${destination}`,{
    method:'POST',
    headers:{
      Authorization:`Bearer ${token}`,
      'Content-Type':'application/json',
      'Upstash-Cron':'*/15 * * * *',
      'Upstash-Schedule-Id':'nce-meta-long-range-dispatcher',
      'Upstash-Retries':'2',
      'Upstash-Forward-Authorization':`Bearer ${token}`,
    },
    body:JSON.stringify({source:'NCE Marketing Planner'}),
    cache:'no-store',
  });
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(result?.error||result?.message||`Unable to create dispatcher schedule (${response.status})`);
  return result.scheduleId as string|undefined;
}
