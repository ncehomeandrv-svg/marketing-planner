import { kvCommand } from '@/lib/kv';
import { notFound } from 'next/navigation';

export const dynamic='force-dynamic';

export default async function SharedPreviewPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  let record:{html:string;fileName:string;updatedAt:string}|null=null;
  try{
    const raw=await kvCommand<string|null>(['GET',`nce:preview:${id}`]);
    if(raw) record=JSON.parse(raw);
  }catch{}
  if(!record) notFound();
  return <main className="shared-preview-page">
    <header><div><strong>NCE shared HTML preview</strong><span>{record.fileName}</span></div><small>Updated {new Date(record.updatedAt).toLocaleString('en-AU')}</small></header>
    <iframe title={record.fileName} sandbox="allow-popups allow-popups-to-escape-sandbox allow-forms" srcDoc={record.html}/>
  </main>
}
