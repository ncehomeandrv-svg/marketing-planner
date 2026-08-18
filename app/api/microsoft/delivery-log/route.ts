import { NextResponse } from 'next/server';
import { kvCommand, kvConfigured } from '@/lib/kv';
const LOG_KEY='nce:outlook-delivery-log';
export async function GET(){
  if(!kvConfigured()) return NextResponse.json({logs:[]});
  const raw=await kvCommand<string|null>(['GET',LOG_KEY]);
  return NextResponse.json({logs:raw?JSON.parse(raw):[]});
}
