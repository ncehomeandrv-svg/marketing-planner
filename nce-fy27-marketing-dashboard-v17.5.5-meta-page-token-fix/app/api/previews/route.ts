import { NextResponse } from 'next/server';
import { kvCommand, kvConfigured } from '@/lib/kv';

const MAX_HTML_BYTES=900_000;
const DATA_MEDIA=/data:(image\/(?:png|jpeg|jpg|webp|gif)|video\/(?:mp4|webm));base64,([A-Za-z0-9+/=]+)/gi;
const TAG_MEDIA=/<(?:img|video|source)[^>]+(?:src|poster)=["']([^"']+)["'][^>]*>/gi;

function extensionFor(type:string){
  if(type.includes('jpeg')||type.includes('jpg')) return 'jpg';
  if(type.includes('webp')) return 'webp';
  if(type.includes('gif')) return 'gif';
  if(type.includes('mp4')) return 'mp4';
  if(type.includes('webm')) return 'webm';
  return 'png';
}

export async function POST(request:Request){
  try{
    if(!kvConfigured()) return NextResponse.json({error:'Shared preview storage is not configured.'},{status:503});
    const form=await request.formData();
    const file=form.get('file');
    const itemId=String(form.get('itemId')||'').trim();
    if(!(file instanceof File) || !itemId) return NextResponse.json({error:'An HTML file and calendar item are required.'},{status:400});
    if(!file.name.toLowerCase().endsWith('.html') && !file.name.toLowerCase().endsWith('.htm')) return NextResponse.json({error:'Upload an HTML file.'},{status:400});
    if(file.size>MAX_HTML_BYTES) return NextResponse.json({error:'HTML preview files must be under 900 KB.'},{status:413});
    const html=await file.text();
    const previewId=`${itemId}-${crypto.randomUUID()}`;
    const mediaUrls:string[]=[];
    let dataIndex=0;
    let match:RegExpExecArray|null;
    while((match=DATA_MEDIA.exec(html))!==null){
      const type=match[1].toLowerCase();
      const key=`nce:preview-media:${previewId}:${dataIndex}`;
      await kvCommand(['SET',key,JSON.stringify({type,base64:match[2]})]);
      mediaUrls.push(`/api/previews/media/${previewId}/${dataIndex}.${extensionFor(type)}`);
      dataIndex+=1;
    }
    const seen=new Set(mediaUrls);
    while((match=TAG_MEDIA.exec(html))!==null){
      const src=match[1].trim();
      if(!src||src.startsWith('data:')||src.startsWith('blob:')||src.startsWith('file:')) continue;
      if(/^https?:\/\//i.test(src)&&!seen.has(src)){seen.add(src);mediaUrls.push(src)}
    }
    const record={html,fileName:file.name,itemId,updatedAt:new Date().toISOString(),mediaUrls};
    await kvCommand(['SET',`nce:preview:${previewId}`,JSON.stringify(record)]);
    return NextResponse.json({previewId,previewUrl:`/preview/${previewId}`,fileName:file.name,mediaUrls,configured:true});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to save preview.'},{status:500})}
}

export async function DELETE(request:Request){
  try{
    const id=new URL(request.url).searchParams.get('id');
    if(!id) return NextResponse.json({error:'Preview ID is required.'},{status:400});
    const raw=await kvCommand<string|null>(['GET',`nce:preview:${id}`]);
    if(raw){
      const record=JSON.parse(raw) as {mediaUrls?:string[]};
      for(let index=0;index<(record.mediaUrls?.length??0);index+=1){await kvCommand(['DEL',`nce:preview-media:${id}:${index}`]).catch(()=>null)}
    }
    await kvCommand(['DEL',`nce:preview:${id}`]);
    return NextResponse.json({deleted:true});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to remove preview.'},{status:500})}
}

export async function GET(request:Request){
  try{
    const id=new URL(request.url).searchParams.get('id');
    if(!id) return NextResponse.json({error:'Preview ID is required.'},{status:400});
    const raw=await kvCommand<string|null>(['GET',`nce:preview:${id}`]);
    if(!raw) return NextResponse.json({error:'Preview not found.'},{status:404});
    return NextResponse.json(JSON.parse(raw));
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to load preview.'},{status:500})}
}
