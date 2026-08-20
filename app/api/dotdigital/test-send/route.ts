import { NextResponse } from 'next/server';
import { dotdigitalFetch, dotdigitalFetchRoot } from '@/lib/dotdigital';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const campaignID = Number(body.campaignID);
    const emails = String(body.emails || '')
      .split(',')
      .map((v: string) => v.trim())
      .filter(Boolean)
      .slice(0, 10);

    if (!Number.isFinite(campaignID)) {
      return NextResponse.json({ error: 'Create or select a campaign first.' }, { status: 400 });
    }

    if (!emails.length) {
      return NextResponse.json({ error: 'Enter at least one test email address.' }, { status: 400 });
    }

    const contactIDs: number[] = [];
    for (const email of emails) {
      const result: any = await dotdigitalFetchRoot(`/contacts/v3/email/${encodeURIComponent(email)}`);
      const id = Number(result?.contactId ?? result?.id ?? result?.Id);

      if (!Number.isFinite(id)) {
        throw new Error(`No Dotdigital contact found for ${email}. Add the address as a contact first.`);
      }

      contactIDs.push(id);
    }

    // Never send the original campaign when the user clicks "test send".
    // Dotdigital's /campaigns/send endpoint is a real campaign send, so first
    // create a disposable copy and send only that copied campaign to the
    // explicitly-entered test contacts.
    const copiedCampaign: any = await dotdigitalFetch(`/campaigns/${campaignID}/copy`, {
      method: 'POST',
    });

    const testCampaignID = Number(
      copiedCampaign?.id ?? copiedCampaign?.Id ?? copiedCampaign?.campaignId ?? copiedCampaign?.campaignID,
    );

    if (!Number.isFinite(testCampaignID)) {
      throw new Error('Dotdigital created a test copy but did not return its campaign ID. The live campaign was not sent.');
    }

    const result = await dotdigitalFetch('/campaigns/send', {
      method: 'POST',
      body: JSON.stringify({
        campaignID: testCampaignID,
        contactIDs,
      }),
    });

    return NextResponse.json({
      result,
      recipients: emails,
      sourceCampaignID: campaignID,
      testCampaignID,
      testOnly: true,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to send test' },
      { status: 500 },
    );
  }
}
