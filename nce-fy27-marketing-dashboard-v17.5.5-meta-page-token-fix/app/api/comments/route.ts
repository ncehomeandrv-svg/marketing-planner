import { NextResponse } from 'next/server';
import { kvCommand, kvConfigured } from '@/lib/kv';
import type { PlannerComment } from '@/lib/types';

const key=(itemId:string)=>`nce:comments:${itemId}`;
async function read(itemId:string):Promise<PlannerComment[]>{if(!kvConfigured()) return [];const raw=await kvCommand<string|null>(['GET',key(itemId)]);return raw?JSON.parse(raw):[]}
async function write(itemId:string,comments:PlannerComment[]){await kvCommand(['SET',key(itemId),JSON.stringify(comments)])}

export async function GET(request:Request){const itemId=new URL(request.url).searchParams.get('itemId')||'';return NextResponse.json({configured:kvConfigured(),comments:itemId?await read(itemId):[]})}
export async function POST(request:Request){try{const body=await request.json();if(!body.itemId||!body.author||!body.message?.trim()) return NextResponse.json({error:'Item, author and comment are required.'},{status:400});const comment:PlannerComment={id:crypto.randomUUID(),itemId:body.itemId,author:body.author,message:body.message.trim(),kind:body.kind==='Change request'?'Change request':'Comment',createdAt:new Date().toISOString()};if(kvConfigured()){const comments=await read(body.itemId);comments.unshift(comment);await write(body.itemId,comments)}return NextResponse.json({configured:kvConfigured(),comment})}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to save comment'},{status:500})}}
export async function PATCH(request:Request){try{const body=await request.json();const comments=await read(body.itemId);const next=comments.map(comment=>comment.id===body.commentId?{...comment,resolvedAt:body.resolve?new Date().toISOString():undefined,resolvedBy:body.resolve?body.person:undefined}:comment);if(kvConfigured()) await write(body.itemId,next);return NextResponse.json({comments:next})}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to update comment'},{status:500})}}
