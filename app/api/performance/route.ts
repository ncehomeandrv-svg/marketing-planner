import { NextRequest } from 'next/server';
import { getMetaJob } from '@/lib/meta-schedule';
import { metaConfig, metaFetch, resolveFacebookPageToken } from '@/lib/meta';

export const dynamic='force-dynamic';
export const runtime='nodejs';
const ANALYTICS_URL='https://nce-ads-control-centre.vercel.app/api/planner-performance';

function clean(value:unknown){return String(value??'').trim()}
function norm(value:unknown){return clean(value).toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim()}
function tokens(value:string){const stop=new Set(['the','and','for','with','from','sale','campaign','nce','new','final','hours','launch','day','meta','post','facebook','instagram','video']);return norm(value).split(' ').filter(t=>t.length>=3&&!stop.has(t))}
function scoreText(text:string,title:string,caption:string){const hay=norm(text),exactCaption=norm(caption),exactTitle=norm(title);if(exactCaption&&hay.includes(exactCaption))return 200;if(exactTitle&&(hay.includes(exactTitle)||exactTitle.includes(hay)))return 100;const wanted=tokens(title);return wanted.filter(t=>hay.includes(t)).length}
function metricValue(payload:any,name:string){const rows=Array.isArray(payload?.data)?payload.data:[];const match=rows.find((row:any)=>row?.name===name);const value=match?.values?.[0]?.value??match?.value??0;return Number(value||0)||0}
async function safeMetric(path:string,name:string,token?:string){try{return metricValue(await metaFetch(`${path}?metric=${encodeURIComponent(name)}`,{},token),name)}catch{return 0}}
async function facebookReactionCount(postId:string,token:string){
  try{
    const payload=await metaFetch(`/${postId}/reactions?limit=0&summary=total_count`,{},token);
    const value=payload?.summary?.total_count;
    return {count:value===undefined||value===null?null:Number(value)||0,error:''};
  }catch(error:any){return {count:null,error:error?.message||'reaction total unavailable'}}
}

