import { NextResponse } from 'next/server';
import { kvCommand, kvConfigured } from '@/lib/kv';
import { readMicrosoftToken, sendOutlookNotification } from '@/lib/microsoft';

const LOG_KEY='nce:outlook-delivery-log';

type DeliveryLog={id:string;to:string;subject:string;status:'sent'|'failed';message:string;createdAt:string};

async function writeLog(entry:DeliveryLog){
  if(!kvConfigured()) return;
  const raw=await kvCommand<string|null>(['GET',LOG_KEY]);
  const items:DeliveryLog[]=raw?JSON.parse(raw):[];
  items.unshift(entry);
  await kvCommand(['SET',LOG_KEY,JSON.stringify(items.slice(0,100))]);
}

export async function POST(request:Request){
  const token=await readMicrosoftToken();
  if(!token?.email) return NextResponse.json({error:'Outlook is not connected.'},{status:400});
  const body=await request.json().catch(()=>({}));
  const to=String(body.to||token.email).trim();
  const subject='NCE Marketing Planner – Outlook test email';
  const createdAt=new Date().toISOString();
  try{
    await sendOutlookNotification(to,subject,'<p>This is a test notification from the NCE FY27 Marketing Dashboard.</p><p>If you received this message, the Microsoft Graph Outlook connection is working correctly.</p>');
    await writeLog({id:crypto.randomUUID(),to,subject,status:'sent',message:'Accepted by Microsoft Graph.',createdAt});
    return NextResponse.json({ok:true,to,message:'Email accepted by Microsoft Graph.'});
  }catch(error){
    const message=error instanceof Error?error.message:'Outlook test email failed.';
    await writeLog({id:crypto.randomUUID(),to,subject,status:'failed',message,createdAt});
    return NextResponse.json({error:message},{status:500});
  }
}
