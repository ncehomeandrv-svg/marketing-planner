import { NextResponse } from 'next/server';
import { campaignId, campaignName, campaignStatus, htmlOf, inSmallGroups, loadAllUnsentCampaigns, loadCampaign, type DotdigitalCampaign } from '@/lib/dotdigital-shipping';

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
const oldAmount = /(?:A\s*\$|\$)\s*200(?:\.00)?\b/gim;
const shippingContext = /(?:free|complimentary|no[- ]cost|eligible).{0,35}(?:ship(?:ping)?|freight|deliver(?:y|ies))|(?:ship(?:ping)?|freight|deliver(?:y|ies)).{0,35}(?:free|complimentary|no[- ]cost|eligible)/i;

function collect(source: string, field: Field): Finding[] {
  const value = source.replace(/\s+/g, ' ').trim();
  if (!value) return [];
  const result: Finding[] = [];
  oldAmount.lastIndex = 0;
  for (const match of value.matchAll(oldAmount)) {
    const index = match.index ?? 0;
    const context = value.slice(Math.max(0, index - 100), Math.min(value.length, index + match[0].length + 100));
    const isMetadata = field === 'Subject' || field === 'Preview text';
    if (!isMetadata && !shippingContext.test(context)) continue;
    const start = Math.max(0, index - 70);
    const end = Math.min(value.length, index + match[0].length + 80);
    const before = (start ? '…' : '') + value.slice(start, end) + (end < value.length ? '…' : '');
    const replacement = match[0].replace(/200(?:\.00)?/i, number => number.includes('.') ? '250.00' : '250');
    const after = (start ? '…' : '') + value.slice(start, index) + replacement + value.slice(index + match[0].length, end) + (end < value.length ? '…' : '');
    result.push({ field, currentText: before, suggestedText: after });
  }
  return result;
}

export async function GET() {
  try {
    const unsent = await loadAllUnsentCampaigns();
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