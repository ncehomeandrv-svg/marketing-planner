import { cancelQstashMessage, getMetaJob, removeMetaJob } from '@/lib/meta-schedule';
import { NextResponse } from 'next/server';

export async function GET(request:Request){
  const itemId=new URL(request.url).searchParams.get('itemId')||'';
  return NextResponse.json({job:await getMetaJob(itemId)});
}

export async function DELETE(request:Request){
  try{
    const body=await request.json().catch(()=>({}));
    const itemId=String(body.itemId||'');
    if(!itemId)return NextResponse.json({error:'Item ID is required.'},{status:400});
    const job=await getMetaJob(itemId);
    if(!job)return NextResponse.json({unscheduled:true});
    if(job.status==='Published')return NextResponse.json({error:'This post has already been published and cannot be unscheduled.'},{status:400});
    if(job.qstashMessageId)await cancelQstashMessage(job.qstashMessageId);
    await removeMetaJob(itemId);
    return NextResponse.json({unscheduled:true});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:'Unable to unschedule post'},{status:500});
  }
}
