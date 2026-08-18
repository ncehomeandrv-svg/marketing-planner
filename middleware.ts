import { NextRequest, NextResponse } from 'next/server';

const encoder=new TextEncoder();
async function expectedSession(){
  const password=process.env.DASHBOARD_PASSWORD||''; const secret=process.env.DASHBOARD_AUTH_SECRET||'';
  if(!password||!secret) return '';
  const digest=await crypto.subtle.digest('SHA-256',encoder.encode(`${password}:${secret}`));
  return Array.from(new Uint8Array(digest)).map(byte=>byte.toString(16).padStart(2,'0')).join('');
}

export async function middleware(request:NextRequest){
  const pathname=request.nextUrl.pathname;
  if(pathname.startsWith('/login')||pathname==='/api/microsoft/callback'||pathname.startsWith('/api/auth')||pathname==='/api/meta/publish'||pathname==='/api/meta/dispatcher'||pathname==='/api/linkedin/publish'||pathname.startsWith('/api/previews/media/')||pathname.startsWith('/api/meta/media/')||pathname.startsWith('/_next')||pathname==='/favicon.ico'||pathname==='/nce-logo.png'||pathname==='/nce-logo-reverse.png') return NextResponse.next();
  const expected=await expectedSession();
  if(!expected) return NextResponse.next();
  if(request.cookies.get('nce_dashboard_session')?.value===expected) return NextResponse.next();
  if(pathname.startsWith('/api/')) return NextResponse.json({error:'Authentication required.'},{status:401});
  const url=new URL('/login',request.url);url.searchParams.set('next',`${pathname}${request.nextUrl.search}`);return NextResponse.redirect(url);
}

export const config={matcher:['/((?!_next/static|_next/image).*)']};
