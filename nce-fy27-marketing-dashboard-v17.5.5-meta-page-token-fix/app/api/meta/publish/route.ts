import { NextResponse } from 'next/server';
import { metaConfig, metaFetch, metaFormFetch, resolveFacebookPageToken } from '@/lib/meta';
import { createNotification, recordPublishFailure } from '@/lib/ops';
import { getMetaJob, saveMetaJob } from '@/lib/meta-schedule';

export const maxDuration = 60;

async function waitForInstagramContainer(containerId:string){
  for(let attempt=0;attempt<12;attempt+=1){
    const state=await metaFetch(`/${containerId}?fields=status_code,status`);
    if(state.status_code==='FINISHED') return;
    if(state.status_code==='ERROR'||state.status_code==='EXPIRED') throw new Error(state.status||`Instagram media processing ${state.status_code}`);
    await new Promise(resolve=>setTimeout(resolve,2500));
  }
  throw new Error('Instagram media is still processing. Meta did not finish before the publish timeout.');
}

async function assertPublicMedia(url:string, expected:'image'|'video'){
  if(!/^https:\/\//i.test(url)) throw new Error(`Meta media URL must use https://. Received: ${url}`);
  const response=await fetch(url,{method:'GET',headers:{Range:'bytes=0-2047'},cache:'no-store',redirect:'follow'});
  if(!response.ok) throw new Error(`Meta could not download the scheduled ${expected}. Media URL returned HTTP ${response.status}.`);
  const type=(response.headers.get('content-type')||'').toLowerCase();
  if(expected==='image'&&!type.startsWith('image/')) throw new Error(`Scheduled asset is not being served as an image. Content-Type: ${type||'missing'}.`);
  if(expected==='video'&&!type.startsWith('video/')) throw new Error(`Scheduled asset is not being served as a video. Content-Type: ${type||'missing'}.`);
}

async function publishFacebook(config:ReturnType<typeof metaConfig>,job:any,mediaUrls:string[],postType:string){
  const pageToken=await resolveFacebookPageToken();
  if(postType==='video'){
    await assertPublicMedia(mediaUrls[0],'video');
    return metaFormFetch(`/${config.pageId}/videos`,{file_url:mediaUrls[0],description:job.message,published:true},pageToken);
  }
  if(postType==='carousel'){
    const uploaded=[];
    for(const url of mediaUrls){
      await assertPublicMedia(url,'image');
      const photo=await metaFormFetch(`/${config.pageId}/photos`,{url,published:false},pageToken);
      uploaded.push({media_fbid:photo.id});
    }
    return metaFormFetch(`/${config.pageId}/feed`,{message:job.message,attached_media:JSON.stringify(uploaded),published:true},pageToken);
  }
  await assertPublicMedia(mediaUrls[0],'image');
  return metaFormFetch(`/${config.pageId}/photos`,{url:mediaUrls[0],caption:job.message,published:true},pageToken);
}

async function publishInstagram(config:ReturnType<typeof metaConfig>,job:any,mediaUrls:string[],postType:string){
  if(!config.instagramId) throw new Error('META_INSTAGRAM_BUSINESS_ID is missing.');
  if(postType==='video'){
    await assertPublicMedia(mediaUrls[0],'video');
    const container=await metaFormFetch(`/${config.instagramId}/media`,{media_type:'REELS',video_url:mediaUrls[0],caption:job.message,share_to_feed:true});
    await waitForInstagramContainer(container.id);
    return metaFormFetch(`/${config.instagramId}/media_publish`,{creation_id:container.id});
  }
  if(postType==='carousel'){
    const children=[];
    for(const imageUrl of mediaUrls){
      await assertPublicMedia(imageUrl,'image');
      const child=await metaFormFetch(`/${config.instagramId}/media`,{image_url:imageUrl,is_carousel_item:true});
      await waitForInstagramContainer(child.id);
      children.push(child.id);
    }
    const parent=await metaFormFetch(`/${config.instagramId}/media`,{media_type:'CAROUSEL',children:JSON.stringify(children),caption:job.message});
    await waitForInstagramContainer(parent.id);
    return metaFormFetch(`/${config.instagramId}/media_publish`,{creation_id:parent.id});
  }
  await assertPublicMedia(mediaUrls[0],'image');
  const container=await metaFormFetch(`/${config.instagramId}/media`,{image_url:mediaUrls[0],caption:job.message});
  await waitForInstagramContainer(container.id);
  return metaFormFetch(`/${config.instagramId}/media_publish`,{creation_id:container.id});
}

async function publish(job:any){
  const config=metaConfig();
  const results:Record<string,unknown>={};
  const mediaUrls=Array.isArray(job.mediaUrls)?job.mediaUrls.filter(Boolean):(job.mediaUrl?[job.mediaUrl]:[]);
  const postType=job.postType||'image';
  if(mediaUrls.length===0) throw new Error('No final Meta asset is attached. Upload the final image or video before scheduling.');
  if(job.platforms.includes('Facebook')) results.facebook=await publishFacebook(config,job,mediaUrls,postType);
  if(job.platforms.includes('Instagram')) results.instagram=await publishInstagram(config,job,mediaUrls,postType);
  return results;
}

export async function POST(request:Request){
  let job:any={};
  try{
    const auth=request.headers.get('authorization');
    const qstashToken=process.env.QSTASH_TOKEN;
    if(!qstashToken||auth!==`Bearer ${qstashToken}`) return NextResponse.json({error:'Unauthorised'},{status:401});
    job=await request.json();
    const results=await publish(job);
    if(job.itemId){const stored=await getMetaJob(job.itemId).catch(()=>null);if(stored)await saveMetaJob({...stored,status:'Published',updatedAt:new Date().toISOString(),error:undefined}).catch(()=>{});}
    await createNotification({person:'Kieren',itemId:job.itemId,title:'Meta post published',message:'The approved Facebook/Instagram post published successfully.'}).catch(()=>{});
    return NextResponse.json({published:true,id:job.id,results});
  }catch(error){
    const message=error instanceof Error?error.message:'Meta publish failed';
    if(job.itemId){const stored=await getMetaJob(job.itemId).catch(()=>null);if(stored)await saveMetaJob({...stored,status:'Failed',updatedAt:new Date().toISOString(),error:message}).catch(()=>{});}
    await recordPublishFailure({channel:'Meta',itemId:job.itemId,title:'Meta post failed',message,payload:job,endpoint:'/api/meta/publish'}).catch(()=>{});
    await createNotification({person:'Kieren',itemId:job.itemId,title:'Meta publishing failed',message}).catch(()=>{});
    return NextResponse.json({error:message},{status:500});
  }
}
