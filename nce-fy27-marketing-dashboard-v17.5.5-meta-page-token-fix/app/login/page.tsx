'use client';
import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage(){
  const router=useRouter(); const [password,setPassword]=useState(''); const [remember,setRemember]=useState(true); const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  async function submit(event:React.FormEvent){event.preventDefault();setBusy(true);setError('');try{const response=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password,remember})});const body=await response.json();if(!response.ok)throw new Error(body.error||'Unable to sign in.');const next=new URLSearchParams(window.location.search).get('next')||'/';router.replace(next);router.refresh()}catch(e){setError(e instanceof Error?e.message:'Unable to sign in.')}finally{setBusy(false)}}
  return <main className="login-page"><form className="login-card" onSubmit={submit}><div className="login-logo"><Image src="/nce-logo-reverse.png" width={190} height={92} alt="NCE" priority/></div><span className="eyebrow">INTERNAL MARKETING TOOL</span><h1>FY27 Marketing Dashboard</h1><p>Enter the shared dashboard password to continue.</p><label><span>Password</span><input autoFocus required type="password" value={password} onChange={e=>setPassword(e.target.value)}/></label><label className="remember"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/><span>Keep me signed in on this browser</span></label>{error&&<div className="login-error">{error}</div>}<button className="btn primary" disabled={busy}>{busy?'Signing in…':'Sign in'}</button></form></main>
}
