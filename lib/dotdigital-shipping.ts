import { createHash } from 'node:crypto';
import { dotdigitalFetch } from '@/lib/dotdigital';

export const OLD_SHIPPING_TEXT = 'FREE SHIPPING ON ELIGIBLE ORDERS $200+*';
export const NEW_SHIPPING_TEXT = 'FREE SHIPPING ON ELIGIBLE ORDERS $250+*';

// Only the exact shipping headline, not every occurrence of "$200" in the email.
// Dotdigital can add whitespace around words when saving editor content.
const OLD_HEADING = /FREE\s+SHIPPING\s+ON\s+ELIGIBLE\s+ORDERS\s+\$200\+\*/g;

export interface DotdigitalCampaign {
  id?: number;
  Id?: number;
  name?: string;
  Name?: string;
  subject?: string;
  Subject?: string;
  status?: string;
  Status?: string;
  type?: string;
  Type?: string;
  isSplitTest?: boolean;
  IsSplitTest?: boolean;
  htmlContent?: string;
  HtmlContent?: string;
  plainTextContent?: string;
  PlainTextContent?: string;
  fromName?: string;
  FromName?: string;
  fromAddress?: { id?: number; email?: string };
  FromAddress?: { Id?: number; Email?: string };
  replyAction?: string;
  ReplyAction?: string;
  replyToAddress?: string;
  ReplyToAddress?: string;
}

export function campaignId(c: DotdigitalCampaign) {
  return Number(c.id ?? c.Id);
}

export function campaignName(c: DotdigitalCampaign) {
  return String(c.name ?? c.Name ?? ('Campaign ' + campaignId(c)));
}

export function campaignStatus(c: DotdigitalCampaign) {
  return String(c.status ?? c.Status ?? '');
}

export function campaignType(c: DotdigitalCampaign) {
  return String(c.type ?? c.Type ?? '');
}

export function htmlOf(c: DotdigitalCampaign) {
  return c.htmlContent ?? c.HtmlContent ?? '';
}

export function checksum(html: string) {
  return createHash('sha256').update(html, 'utf8').digest('hex');
}

export function changeShippingHeading(html: string) {
  const occurrences = [...html.matchAll(OLD_HEADING)].length;
  return { occurrences, changedHtml: html.replace(OLD_HEADING, NEW_SHIPPING_TEXT) };
}

export async function loadCampaign(id: number): Promise<DotdigitalCampaign> {
  return await dotdigitalFetch('/campaigns/' + id + '/with-details') as DotdigitalCampaign;
}

export async function loadAllUnsentCampaigns() {
  const pageSize = 100;
  const maximum = 3000;
  const campaigns: DotdigitalCampaign[] = [];
  const ids = new Set<number>();
  for (let skip = 0; skip < maximum; skip += pageSize) {
    const query = '/campaigns/filtered?select=' + pageSize +
      '&skip=' + skip + '&~type=Standard&~statuses=Unsent';
    const response: unknown = await dotdigitalFetch(query);
    const object = response as { items?: unknown } | null;
    const page = Array.isArray(response) ? response : object?.items;
    if (!Array.isArray(page)) throw new Error('Unexpected Dotdigital campaign list response. No changes made.');
    for (const raw of page) {
      const c = raw as DotdigitalCampaign;
      const id = campaignId(c);
      if (Number.isSafeInteger(id) && id > 0 && campaignStatus(c) === 'Unsent' && !ids.has(id)) {
        ids.add(id);
        campaigns.push(c);
      }
    }
    if (page.length < pageSize) return campaigns;
  }
  throw new Error('More than 3,000 Unsent campaigns found. Pagination limit reached; no changes made.');
}

export function safeForUpdate(c: DotdigitalCampaign) {
  return campaignStatus(c) === 'Unsent' &&
    campaignType(c) === 'Standard' &&
    c.isSplitTest !== true && c.IsSplitTest !== true;
}

export async function inSmallGroups<T, R>(
  values: T[], count: number, handler: (value: T) => Promise<R>,
): Promise<R[]> {
  const output: R[] = [];
  for (let index = 0; index < values.length; index += count) {
    output.push(...await Promise.all(values.slice(index, index + count).map(handler)));
  }
  return output;
}
