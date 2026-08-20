'use client';

import type {PlannerItem} from '@/lib/types';
import DotdigitalPanel from '@/components/DotdigitalPanel';
import MetaPanel from '@/components/MetaPanel';
import LinkedInPanel from '@/components/LinkedInPanel';
import SharedHtmlPreview from '@/components/SharedHtmlPreview';
import CollaborationPanel from '@/components/CollaborationPanel';

export default function ReviewIntegrations({item,currentPerson,onUpdate}:{item:PlannerItem;currentPerson:string;onUpdate:(item:PlannerItem)=>void}){
  if(item.type==='important-date') return null;
  return <>
    {item.channel==='Email'&&<DotdigitalPanel key={`dotdigital-${item.id}`} item={item} onUpdate={onUpdate}/>}
    {item.channel==='Organic'&&<MetaPanel key={`meta-${item.id}`} item={item} onUpdate={onUpdate}/>}
    {item.channel==='LinkedIn'&&<LinkedInPanel key={`linkedin-${item.id}`} item={item} onUpdate={onUpdate}/>}
    <SharedHtmlPreview key={`html-${item.id}`} item={item} onUpdate={onUpdate}/>
    <CollaborationPanel key={`comments-${item.id}`} item={item} currentPerson={currentPerson} onUpdate={onUpdate}/>
  </>;
}
