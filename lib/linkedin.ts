export function linkedinConfig(){
  return {
    token:(process.env.LINKEDIN_ACCESS_TOKEN||'').trim(),
    organizationId:(process.env.LINKEDIN_ORGANIZATION_ID||'').trim(),
    version:(process.env.LINKEDIN_API_VERSION||'202606').trim(),
  };
}

export async function linkedinFetch(path:string,init:RequestInit={}){
  const config=linkedinConfig();
  if(!config.token) throw new Error('LINKEDIN_ACCESS_TOKEN is missing.');
  const response=await fetch(`https://api.linkedin.com${path}`,{
    ...init,
    headers:{
      Authorization:`Bearer ${config.token}`,
      'Linkedin-Version':config.version,
      'X-Restli-Protocol-Version':'2.0.0',
      ...(init.body?{'Content-Type':'application/json'}:{}),
      ...(init.headers||{}),
    },
    cache:'no-store',
  });
  const text=await response.text();
  let body:any={};
  try{body=text?JSON.parse(text):{};}catch{body={message:text};}
  if(!response.ok) throw new Error(body?.message||body?.error?.message||`LinkedIn returned ${response.status}`);
  return body;
}

export async function uploadLinkedinImage(publicUrl:string,altText=''){
  const config=linkedinConfig();
  if(!config.organizationId) throw new Error('LINKEDIN_ORGANIZATION_ID is missing.');
  const owner=`urn:li:organization:${config.organizationId}`;
  const init=await linkedinFetch('/rest/images?action=initializeUpload',{
    method:'POST',
    body:JSON.stringify({initializeUploadRequest:{owner}}),
  });
  const uploadUrl=init?.value?.uploadUrl;
  const imageUrn=init?.value?.image;
  if(!uploadUrl||!imageUrn) throw new Error('LinkedIn did not return an image upload URL.');

  const source=await fetch(publicUrl,{cache:'no-store'});
  if(!source.ok) throw new Error(`Unable to download image (${source.status}) from ${publicUrl}`);
  const contentType=source.headers.get('content-type')||'image/jpeg';
  const bytes=await source.arrayBuffer();
  const upload=await fetch(uploadUrl,{
    method:'PUT',
    headers:{Authorization:`Bearer ${config.token}`,'Content-Type':contentType},
    body:bytes,
  });
  if(!upload.ok) throw new Error(`LinkedIn image upload failed with ${upload.status}.`);
  return {id:imageUrn,altText};
}