async function organicMeta(payload:any){
  const config=metaConfig();if(!config.pageId&&!config.instagramId)throw new Error('Meta organic connection is not configured.');
  const start=clean(payload.start),end=clean(payload.end),title=clean(payload.title),caption=clean(payload.metaCaption),itemId=clean(payload.itemId);
  const job=itemId?await getMetaJob(itemId).catch(()=>null):null;const sources:Record<string,any>={};const warnings:string[]=[];const performance:Record<string,number>={};
  const storedFbId=clean(job?.facebookPostId);const storedIgId=clean(job?.instagramMediaId);let fbId=storedFbId;let igId=storedIgId;let fbMatch='stored publish ID';let igMatch='stored publish ID';
  if(!fbId&&config.pageId){try{const pageToken=await resolveFacebookPageToken();const feed=await metaFetch(`/${config.pageId}/published_posts?fields=id,message,created_time&since=${encodeURIComponent(start+'T00:00:00')}&until=${encodeURIComponent(end+'T23:59:59')}&limit=100`,{},pageToken);const ranked=(feed?.data||[]).map((row:any)=>({row,score:scoreText(row.message||'',title,caption)})).sort((a:any,b:any)=>b.score-a.score);if(ranked[0]?.score>=Math.min(2,Math.max(1,tokens(title).length))){fbId=String(ranked[0].row.id||'');fbMatch='title/caption fallback'}}catch(error:any){warnings.push(`Facebook: ${error?.message||'unable to search posts'}`)}}
  if(!igId&&config.instagramId){try{const media=await metaFetch(`/${config.instagramId}/media?fields=id,caption,timestamp,media_type&since=${encodeURIComponent(start+'T00:00:00')}&until=${encodeURIComponent(end+'T23:59:59')}&limit=100`);const ranked=(media?.data||[]).map((row:any)=>({row,score:scoreText(row.caption||'',title,caption)})).sort((a:any,b:any)=>b.score-a.score);if(ranked[0]?.score>=Math.min(2,Math.max(1,tokens(title).length))){igId=String(ranked[0].row.id||'');igMatch='title/caption fallback'}}catch(error:any){warnings.push(`Instagram: ${error?.message||'unable to search posts'}`)}}
  if(fbId){
    try{
      const pageToken=await resolveFacebookPageToken();
      const row=await metaFetch(`/${fbId}?fields=id,shares,reactions.limit(0).summary(true),comments.limit(0).summary(true)`,{},pageToken);
      const [impressions,reach,engaged,reactionResult]=await Promise.all([
        safeMetric(`/${fbId}/insights`,'post_impressions',pageToken),
        safeMetric(`/${fbId}/insights`,'post_impressions_unique',pageToken),
        safeMetric(`/${fbId}/insights`,'post_engaged_users',pageToken),
        facebookReactionCount(fbId,pageToken),
      ]);
      const embeddedReactions=Number(row?.reactions?.summary?.total_count||0);const reactions=reactionResult.count??embeddedReactions;const comments=Number(row?.comments?.summary?.total_count||0),shares=Number(row?.shares?.count||0);
      if(impressions)performance.impressions=(performance.impressions||0)+impressions;
      if(reach)performance.reach=(performance.reach||0)+reach;
      performance.reactions=(performance.reactions||0)+reactions;
      performance.comments=(performance.comments||0)+comments;
      performance.shares=(performance.shares||0)+shares;
      performance.engagements=(performance.engagements||0)+Math.max(engaged,reactions+comments+shares);
      sources.facebook={matched:1,postId:fbId,matchedBy:fbMatch,reactionSource:reactionResult.count===null?'embedded-summary':'reactions-edge',reactions};
      if(reactionResult.count===null)warnings.push(`Facebook matched post ${fbId} via ${fbMatch}, but the reactions edge was unavailable (${reactionResult.error}). Embedded reaction total used: ${embeddedReactions}.`);
      else warnings.push(`Facebook matched post ${fbId} via ${fbMatch}. Reactions edge returned ${reactionResult.count}.`);
      if(!impressions&&!reach&&!engaged)warnings.push('Facebook: post matched, but Meta did not expose Page-post insight metrics for this post type. Reactions, comments and shares were still pulled.');
    }catch(error:any){warnings.push(`Facebook post metrics: ${error?.message||'unavailable'}`)}
  }else if(config.pageId){warnings.push('Facebook: no published post matched this ticket in the selected date range.')}
  if(igId){try{const row=await metaFetch(`/${igId}?fields=id,media_type,like_count,comments_count`);const [reach,views,totalInteractions,saved,shares]=await Promise.all([safeMetric(`/${igId}/insights`,'reach'),safeMetric(`/${igId}/insights`,'views'),safeMetric(`/${igId}/insights`,'total_interactions'),safeMetric(`/${igId}/insights`,'saved'),safeMetric(`/${igId}/insights`,'shares')]);const likes=Number(row?.like_count||0),comments=Number(row?.comments_count||0);performance.reach=(performance.reach||0)+reach;performance.views=(performance.views||0)+views;performance.likes=(performance.likes||0)+likes;performance.comments=(performance.comments||0)+comments;performance.saves=(performance.saves||0)+saved;performance.shares=(performance.shares||0)+shares;performance.engagements=(performance.engagements||0)+Math.max(totalInteractions,likes+comments+saved+shares);if(String(row?.media_type||'').includes('VIDEO')||String(row?.media_type||'').includes('REELS'))performance.videoViews=(performance.videoViews||0)+views;sources.instagram={matched:1,mediaId:igId,matchedBy:igMatch}}catch(error:any){warnings.push(`Instagram insights: ${error?.message||'unavailable'}`)}}
  if(performance.reach)performance.engagementRate=(performance.engagements||0)/performance.reach;
  const matchedSourceCount=Object.values(sources).length;return {connected:true,start,end,performance,sources,warnings,matchedSourceCount,confidence:matchedSourceCount>=2?'high':matchedSourceCount===1?'medium':'low',note:'Organic social only. Paid Meta advertising is intentionally excluded.'};
}

export async function POST(request:NextRequest){
  try{
    const payload=await request.json();
    const blogText=[payload?.description,payload?.notes,payload?.title].map(clean).join(' ');
    if(/https?:\/\/(?:www\.)?nce\.com\.au\/blog\//i.test(blogText))payload.contentFormat='Blog';
    const channel=clean(payload?.channel),format=clean(payload?.contentFormat);
    if(channel==='Organic'||['Meta Static','Meta Carousel','Meta Video'].includes(format))return Response.json(await organicMeta(payload));
    if(channel==='LinkedIn')return Response.json({connected:true,start:payload.start,end:payload.end,performance:{},sources:{},warnings:['LinkedIn organic analytics are not yet available through the current LinkedIn app permissions.'],matchedSourceCount:0,confidence:'low',note:'LinkedIn tickets use LinkedIn-specific metrics only; no paid advertising data is substituted.'});
    const oidc=request.headers.get('x-vercel-oidc-token')||process.env.VERCEL_OIDC_TOKEN||'';
    if(!oidc)return Response.json({error:'Vercel OIDC is not available for this deployment.'},{status:503});
    const response=await fetch(ANALYTICS_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${oidc}`},body:JSON.stringify(payload),cache:'no-store'});
    const text=await response.text();let body:any={};try{body=text?JSON.parse(text):{}}catch{body={error:text||`Analytics dashboard returned HTTP ${response.status}.`}}return Response.json(body,{status:response.status});
  }catch(error){return Response.json({error:error instanceof Error?error.message:'Unable to pull performance.'},{status:500})}
}
