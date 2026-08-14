import { NextResponse } from 'next/server';import { microsoftConfigured,readMicrosoftToken } from '@/lib/microsoft';
export async function GET(){const token=await readMicrosoftToken();return NextResponse.json({configured:microsoftConfigured(),connected:Boolean(token),email:token?.email||'',name:token?.name||''})}
