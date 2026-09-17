import {NextResponse} from 'next/server';
import {kvCommand} from '@/lib/kv';

type MetaAssetRecord={
  type:string;
  fileName:string;
  base64?:string;
  chunkCount?:number;
};

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const {id}=await params;
    const raw=await kvCommand<string|null>(['GET',`nce:meta-asset:${id}`]);
    if(!raw) return NextResponse.json({error:'Image not found.'},{status:404});
    const record=JSON.parse(raw) as MetaAssetRecord;

    let base64=record.base64;
    if(!base64&&record.chunkCount){
      const chunks:string[]=[];
      for(let index=0;index<record.chunkCount;index++){
        const chunk=await kvCommand<string|null>(['GET',`nce:meta-asset-chunk:${id}:${index}`]);
        if(!chunk) return NextResponse.json({error:'Image data is incomplete.'},{status:500});
        chunks.push(chunk);
      }
      base64=chunks.join('');
    }
    if(!base64) return NextResponse.json({error:'Image data is missing.'},{status:500});

    const bytes=Buffer.from(base64,'base64');
    return new NextResponse(bytes,{headers:{'Content-Type':record.type,'Content-Disposition':`inline; filename="${record.fileName.replace(/"/g,'')}"`,'Cache-Control':'public, max-age=31536000, immutable'}});
  }catch(error){
    console.error('[api/meta/media] image load failed',error);
    return NextResponse.json({error:error instanceof Error?error.message:'Unable to load image.'},{status:500});
  }
}
