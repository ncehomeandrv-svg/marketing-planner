import {NextResponse} from 'next/server';
import {kvCommand} from '@/lib/kv';

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const {id}=await params;
    const raw=await kvCommand<string|null>(['GET',`nce:meta-asset:${id}`]);
    if(!raw) return NextResponse.json({error:'Image not found.'},{status:404});
    const record=JSON.parse(raw) as {type:string;base64:string;fileName:string};
    const bytes=Buffer.from(record.base64,'base64');
    return new NextResponse(bytes,{headers:{'Content-Type':record.type,'Content-Disposition':`inline; filename="${record.fileName.replace(/"/g,'')}"`,'Cache-Control':'public, max-age=31536000, immutable'}});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to load image.'},{status:500})}
}
