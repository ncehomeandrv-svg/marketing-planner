const encoder=new TextEncoder();

export async function dashboardSessionValue(){
  const password=process.env.DASHBOARD_PASSWORD||'';
  const secret=process.env.DASHBOARD_AUTH_SECRET||'';
  if(!password || !secret) return '';
  const digest=await crypto.subtle.digest('SHA-256',encoder.encode(`${password}:${secret}`));
  return Array.from(new Uint8Array(digest)).map(byte=>byte.toString(16).padStart(2,'0')).join('');
}

export function authConfigured(){return Boolean(process.env.DASHBOARD_PASSWORD&&process.env.DASHBOARD_AUTH_SECRET)};
