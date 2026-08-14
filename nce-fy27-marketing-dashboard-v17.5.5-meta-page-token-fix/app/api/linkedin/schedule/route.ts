import { getPublicOrigin } from '@/lib/public-url';
import {NextResponse} from 'next/server';
export async function POST(request:Request){
  try{
    const body=await request.json();
    if(body.approvalStatus!=='Approved') return NextResponse.json({error:'Jenna must approve this item before it can be scheduled.'},{status:400});
    if(!body.message?.trim()) return NextResponse.json({error:'LinkedIn post copy is required.'},{status:400});
    const mediaUrls=Array.isArray(body.mediaUrls)?body.mediaUrls.map((url:string)=>url.trim()).filter(Boolean):[];
    if(mediaUrls.length>20) return NextResponse.json({error:'LinkedIn supports a maximum of 20 images in an organic multi-image post.'},{status:400});
    const scheduledAt=new Date(body.scheduledAt);
    if(Number.isNaN(scheduledAt.getTime())) return NextResponse.json({error:'Choose a valid schedule date and time.'},{status:400});
    if(scheduledAt.getTime()<=Date.now()) return NextResponse.json({error:'Publish time must be in the future.'},{status:400});
    const qstashRaw=process.env.QSTASH_URL||'https://qstash.upstash.io';
    const qstashUrl=(/^https?:\/\//i.test(qstashRaw)?qstashRaw:`https://${qstashRaw}`).replace(/\/$/,'');
    const qstashToken=process.env.QSTASH_TOKEN;
    if(!qstashToken) return NextResponse.json({error:'QStash is not configured. Add QSTASH_TOKEN in Vercel.'},{status:500});
    const origin=getPublicOrigin(request);
    const destination=`${origin}/api/linkedin/publish`;
    const delaySeconds=Math.max(1,Math.ceil((scheduledAt.getTime()-Date.now())/1000));
    const id=crypto.randomUUID();
    const job={id,...body,mediaUrls,createdAt:new Date().toISOString(),status:'Scheduled'};
    if(!/^https?:\/\//i.test(destination)) return NextResponse.json({error:`Invalid QStash destination: ${destination}`},{status:500});
    const response=await fetch(`${qstashUrl}/v2/publish/${destination}`,{method:'POST',headers:{Authorization:`Bearer ${qstashToken}`,'Content-Type':'application/json','Upstash-Delay':`${delaySeconds}s`,'Upstash-Retries':'3','Upstash-Forward-Authorization':`Bearer ${qstashToken}`},body:JSON.stringify(job),cache:'no-store'});
    const result=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(result?.error||result?.message||`QStash returned ${response.status}`);
    return NextResponse.json({job:{...job,id:result.messageId||id,qstashMessageId:result.messageId||null}});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to schedule LinkedIn post'},{status:500});}
}
