import { NextResponse } from 'next/server';
import { microsoftConfigured, readMicrosoftToken, validAccessToken } from '@/lib/microsoft';

export async function GET(){
  const configured=microsoftConfigured();
  if(!configured)return NextResponse.json({configured:false,connected:false,email:'',name:''});

  const stored=await readMicrosoftToken();
  if(!stored)return NextResponse.json({configured:true,connected:false,email:'',name:''});

  try{
    const token=await validAccessToken();
    return NextResponse.json({configured:true,connected:Boolean(token),email:token?.email||stored.email||'',name:token?.name||stored.name||'',reconnectRequired:false});
  }catch(error){
    return NextResponse.json({configured:true,connected:false,email:stored.email||'',name:stored.name||'',reconnectRequired:true,error:error instanceof Error?error.message:'Outlook authorisation is no longer valid.'});
  }
}
