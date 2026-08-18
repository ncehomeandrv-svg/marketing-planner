import { getPublicOrigin } from '@/lib/public-url';
import { getMetaJob, listMetaJobIds, queueMetaJob, saveMetaJob } from '@/lib/meta-schedule';
import { NextResponse } from 'next/server';

const QUEUE_WINDOW_SECONDS=6*24*60*60;

export async function POST(request:Request){
  const token=process.env.QSTASH_TOKEN||'';
  if(!token||request.headers.get('authorization')!==`Bearer ${token}`)return NextResponse.json({error:'Unauthorised'},{status:401});
  const destination=`${getPublicOrigin(request)}/api/meta/publish`;
  const ids=await listMetaJobIds();
  const results:Array<{itemId:string;status:string;error?:string}>=[];
  for(const itemId of ids){
    const job=await getMetaJob(itemId);
    if(!job||job.status!=='Planned')continue;
    const secondsUntil=Math.ceil((new Date(job.scheduledAt).getTime()-Date.now())/1000);
    if(secondsUntil>QUEUE_WINDOW_SECONDS)continue;
    try{
      const messageId=await queueMetaJob(job,destination);
      await saveMetaJob({...job,status:'Queued',qstashMessageId:messageId,updatedAt:new Date().toISOString(),error:undefined});
      results.push({itemId,status:'Queued'});
    }catch(error){
      const message=error instanceof Error?error.message:'Unable to queue post';
      await saveMetaJob({...job,status:'Failed',error:message,updatedAt:new Date().toISOString()});
      results.push({itemId,status:'Failed',error:message});
    }
  }
  return NextResponse.json({checked:ids.length,results});
}
