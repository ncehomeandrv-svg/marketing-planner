import { kvCommand, kvConfigured } from '@/lib/kv';

const TOKEN_KEY='nce:microsoft:outlook-token';
const SCOPES='openid profile offline_access User.Read Mail.Send';

type StoredToken={accessToken:string;refreshToken?:string;expiresAt:number;email?:string;name?:string};

export function microsoftConfigured(){return Boolean(process.env.MICROSOFT_CLIENT_ID&&process.env.MICROSOFT_CLIENT_SECRET&&process.env.MICROSOFT_TENANT_ID&&process.env.MICROSOFT_REDIRECT_URI&&kvConfigured())}
export function microsoftAuthorizeUrl(state:string){
  const tenant=process.env.MICROSOFT_TENANT_ID!;
  const params=new URLSearchParams({client_id:process.env.MICROSOFT_CLIENT_ID!,response_type:'code',redirect_uri:process.env.MICROSOFT_REDIRECT_URI!,response_mode:'query',scope:SCOPES,state,prompt:'select_account'});
  return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params}`;
}
async function tokenRequest(params:URLSearchParams){
  const tenant=process.env.MICROSOFT_TENANT_ID!;
  const response=await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:params,cache:'no-store'});
  const body=await response.json();
  if(!response.ok) throw new Error(body?.error_description||body?.error||'Microsoft token request failed.');
  return body;
}
export async function exchangeCode(code:string){
  const body=await tokenRequest(new URLSearchParams({client_id:process.env.MICROSOFT_CLIENT_ID!,client_secret:process.env.MICROSOFT_CLIENT_SECRET!,grant_type:'authorization_code',code,redirect_uri:process.env.MICROSOFT_REDIRECT_URI!,scope:SCOPES}));
  const profileResponse=await fetch('https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName',{headers:{Authorization:`Bearer ${body.access_token}`},cache:'no-store'});
  const profile=profileResponse.ok?await profileResponse.json():{};
  const token:StoredToken={accessToken:body.access_token,refreshToken:body.refresh_token,expiresAt:Date.now()+Number(body.expires_in||3600)*1000-60000,email:profile.mail||profile.userPrincipalName,name:profile.displayName};
  await kvCommand(['SET',TOKEN_KEY,JSON.stringify(token)]);
  return token;
}
export async function readMicrosoftToken():Promise<StoredToken|null>{if(!kvConfigured())return null;const raw=await kvCommand<string|null>(['GET',TOKEN_KEY]);return raw?JSON.parse(raw):null}
export async function disconnectMicrosoft(){if(kvConfigured())await kvCommand(['DEL',TOKEN_KEY])}

async function refreshMicrosoftToken(token:StoredToken){
  if(!token.refreshToken)return null;
  const body=await tokenRequest(new URLSearchParams({client_id:process.env.MICROSOFT_CLIENT_ID!,client_secret:process.env.MICROSOFT_CLIENT_SECRET!,grant_type:'refresh_token',refresh_token:token.refreshToken,redirect_uri:process.env.MICROSOFT_REDIRECT_URI!,scope:SCOPES}));
  const refreshed:StoredToken={...token,accessToken:body.access_token,refreshToken:body.refresh_token||token.refreshToken,expiresAt:Date.now()+Number(body.expires_in||3600)*1000-60000};
  await kvCommand(['SET',TOKEN_KEY,JSON.stringify(refreshed)]);
  return refreshed;
}

export async function validAccessToken(forceRefresh=false){
  const token=await readMicrosoftToken();
  if(!token)return null;
  if(!forceRefresh&&token.expiresAt>Date.now())return token;
  return refreshMicrosoftToken(token);
}

async function graphSend(token:StoredToken,to:string,subject:string,html:string){
  return fetch('https://graph.microsoft.com/v1.0/me/sendMail',{method:'POST',headers:{Authorization:`Bearer ${token.accessToken}`,'Content-Type':'application/json'},body:JSON.stringify({message:{subject,body:{contentType:'HTML',content:html},toRecipients:[{emailAddress:{address:to}}]},saveToSentItems:true}),cache:'no-store'});
}

export async function sendOutlookNotification(to:string,subject:string,html:string){
  let token=await validAccessToken();
  if(!token)throw new Error('Outlook is not connected.');

  let response=await graphSend(token,to,subject,html);

  // Microsoft can revoke an access token before its locally calculated expiry.
  // If Graph rejects authentication, refresh once and retry the same message.
  if(response.status===401){
    token=await validAccessToken(true);
    if(!token)throw new Error('Outlook authorisation expired. Reconnect Outlook.');
    response=await graphSend(token,to,subject,html);
  }

  if(!response.ok){
    const text=await response.text();
    throw new Error(`Microsoft Graph send failed (${response.status}): ${text}`);
  }
}
