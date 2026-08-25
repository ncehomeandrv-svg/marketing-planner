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

function prepareHtml(html: string) {
  const base = '<base target="_blank">';
  const withoutFramePolicy = html
    .replace(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '')
    .replace(/<meta[^>]+http-equiv=["']X-Frame-Options["'][^>]*>/gi, '');

  if (/<head\b[^>]*>/i.test(withoutFramePolicy)) {
    return withoutFramePolicy.replace(/<head\b([^>]*)>/i, `<head$1>${base}`);
  }
  if (/<html\b[^>]*>/i.test(withoutFramePolicy)) {
    return withoutFramePolicy.replace(/<html\b([^>]*)>/i, `<html$1><head>${base}</head>`);
  }
  return `<!doctype html><html><head>${base}<meta charset="utf-8"></head><body>${withoutFramePolicy}</body></html>`;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const campaignId = Number(id);
    if (!Number.isFinite(campaignId) || campaignId <= 0) {
      return new Response('Invalid Dotdigital campaign ID.', { status: 400 });
    }

    const campaign = await dotdigitalFetch(`/campaigns/${campaignId}`);
    const htmlContent = pickString(campaign, ['htmlContent', 'HtmlContent']);
    const plainTextContent = pickString(campaign, ['plainTextContent', 'PlainTextContent']);

    if (!htmlContent) {
      if (!plainTextContent) return new Response('No previewable campaign content.', { status: 404 });
      return new Response(`<!doctype html><html><head><meta charset="utf-8"></head><body><pre style="white-space:pre-wrap;font-family:Arial,sans-serif">${plainTextContent.replace(/[&<>]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char] || char))}</pre></body></html>`, {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }

    return new Response(prepareHtml(htmlContent), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'Content-Security-Policy': "default-src * data: blob: 'unsafe-inline' 'unsafe-eval'; img-src * data: blob:; style-src * 'unsafe-inline'; font-src * data:; frame-ancestors 'self'",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to render Dotdigital campaign.';
    return new Response(`<!doctype html><html><body style="font-family:Arial,sans-serif;padding:24px"><strong>Preview failed</strong><p>${message.replace(/[&<>]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char] || char))}</p></body></html>`, {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
}
