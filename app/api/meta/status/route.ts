import {NextResponse} from 'next/server';
import {metaConfig,metaFetch} from '@/lib/meta';
export async function GET(){
  const config=metaConfig();
  const configured=Boolean(config.pageId&&config.token);
  if(!configured) return NextResponse.json({configured:false,connected:false});
  try{
    const page=await metaFetch(`/${config.pageId}?fields=id,name,picture`);
    let instagram=null;
    if(config.instagramId) instagram=await metaFetch(`/${config.instagramId}?fields=id,username,profile_picture_url`);
    return NextResponse.json({configured:true,connected:true,page,instagram});
  }catch(error){return NextResponse.json({configured:true,connected:false,error:error instanceof Error?error.message:'Meta connection failed'});}
}
