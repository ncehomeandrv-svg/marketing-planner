import { NextResponse } from 'next/server';
import { kvCommand, kvConfigured } from '@/lib/kv';

export const runtime = 'nodejs';
const PREFIX='nce:planner-asset:';
const MAX_BYTES=8*1024*1024;

type StoredAsset={id:string;name:string;type:string;size:number;uploadedAt:string;base64:string};

export async function POST(request:Request){
  try{
    if(!kvConfigured())return NextResponse.json({error:'Shared storage is not configured.'},{status:503});
    const form=await request.formData();
    const file=form.get('file');
    if(!(file instanceof File))return NextResponse.json({error:'A file is required.'},{status:400});
    if(file.size>MAX_BYTES)return NextResponse.json({error:'Files must be 8 MB or smaller.'},{status:400});
    const id=crypto.randomUUID();
    const stored:StoredAsset={id,name:file.name,type:file.type||'application/octet-stream',size:file.size,uploadedAt:new Date().toISOString(),base64:Buffer.from(await file.arrayBuffer()).toString('base64')};
    await kvCommand(['SET',`${PREFIX}${id}`,JSON.stringify(stored)]);
    return NextResponse.json({attachment:{id,name:stored.name,type:stored.type,size:stored.size,uploadedAt:stored.uploadedAt,downloadUrl:`/api/assets?id=${id}`}});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to upload asset.'},{status:500})}
}

export async function GET(request:Request){
  try{
    const id=new URL(request.url).searchParams.get('id');
    if(!id)return NextResponse.json({error:'Asset ID is required.'},{status:400});
    const raw=await kvCommand<string|null>(['GET',`${PREFIX}${id}`]);
    if(!raw)return NextResponse.json({error:'Asset not found.'},{status:404});
    const asset=JSON.parse(raw) as StoredAsset;
    const safeName=asset.name.replace(/[\r\n\"]/g,'_');
    return new NextResponse(Buffer.from(asset.base64,'base64'),{headers:{'Content-Type':asset.type,'Content-Length':String(asset.size),'Content-Disposition':`attachment; filename="${safeName}"`,'Cache-Control':'private, no-store'}});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to download asset.'},{status:500})}
}

export async function DELETE(request:Request){
  try{
    const id=new URL(request.url).searchParams.get('id');
    if(!id)return NextResponse.json({error:'Asset ID is required.'},{status:400});
    await kvCommand(['DEL',`${PREFIX}${id}`]);
    return NextResponse.json({ok:true});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to remove asset.'},{status:500})}
}
