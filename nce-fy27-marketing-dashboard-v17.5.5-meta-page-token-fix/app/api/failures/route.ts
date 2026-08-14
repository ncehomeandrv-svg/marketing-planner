import { NextResponse } from 'next/server';
import { kvCommand, kvConfigured } from '@/lib/kv';
import type { PublishFailure } from '@/lib/types';
const KEY='nce:publish-failures';
async function read():Promise<PublishFailure[]>{if(!kvConfigured()) return [];const raw=await kvCommand<string|null>(['GET',KEY]);return raw?JSON.parse(raw):[]}
async function write(items:PublishFailure[]){await kvCommand(['SET',KEY,JSON.stringify(items.slice(0,200))])}
export async function GET(){return NextResponse.json({configured:kvConfigured(),failures:await read()})}
export async function POST(request:Request){try{const body=await request.json();const failure:PublishFailure={id:crypto.randomUUID(),channel:body.channel,itemId:body.itemId,title:body.title||`${body.channel} publishing failed`,message:body.message,payload:body.payload,endpoint:body.endpoint,createdAt:new Date().toISOString(),retryCount:0};if(kvConfigured()){const items=await read();items.unshift(failure);await write(items)}return NextResponse.json({failure})}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to record failure'},{status:500})}}
export async function PATCH(request:Request){const body=await request.json();const items=await read();const next=items.map(item=>item.id===body.id?{...item,resolvedAt:body.resolve?new Date().toISOString():undefined}:item);if(kvConfigured()) await write(next);return NextResponse.json({failures:next})}
