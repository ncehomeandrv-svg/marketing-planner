import { NextResponse } from 'next/server';
import type { PlannerItem } from '@/lib/types';

const KEY = 'nce:fy27:planner-items';
const DELETED_KEY = 'nce:fy27:deleted-item-ids';

function isRemovedTradeOemBlog(item: PlannerItem) {
  return item.id.includes('-trade-oem-blog-') || (/^Trade \/ OEM Blog/i.test(item.title) && item.channel === 'Website');
}

function workflowNotification(previous: PlannerItem | undefined, item: PlannerItem) {
  if (!previous) return null;
  const isBlog = item.channel === 'Website' && (item.source === 'Monthly Content Plan' || /^Blog(?:\s|$)/i.test(item.title || '') || item.id.includes('-blog-'));
  if (isBlog) return null;

  if (item.status === 'Brief Ready' && previous.status !== 'Brief Ready') {
    return { person: item.assetCreator || 'Kieren', title: `Brief ready: ${item.title}`, message: `${item.briefOwner || 'Jenna'} marked the brief ready for production.` };
  }
  if (item.status === 'Ready for Review' && previous.status !== 'Ready for Review') {
    return { person: item.approver || 'Jenna', title: `Ready for review: ${item.title}`, message: `${item.assetCreator || item.owner || 'Kieren'} submitted this item for review.` };
  }
  const changesRequired = item.status === 'Changes Required' && previous.status !== 'Changes Required';
  const changesRequested = item.approvalStatus === 'Changes requested' && previous.approvalStatus !== 'Changes requested';
  if (changesRequired || changesRequested) {
    return { person: item.assetCreator || 'Kieren', title: `Changes requested: ${item.title}`, message: `${item.approver || 'Jenna'} requested revisions.` };
  }
  if (item.approvalStatus === 'Approved' && previous.approvalStatus !== 'Approved') {
    return { person: item.publisher || 'Kieren', title: `Approved: ${item.title}`, message: `${item.approver || 'Jenna'} approved this item for scheduling.` };
  }
  return null;
}

async function sendWorkflowNotification(request: Request, previous: PlannerItem | undefined, item: PlannerItem) {
  const notification = workflowNotification(previous, item);
  if (!notification) return null;
  const url = new URL('/api/notifications', request.url);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: request.headers.get('cookie') || '',
    },
    body: JSON.stringify({ ...notification, itemId: item.id, link: url.origin, item }),
    cache: 'no-store',
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Workflow notification failed (${response.status})`);
  if (body.emailError) throw new Error(body.emailError);
  return body;
}

function config() {
  // Vercel's Upstash/KV integration uses KV_REST_API_* names. Direct
  // Upstash integrations may instead expose UPSTASH_REDIS_REST_* names.
  // Supporting both keeps the same deployment portable between setups.
  const url =
    process.env.KV_REST_API_URL ??
    process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ??
    process.env.UPSTASH_REDIS_REST_TOKEN;

  return {
    url: url?.trim().replace(/\/$/, ''),
    token: token?.trim(),
  };
}

async function command(command: unknown[]) {
  const { url, token } = config();
  if (!url || !token) return null;
  const response = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(command), cache: 'no-store' });
  if (!response.ok) throw new Error(`Draft storage failed (${response.status})`);
  const body = await response.json();
  return body.result;
}

export async function GET() {
  try {
    const result = await command(['GET', KEY]);
    const deletedRaw = await command(['GET', DELETED_KEY]);
    const storedItems: PlannerItem[] = result ? JSON.parse(String(result)) : [];
    const items = storedItems.filter(item => !isRemovedTradeOemBlog(item));
    if (items.length !== storedItems.length) await command(['SET', KEY, JSON.stringify(items)]);
    return NextResponse.json({ configured: result !== null || Boolean(config().url), items, deletedIds: deletedRaw ? JSON.parse(String(deletedRaw)) : [] });
  } catch (error) { return NextResponse.json({ configured: false, items: [], error: error instanceof Error ? error.message : 'Unable to load drafts' }, { status: 500 }); }
}

export async function PUT(request: Request) {
  try {
    const item = await request.json() as PlannerItem;
    if (!item?.id) return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    const currentRaw = await command(['GET', KEY]);
    const current: PlannerItem[] = currentRaw ? JSON.parse(String(currentRaw)).filter((existing: PlannerItem) => !isRemovedTradeOemBlog(existing)) : [];
    if (isRemovedTradeOemBlog(item)) return NextResponse.json({ configured: true, item, removed: true });
    const previous = current.find(existing => existing.id === item.id);
    const next = current.some(existing => existing.id === item.id) ? current.map(existing => existing.id === item.id ? item : existing) : [...current, item];
    const saved = await command(['SET', KEY, JSON.stringify(next)]);
    if (saved === null) return NextResponse.json({ configured: false, item });
    let workflowNotificationResult = null;
    let workflowNotificationError = '';
    try {
      workflowNotificationResult = await sendWorkflowNotification(request, previous, item);
    } catch (error) {
      workflowNotificationError = error instanceof Error ? error.message : 'Unable to send workflow notification';
    }
    return NextResponse.json({ configured: true, item, workflowNotification: workflowNotificationResult, workflowNotificationError });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to save draft' }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json() as { id?: string };
    if (!body.id) return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    const currentRaw = await command(['GET', KEY]);
    const current: PlannerItem[] = currentRaw ? JSON.parse(String(currentRaw)) : [];
    const next = current.filter(item => item.id !== body.id);
    const deletedRaw = await command(['GET', DELETED_KEY]);
    const deletedIds: string[] = deletedRaw ? JSON.parse(String(deletedRaw)) : [];
    const nextDeleted = Array.from(new Set([...deletedIds, body.id]));
    const saved = await command(['SET', KEY, JSON.stringify(next)]);
    await command(['SET', DELETED_KEY, JSON.stringify(nextDeleted)]);
    if (saved === null) return NextResponse.json({ configured: false, id: body.id });
    return NextResponse.json({ configured: true, id: body.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to delete item' }, { status: 500 });
  }
}
