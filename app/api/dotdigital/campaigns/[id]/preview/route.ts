import { NextResponse } from 'next/server';
import { dotdigitalFetch } from '@/lib/dotdigital';

function pickString(value: unknown, keys: string[]) {
  if (!value || typeof value !== 'object') return '';
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const candidate = record[key];
    if (typeof candidate === 'string') return candidate;
  }
  return '';
}

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)));
}

function stripMarkup(value: string) {
  return decodeEntities(value)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractPreviewText(html: string, campaign: unknown) {
  const explicit = pickString(campaign, ['previewText', 'PreviewText', 'preheader', 'Preheader']);
  if (explicit.trim()) return explicit.trim();

  const patterns = [
    /<(?:div|span|p)[^>]*(?:class|id)=["'][^"']*(?:preheader|preview[-_ ]?text|email[-_ ]?preview)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|span|p)>/i,
    /<(?:div|span|p)[^>]*style=["'][^"']*(?:display\s*:\s*none|font-size\s*:\s*0)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|span|p)>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    const text = match ? stripMarkup(match[1]) : '';
    if (text && text.length <= 300) return text;
  }

  const bodyText = stripMarkup(html)
    .replace(/View (?:this )?email in (?:your )?browser/ig, '')
    .replace(/Unsubscribe/ig, '')
    .trim();
  return bodyText.slice(0, 180).trim();
}

type ReviewLink = { href: string; label: string };

function extractReviewLinks(html: string): ReviewLink[] {
  if (!html) return [];
  const links: ReviewLink[] = [];
  const seen = new Set<string>();
  const anchorPattern = /<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = anchorPattern.exec(html)) !== null) {
    const href = decodeEntities(match[2] || '').trim();
    if (!/^https?:\/\//i.test(href)) continue;
    if (seen.has(href)) continue;
    seen.add(href);

    const rawLabel = stripMarkup(match[3] || '');
    const label = rawLabel || (() => {
      try {
        const url = new URL(href);
        return `${url.hostname}${url.pathname === '/' ? '' : url.pathname}`;
      } catch {
        return href;
      }
    })();

    links.push({ href, label: label.slice(0, 160) });
  }

  return links;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const campaignId = Number(id);
    if (!Number.isFinite(campaignId) || campaignId <= 0) {
      return NextResponse.json({ error: 'A valid Dotdigital campaign ID is required.' }, { status: 400 });
    }

    const campaign = await dotdigitalFetch(`/campaigns/${campaignId}`);
    const htmlContent = pickString(campaign, ['htmlContent', 'HtmlContent']);
    const plainTextContent = pickString(campaign, ['plainTextContent', 'PlainTextContent']);
    const name = pickString(campaign, ['name', 'Name']) || `Campaign ${campaignId}`;
    const subject = pickString(campaign, ['subject', 'Subject']);
    const fromName = pickString(campaign, ['fromName', 'FromName']);
    const previewText = extractPreviewText(htmlContent, campaign);
    const links = extractReviewLinks(htmlContent);

    if (!htmlContent && !plainTextContent) {
      return NextResponse.json({ error: 'Dotdigital did not return any previewable campaign content.' }, { status: 404 });
    }

    return NextResponse.json({
      campaignId,
      name,
      subject,
      fromName,
      previewText,
      htmlContent,
      plainTextContent,
      links,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load the Dotdigital campaign preview.' },
      { status: 500 },
    );
  }
}
