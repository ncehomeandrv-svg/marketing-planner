import { NextResponse } from 'next/server';
import { dashboardSessionValue, authConfigured } from '@/lib/auth';

export async function POST(request:Request){
  if(!authConfigured()) return NextResponse.json({error:'Dashboard password protection is not configured.'},{status:503});
  const body=await request.json().catch(()=>({}));
  if(String(body.password||'')!==process.env.DASHBOARD_PASSWORD) return NextResponse.json({error:'Incorrect password.'},{status:401});
  const response=NextResponse.json({ok:true});
  response.cookies.set('nce_dashboard_session',await dashboardSessionValue(),{
    httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',
    maxAge:body.remember===false?60*60*12:60*60*24*30
  });
  return response;
}
