import { NextResponse } from 'next/server';
import { campaignId, campaignName, campaignStatus, htmlOf, inSmallGroups, loadCampaign, type DotdigitalCampaign } from '@/lib/dotdigital-shipping';
import { dotdigitalFetch } from '@/lib/dotdigital';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Field = 'Subject' | 'Preview text' | 'HTML text box' | 'Plain text';
type Finding = { field: Field; currentText: string; suggestedText: string };
type AuditedCampaign = { id: number; name: string; status: string; findings: Finding[] };

function fieldValue(c: DotdigitalCampaign, keys: string[]) {
  const record = c as unknown as Record<string, unknown>;
  for (const key of keys) {
    if (typeof record[key] === 'string' && (record[key] as string).trim()) return (record[key] as string).trim();
  }
  return '';
}

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;|&#160;|&#x[aA]0;/gi, ' ')
    .replace(/&amp;/gi, '&').replace(/&dollar;/gi, '$')
    .replace(/&quot;/gi, '"').replace(/&apos;|&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)));
}

function visibleText(html: string) {
  return decodeEntities(html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(?:style|script|svg|head|noscript|template)\b[^>]*>[\s\S]*?<\/(?:style|script|svg|head|noscript|template)\s*>/gi, ' ')
    .replace(/<\/?(?:p|div|h[1-6]|tr|td|table|br|li|section|article|footer|header)\b[^>]*>/gi, ' \n ')
    .replace(/<[^>]*>/g, ' '))
    .replace(/[\t\r\n ]+/g, ' ')
    .trim();
}

function embeddedPreheader(html: string) {
  const patterns = [
    /<(?:div|span|p)\b[^>]*(?:class|id)=["'][^"']*(?:preheader|pre-header|preview[-_ ]?text|email[-_ ]?preview)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|span|p)>/i,
    /<(?:div|span|p)\b[^>]*style=["'][^"']*(?:display\s*:\s*none|font-size\s*:\s*0)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|span|p)>/i,
  ];
  for (const pattern of patterns) {
    const value = visibleText(html.match(pattern)?.[1] || '');
    if (value && value.length <= 400) return value;
  }
  return '';
}

// Restrict body matches to text referring to shipping; do not mistake a product price for a threshold.
const oldAmount = /(?:(?:A\s*)?\$\s*|\b)250(?:\.00)?(?=\s*(?:\+|\*|\b))/gim;
const shippingContext = /(?:free|complimentary|no[- ]cost|eligible).{0,35}(?:ship(?:ping)?|freight|deliver(?:y|ies))|(?:ship(?:ping)?|freight|deliver(?:y|ies)).{0,35}(?:free|complimentary|no[- ]cost|eligible)/i;

function collect(source: string, field: Field): Finding[] {
  const value = source.replace(/\s+/g, ' ').trim();
  if (!value) return [];
  const result: Finding[] = [];
  oldAmount.lastIndex = 0;
  for (const match of value.matchAll(oldAmount)) {
    const index = match.index ?? 0;
    const context = value.slice(Math.max(0, index - 100), Math.min(value.length, index + match[0].length + 100));
    if (!shippingContext.test(context)) continue;
    const start = Math.max(0, index - 70);
    const end = Math.min(value.length, index + match[0].length + 80);
    const before = (start ? '…' : '') + value.slice(start, end) + (end < value.length ? '…' : '');
    const replacement = match[0].replace(/250(?:\.00)?/i, number => number.includes('.') ? '200.00' : '200');
    const after = (start ? '…' : '') + value.slice(start, index) + replacement + value.slice(index + match[0].length, end) + (end < value.length ? '…' : '');
    result.push({ field, currentText: before, suggestedText: after });
  }
  return result;
}

async function loadEveryUnsentCampaign() {
  const results: DotdigitalCampaign[] = [];
  const unique = new Set<number>();
  const pageSize = 100;
  for (let skip = 0; skip < 3000; skip += pageSize) {
    const response: unknown = await dotdigitalFetch('/campaigns/filtered?select=' + pageSize + '&skip=' + skip + '&~statuses=Unsent');
    const page = Array.isArray(response) ? response : (response as { items?: unknown } | null)?.items;
    if (!Array.isArray(page)) throw new Error('Unexpected campaign listing response at offset ' + skip);
    for (const raw of page) {
      const campaign = raw as DotdigitalCampaign;
      const id = campaignId(campaign);
      if (Number.isSafeInteger(id) && id > 0 && campaignStatus(campaign) === 'Unsent' && !unique.has(id)) {
        unique.add(id);
        results.push(campaign);
      }
    }
    if (page.length < pageSize) return results;
  }
  throw new Error('The account has more than 3,000 Unsent campaigns. Audit pagination limit reached.');
}

export async function GET() {
  try {
    const unsent = (await loadEveryUnsentCampaign()).filter(c => { const label = (campaignName(c) + ' ' + String(c.subject ?? c.Subject ?? '')).toLowerCase(); return /black[\s-]*(?:november|friday)|\bbfcm\b/i.test(label) && !/\b2025\b|\b2024\b/.test(label); });
    const errors: { id: number; name: string; issue: string }[] = [];
    const results = await inSmallGroups(unsent, 5, async candidate => {
      const id = campaignId(candidate);
      try {
        const c = await loadCampaign(id);
        const name = campaignName(c);
        if (campaignStatus(c) !== 'Unsent') return { id, name, error: 'No longer Unsent; excluded from audit' };
        const html = htmlOf(c);
        const subject = fieldValue(c, ['subject', 'Subject']);
        const preview = fieldValue(c, ['previewText', 'PreviewText', 'preheader', 'Preheader', 'preview', 'Preview']) || embeddedPreheader(html);
        const plain = fieldValue(c, ['plainTextContent', 'PlainTextContent']);
        if (!html && !plain && !subject && !preview) return { id, name, error: 'Campaign returned no readable copy' };
        const findings: Finding[] = [
          ...collect(subject, 'Subject'),
          ...collect(preview, 'Preview text'),
          ...collect(visibleText(html), 'HTML text box'),
          ...collect(plain, 'Plain text'),
        ];
        return { id, name, status: 'Unsent', findings };
      } catch (err) {
        return { id, name: campaignName(candidate), error: err instanceof Error ? err.message : 'Campaign fetch failed' };
      }
    });
    const matches: AuditedCampaign[] = [];
    let successfullyChecked = 0;
    for (const result of results) {
      if ('error' in result) errors.push({ id: result.id, name: result.name, issue: result.error || 'Unknown error' });
      else {
        successfullyChecked++;
        if (result.findings.length) matches.push(result as AuditedCampaign);
      }
    }
    return NextResponse.json({
      audit: 'Unsent Dotdigital editable text; no image artwork',
      generatedAt: new Date().toISOString(), totalUnsent: unsent.length,
      successfullyChecked, affectedCampaigns: matches.length,
      occurrences: matches.reduce((sum, c) => sum + c.findings.length, 0),
      campaigns: matches, errors,
      caveat: 'Preview text is checked from campaign metadata or an identifiable HTML preheader. Editor-only preview fields not returned by the API cannot be verified. HTML text is checked as rendered copy rather than individual block IDs.',
      readOnly: true,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Audit failed', readOnly: true }, { status: 502 });
  }
}