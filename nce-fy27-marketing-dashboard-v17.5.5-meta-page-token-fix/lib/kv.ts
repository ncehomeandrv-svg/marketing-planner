const baseUrl = () => (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '');
const token = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';

export function kvConfigured(){ return Boolean(baseUrl() && token()); }

export async function kvCommand<T=unknown>(command:(string|number)[]):Promise<T>{
  if(!kvConfigured()) throw new Error('Shared storage is not configured.');
  const response=await fetch(baseUrl(),{
    method:'POST',
    headers:{Authorization:`Bearer ${token()}`,'Content-Type':'application/json'},
    body:JSON.stringify(command),
    cache:'no-store'
  });
  const body=await response.json().catch(()=>({}));
  if(!response.ok || body.error) throw new Error(body.error || `KV request failed (${response.status})`);
  return body.result as T;
}
