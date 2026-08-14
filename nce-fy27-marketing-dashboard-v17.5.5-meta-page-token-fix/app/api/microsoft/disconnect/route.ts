import { NextResponse } from 'next/server';import { disconnectMicrosoft } from '@/lib/microsoft';
export async function POST(){await disconnectMicrosoft();return NextResponse.json({ok:true})}
