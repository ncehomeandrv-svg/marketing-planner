import { NextRequest, NextResponse } from 'next/server';
import { dotdigitalFetch } from '@/lib/dotdigital';
import {
  OLD_SHIPPING_TEXT, NEW_SHIPPING_TEXT,
  campaignId, campaignName, checksum, changeShippingHeading,
  htmlOf, inSmallGroups, loadAllUnsentCampaigns, loadCampaign, safeForUpdate,
  type DotdigitalCampaign,
} from '@/lib/dotdigital-shipping';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface Match {
  id: number;
  name: string;
  subject: string;
  occurrences: number;
  checksum: string;
}

interface Target {
  id: number;
  checksum: string;
}

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown Dotdigital API error';
}

export async function GET() {
  try {
    const campaigns = await loadAllUnsentCampaigns();
    const matches: Match[] = [];
    const skipped: Array<{ id: number; name: string; reason: string }> = [];
    let already250 = 0;
    let noMatch = 0;
    const scans = await inSmallGroups(campaigns, 5, async candidate => {
      const id = campaignId(candidate);
      try {
        const campaign = await loadCampaign(id);
        if (!safeForUpdate(campaign)) {
          return { id, name: campaignName(campaign), reason: 'Not an Unsent standard non-split-test campaign', excluded: true };
        }
        const html = htmlOf(campaign);
        if (!html) return { id, name: campaignName(campaign), reason: 'No HTML returned', excluded: true };
        const replacement = changeShippingHeading(html);
        if (!replacement.occurrences) {
          return {
            id, name: campaignName(campaign),
            already250: html.includes(NEW_SHIPPING_TEXT),
          };
        }
        return {
          id, name: campaignName(campaign),
          subject: String(campaign.subject ?? campaign.Subject ?? ''),
          occurrences: replacement.occurrences,
          checksum: checksum(html),
        };
      } catch (error) {
        return { id, name: campaignName(candidate), reason: messageOf(error), readError: true };
      }
    });

    for (const scan of scans) {
      if ('reason' in scan && scan.reason) skipped.push({ id: scan.id, name: scan.name, reason: scan.reason });
      else if ('checksum' in scan && typeof scan.checksum === 'string') matches.push(scan as Match);
      else if ('already250' in scan && scan.already250) already250++;
      else noMatch++;
    }
    return json({
      oldText: OLD_SHIPPING_TEXT,
      newText: NEW_SHIPPING_TEXT,
      totalUnsent: campaigns.length,
      matches, already250, noMatch, skipped,
      canApply: !scans.some(scan => 'readError' in scan && scan.readError),
      previewOnly: true,
    });
  } catch (error) {
    return json({ error: messageOf(error) }, 502);
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return json({ error: 'Cross-origin updates are not permitted.' }, 403);
  }
  let body: { confirmation?: unknown; targets?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }
  if (body.confirmation !== 'UPDATE_UNSENT_SHIPPING_250') {
    return json({ error: 'Explicit shipping update confirmation is required.' }, 400);
  }
  if (!Array.isArray(body.targets) || body.targets.length < 1 || body.targets.length > 10) {
    return json({ error: 'Supply between 1 and 10 reviewed campaigns per batch.' }, 400);
  }
  const targets = body.targets as Target[];
  if (targets.some(t =>
    !t || !Number.isSafeInteger(t.id) || t.id <= 0 ||
    typeof t.checksum !== 'string' || !/^[0-9a-f]{64}$/.test(t.checksum),
  ) || new Set(targets.map(t => t.id)).size !== targets.length) {
    return json({ error: 'Invalid or duplicate campaign IDs or checksums.' }, 400);
  }

  const results: Array<{ id: number; name: string; status: string; occurrences?: number; message?: string }> = [];
  // Serial writes limit API pressure and make per-campaign verification straightforward.
  for (const target of targets) {
    let name = 'Campaign ' + target.id;
    try {
      const original: DotdigitalCampaign = await loadCampaign(target.id);
      name = campaignName(original);
      if (campaignId(original) !== target.id || !safeForUpdate(original)) {
        results.push({ id: target.id, name, status: 'skipped', message: 'Campaign no longer eligible (status, type or split-test).' });
        continue;
      }
      const html = htmlOf(original);
      if (!html || checksum(html) !== target.checksum) {
        results.push({ id: target.id, name, status: 'skipped', message: 'Campaign changed since preview. Re-scan before updating.' });
        continue;
      }
      const change = changeShippingHeading(html);
      if (change.occurrences === 0) {
        results.push({ id: target.id, name, status: 'skipped', message: 'Original $200+* shipping headline no longer found.' });
        continue;
      }
      const subject = original.subject ?? original.Subject;
      const fromName = original.fromName ?? original.FromName;
      const plainTextContent = original.plainTextContent ?? original.PlainTextContent;
      if (typeof subject !== 'string' || !fromName || typeof plainTextContent !== 'string') {
        results.push({ id: target.id, name, status: 'skipped', message: 'Required original campaign fields were missing. Not overwriting.' });
        continue;
      }
      const payload = {
        name,
        subject,
        fromName,
        fromAddress: original.fromAddress ?? original.FromAddress,
        htmlContent: change.changedHtml,
        plainTextContent,
        replyAction: original.replyAction ?? original.ReplyAction ?? 'Unset',
        replyToAddress: original.replyToAddress ?? original.ReplyToAddress ?? '',
      };
      await dotdigitalFetch('/campaigns/' + target.id, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      const saved = await loadCampaign(target.id);
      const verified = safeForUpdate(saved) &&
        htmlOf(saved) === change.changedHtml &&
        (saved.subject ?? saved.Subject) === subject &&
        (saved.fromName ?? saved.FromName) === fromName &&
        (saved.plainTextContent ?? saved.PlainTextContent) === plainTextContent;
      results.push({
        id: target.id,
        name,
        status: verified ? 'updated' : 'verification-needed',
        occurrences: change.occurrences,
        ...(!verified ? { message: 'Dotdigital accepted the update, but the full saved content did not exactly match. Review in Dotdigital.' } : {}),
      });
    } catch (error) {
      results.push({ id: target.id, name, status: 'error', message: messageOf(error) });
    }
  }
  return json({ results, sent: false, scheduled: false });
}
