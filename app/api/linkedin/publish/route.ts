import {NextResponse} from 'next/server';
import {linkedinConfig,linkedinFetch,uploadLinkedinImage} from '@/lib/linkedin';
import {createNotification,recordPublishFailure} from '@/lib/ops';
export const maxDuration=60;

export async function POST(request:Request){
  let job:any={};
  try{
    const auth=request.headers.get('authorization');
    const qstashToken=process.env.QSTASH_TOKEN;
    if(!qstashToken||auth!==`Bearer ${qstashToken}`) return NextResponse.json({error:'Unauthorised'},{status:401});
    job=await request.json();
    const config=linkedinConfig();
    if(!config.organizationId) throw new Error('LINKEDIN_ORGANIZATION_ID is missing.');
    const author=`urn:li:organization:${config.organizationId}`;
    const mediaUrls=Array.isArray(job.mediaUrls)?job.mediaUrls.filter(Boolean):[];
    const uploaded=[];
    for(let index=0;index<mediaUrls.length;index+=1){uploaded.push(await uploadLinkedinImage(mediaUrls[index],`NCE post image ${index+1}`));}
    const commentary=[String(job.message||'').trim(),String(job.websiteUrl||'').trim()].filter(Boolean).join('\n\n');
    const payload:any={author,commentary,visibility:'PUBLIC',distribution:{feedDistribution:'MAIN_FEED',targetEntities:[],thirdPartyDistributionChannels:[]},lifecycleState:'PUBLISHED',isReshareDisabledByAuthor:false};
    if(uploaded.length===1) payload.content={media:{id:uploaded[0].id,altText:uploaded[0].altText}};
    if(uploaded.length>1) payload.content={multiImage:{images:uploaded.map(image=>({id:image.id,altText:image.altText}))}};
    const response=await linkedinFetch('/rest/posts',{method:'POST',body:JSON.stringify(payload)});
    await createNotification({person:'Kieren',itemId:job.itemId,title:'LinkedIn post published',message:'The approved LinkedIn post published successfully.'}).catch(()=>{});
    return NextResponse.json({published:true,id:job.id,result:response});
  }catch(error){
    const message=error instanceof Error?error.message:'LinkedIn publish failed';
    await recordPublishFailure({channel:'LinkedIn',itemId:job.itemId,title:'LinkedIn post failed',message,payload:job,endpoint:'/api/linkedin/publish'}).catch(()=>{});
    await createNotification({person:'Kieren',itemId:job.itemId,title:'LinkedIn publishing failed',message}).catch(()=>{});
    return NextResponse.json({error:message},{status:500});
  }
}
