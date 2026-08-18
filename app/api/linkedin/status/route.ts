import {NextResponse} from 'next/server';
import {linkedinConfig,linkedinFetch} from '@/lib/linkedin';
export async function GET(){
  const config=linkedinConfig();
  const configured=Boolean(config.token&&config.organizationId);
  if(!configured) return NextResponse.json({configured:false,connected:false});
  try{
    const organization=await linkedinFetch(`/rest/organizations/${config.organizationId}`);
    return NextResponse.json({configured:true,connected:true,organization});
  }catch(error){
    return NextResponse.json({configured:true,connected:false,error:error instanceof Error?error.message:'LinkedIn connection failed'});
  }
}
