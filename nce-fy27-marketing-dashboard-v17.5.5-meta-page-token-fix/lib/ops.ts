import { kvCommand, kvConfigured } from '@/lib/kv';
import type { PlannerNotification, PublishFailure } from '@/lib/types';

export async function createNotification(input:Omit<PlannerNotification,'id'|'createdAt'>){
  const notification:PlannerNotification={...input,id:crypto.randomUUID(),createdAt:new Date().toISOString()};
  if(kvConfigured()){
    const raw=await kvCommand<string|null>(['GET','nce:notifications']);
    const items:PlannerNotification[]=raw?JSON.parse(raw):[];items.unshift(notification);
    await kvCommand(['SET','nce:notifications',JSON.stringify(items.slice(0,300))]);
  }
  return notification;
}

export async function recordPublishFailure(input:Omit<PublishFailure,'id'|'createdAt'|'retryCount'>){
  const failure:PublishFailure={...input,id:crypto.randomUUID(),createdAt:new Date().toISOString(),retryCount:0};
  if(kvConfigured()){
    const raw=await kvCommand<string|null>(['GET','nce:publish-failures']);
    const items:PublishFailure[]=raw?JSON.parse(raw):[];items.unshift(failure);
    await kvCommand(['SET','nce:publish-failures',JSON.stringify(items.slice(0,200))]);
  }
  return failure;
}
