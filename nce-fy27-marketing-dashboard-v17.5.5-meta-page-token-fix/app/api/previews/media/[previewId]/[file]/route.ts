import { NextResponse } from 'next/server';
import { kvCommand } from '@/lib/kv';

export const dynamic='force-dynamic';

export async function GET(_:Request,{params}:{params:Promise<{previewId:string;file:string}>}){
  const {previewId,file}=await params;
  const index=Number(file.split('.')[0]);
  if(!Number.isInteger(index)||index<0) return NextResponse.json({error:'Invalid media reference.'},{status:400});
  const raw=await kvCommand<string|null>(['GET',`nce:preview-media:${previewId}:${index}`]);
  if(!raw) return NextResponse.json({error:'Media not found.'},{status:404});
  const record=JSON.parse(raw) as {type:string;base64:string};
  return new NextResponse(Buffer.from(record.base64,'base64'),{headers:{'Content-Type':record.type,'Cache-Control':'public, max-age=31536000, immutable'}});
}
