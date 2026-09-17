import {NextResponse} from 'next/server';
import {kvCommand,kvConfigured} from '@/lib/kv';

const MAX_FILE_BYTES=8_000_000;
const CHUNK_CHARS=400_000;
const ALLOWED=new Set(['image/png','image/jpeg','image/webp']);

type MetaAssetRecord={
  id:string;
  itemId:string;
  fileName:string;
  type:string;
  size:number;
  uploadedAt:string;
  base64?:string;
  chunkCount?:number;
};

export async function POST(request:Request){
  try{
    if(!kvConfigured()) return NextResponse.json({error:'Shared media storage is not configured.'},{status:503});
    const form=await request.formData();
    const file=form.get('file');
    const itemId=String(form.get('itemId')||'').trim();
    if(!(file instanceof File)||!itemId) return NextResponse.json({error:'An image and calendar item are required.'},{status:400});
    if(!ALLOWED.has(file.type)) return NextResponse.json({error:'Upload a PNG, JPG or WebP image.'},{status:400});
    if(file.size>MAX_FILE_BYTES) return NextResponse.json({error:'Each image must be under 8 MB.'},{status:413});

    const id=`${itemId}-${crypto.randomUUID()}`;
    const base64=Buffer.from(await file.arrayBuffer()).toString('base64');
    const chunks:string[]=[];
    for(let offset=0;offset<base64.length;offset+=CHUNK_CHARS) chunks.push(base64.slice(offset,offset+CHUNK_CHARS));

    for(let index=0;index<chunks.length;index++){
      await kvCommand(['SET',`nce:meta-asset-chunk:${id}:${index}`,chunks[index]]);
    }

    const uploadedAt=new Date().toISOString();
    const record:MetaAssetRecord={id,itemId,fileName:file.name,type:file.type,size:file.size,uploadedAt,chunkCount:chunks.length};
    await kvCommand(['SET',`nce:meta-asset:${id}`,JSON.stringify(record)]);
    return NextResponse.json({asset:{id,url:`/api/meta/media/${id}`,fileName:file.name,type:file.type,size:file.size,uploadedAt}});
  }catch(error){
    console.error('[api/meta/assets] upload failed',error);
    return NextResponse.json({error:error instanceof Error?error.message:'Unable to upload image.'},{status:500});
  }
}

export async function DELETE(request:Request){
  try{
    const id=new URL(request.url).searchParams.get('id');
    if(!id) return NextResponse.json({error:'Asset ID is required.'},{status:400});
    const key=`nce:meta-asset:${id}`;
    const raw=await kvCommand<string|null>(['GET',key]);
    if(raw){
      const record=JSON.parse(raw) as MetaAssetRecord;
      if(record.chunkCount){
        const keys=[key,...Array.from({length:record.chunkCount},(_,index)=>`nce:meta-asset-chunk:${id}:${index}`)];
        await kvCommand(['DEL',...keys]);
        return NextResponse.json({deleted:true});
      }
    }
    await kvCommand(['DEL',key]);
    return NextResponse.json({deleted:true});
  }catch(error){
    console.error('[api/meta/assets] delete failed',error);
    return NextResponse.json({error:error instanceof Error?error.message:'Unable to remove image.'},{status:500});
  }
}
