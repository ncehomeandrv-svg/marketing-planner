const graphVersion = process.env.META_GRAPH_API_VERSION || 'v24.0';
export const metaBase = `https://graph.facebook.com/${graphVersion}`;

export function metaConfig(){
  return {
    pageId: process.env.META_FACEBOOK_PAGE_ID || '',
    instagramId: process.env.META_INSTAGRAM_BUSINESS_ID || '',
    token: process.env.META_PAGE_ACCESS_TOKEN || '',
  };
}

async function parseMetaResponse(response:Response){
  const text=await response.text();
  let body:any={};
  try{body=text?JSON.parse(text):{};}catch{body={raw:text};}
  if(!response.ok) throw new Error(body?.error?.message || body?.message || `Meta API error ${response.status}`);
  return body;
}

export async function metaFetch(path:string, init:RequestInit={}, tokenOverride?:string){
  const {token:configuredToken}=metaConfig();
  const token=tokenOverride||configuredToken;
  const separator=path.includes('?')?'&':'?';
  const response=await fetch(`${metaBase}${path}${separator}access_token=${encodeURIComponent(token)}`,{...init,cache:'no-store'});
  return parseMetaResponse(response);
}

export async function metaFormFetch(path:string, fields:Record<string,string|number|boolean|undefined>, tokenOverride?:string){
  const {token:configuredToken}=metaConfig();
  const token=tokenOverride||configuredToken;
  const separator=path.includes('?')?'&':'?';
  const body=new URLSearchParams();
  for(const [key,value] of Object.entries(fields)){
    if(value===undefined) continue;
    body.set(key,String(value));
  }
  const response=await fetch(`${metaBase}${path}${separator}access_token=${encodeURIComponent(token)}`,{
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},
    body,
    cache:'no-store',
  });
  return parseMetaResponse(response);
}

export async function resolveFacebookPageToken(){
  const config=metaConfig();
  if(!config.pageId) throw new Error('META_FACEBOOK_PAGE_ID is missing.');
  if(!config.token) throw new Error('META_PAGE_ACCESS_TOKEN is missing.');

  // A real Page access token identifies /me as the Page itself.
  try{
    const identity=await metaFetch('/me?fields=id,name',{},config.token);
    if(String(identity?.id||'')===String(config.pageId)) return config.token;
  }catch{}

  // User/system-user tokens may expose the Page token through the Page or accounts edge.
  try{
    const page=await metaFetch(`/${config.pageId}?fields=id,name,access_token`,{},config.token);
    if(page?.access_token) return String(page.access_token);
  }catch{}

  try{
    const accounts=await metaFetch('/me/accounts?fields=id,name,access_token,tasks&limit=100',{},config.token);
    const page=Array.isArray(accounts?.data)?accounts.data.find((entry:any)=>String(entry?.id)===String(config.pageId)):null;
    if(page?.access_token) return String(page.access_token);
  }catch{}

  throw new Error('The configured Meta token does not authenticate as the NCE Facebook Page and no Page access token could be resolved. Replace META_PAGE_ACCESS_TOKEN with the Page access token for META_FACEBOOK_PAGE_ID, with CREATE_CONTENT and MANAGE permissions assigned to the app/system user.');
}

export async function queueCommand(command:string[]){
  const url=process.env.UPSTASH_REDIS_REST_URL;
  const token=process.env.UPSTASH_REDIS_REST_TOKEN;
  if(!url||!token) throw new Error('Redis queue is not configured. Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.');
  const response=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(command),cache:'no-store'});
  const body=await response.json();
  if(!response.ok||body.error) throw new Error(body.error||'Unable to access Meta schedule queue');
  return body.result;
}
