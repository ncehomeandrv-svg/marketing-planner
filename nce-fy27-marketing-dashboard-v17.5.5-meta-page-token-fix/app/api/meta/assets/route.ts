import {NextResponse} from 'next/server';
import {kvCommand,kvConfigured} from '@/lib/kv';

const MAX_FILE_BYTES=8_000_000;
const ALLOWED=new Set(['image/png','image/jpeg','image/webp']);

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
    const bytes=Buffer.from(await file.arrayBuffer());
    const record={id,itemId,fileName:file.name,type:file.type,size:file.size,base64:bytes.toString('base64'),uploadedAt:new Date().toISOString()};
    await kvCommand(['SET',`nce:meta-asset:${id}`,JSON.stringify(record)]);
    return NextResponse.json({asset:{id,url:`/api/meta/media/${id}`,fileName:file.name,type:file.type,size:file.size,uploadedAt:record.uploadedAt}});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to upload image.'},{status:500})}
}

export async function DELETE(request:Request){
  try{
    const id=new URL(request.url).searchParams.get('id');
    if(!id) return NextResponse.json({error:'Asset ID is required.'},{status:400});
    await kvCommand(['DEL',`nce:meta-asset:${id}`]);
    return NextResponse.json({deleted:true});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to remove image.'},{status:500})}
}
