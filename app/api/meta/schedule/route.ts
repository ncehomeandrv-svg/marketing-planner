import { getPublicOrigin } from '@/lib/public-url';
import { ensureMetaDispatcher, queueMetaJob, saveMetaJob, type StoredMetaJob } from '@/lib/meta-schedule';
import { NextResponse } from 'next/server';

const MAX_DIRECT_DELAY_SECONDS=604800;
const DIRECT_QUEUE_MARGIN_SECONDS=3600;

export async function POST(request:Request){
  try{
    const body=await request.json();
    if(body.approvalStatus!=='Approved')return NextResponse.json({error:'Jenna must approve this item before it can be scheduled.'},{status:400});
    if(!body.itemId)return NextResponse.json({error:'This calendar item is missing an ID.'},{status:400});
    if(!body.message?.trim())return NextResponse.json({error:'Post copy is required.'},{status:400});
    if(!Array.isArray(body.platforms)||body.platforms.length===0)return NextResponse.json({error:'Select Facebook and/or Instagram.'},{status:400});
    const postType=body.postType||'image';
    const mediaUrls=Array.isArray(body.mediaUrls)?body.mediaUrls.filter(Boolean):(body.mediaUrl?[body.mediaUrl]:[]);
    if(postType==='carousel'&&mediaUrls.length<2)return NextResponse.json({error:'Carousel posts require at least two images.'},{status:400});
    if(postType!=='carousel'&&mediaUrls.length<1)return NextResponse.json({error:'Add at least one final scheduling image.'},{status:400});
    const scheduledAt=new Date(body.scheduledAt);
    if(Number.isNaN(scheduledAt.getTime()))return NextResponse.json({error:'Choose a valid schedule date and time.'},{status:400});
    if(scheduledAt.getTime()<=Date.now())return NextResponse.json({error:'Publish time must be in the future.'},{status:400});

    const origin=getPublicOrigin(request);
    const publishDestination=`${origin}/api/meta/publish`;
    const dispatcherDestination=`${origin}/api/meta/dispatcher`;
    const secondsUntil=Math.ceil((scheduledAt.getTime()-Date.now())/1000);
    const now=new Date().toISOString();
    let job:StoredMetaJob={
      id:crypto.randomUUID(),itemId:String(body.itemId),platforms:body.platforms,message:String(body.message),
      postType,mediaUrls,mediaUrl:mediaUrls[0],scheduledAt:scheduledAt.toISOString(),createdAt:now,updatedAt:now,status:'Planned',qstashMessageId:null
    };

    if(secondsUntil<=MAX_DIRECT_DELAY_SECONDS-DIRECT_QUEUE_MARGIN_SECONDS){
      const messageId=await queueMetaJob(job,publishDestination);
      job={...job,status:'Queued',qstashMessageId:messageId,updatedAt:new Date().toISOString()};
    }else{
      await ensureMetaDispatcher(dispatcherDestination);
    }
    await saveMetaJob(job);
    return NextResponse.json({job,longRange:job.status==='Planned'});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:'Unable to schedule Meta post'},{status:500});
  }
}
