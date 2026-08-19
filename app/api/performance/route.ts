import { NextRequest } from 'next/server';

export const dynamic='force-dynamic';
export const runtime='nodejs';

const ANALYTICS_URL='https://nce-ads-control-centre.vercel.app/api/planner-performance';

export async function POST(request:NextRequest){
  try{
    const oidc=request.headers.get('x-vercel-oidc-token')||process.env.VERCEL_OIDC_TOKEN||'';
    if(!oidc)return Response.json({error:'Vercel OIDC is not available for this deployment.'},{status:503});
    const payload=await request.json();
    const response=await fetch(ANALYTICS_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${oidc}`},
      body:JSON.stringify(payload),
      cache:'no-store'
    });
    const text=await response.text();
    let body:any={};
    try{body=text?JSON.parse(text):{}}catch{body={error:text||`Analytics dashboard returned HTTP ${response.status}.`}}
    return Response.json(body,{status:response.status});
  }catch(error){
    return Response.json({error:error instanceof Error?error.message:'Unable to pull performance.'},{status:500});
  }
}
