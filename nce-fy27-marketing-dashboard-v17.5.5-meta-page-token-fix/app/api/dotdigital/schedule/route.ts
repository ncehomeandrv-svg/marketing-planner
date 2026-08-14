import { NextRequest, NextResponse } from 'next/server';
import { dotdigitalFetch } from '@/lib/dotdigital';

interface ScheduleBody {
  campaignID?: number;
  addressBookIDs?: number[];
  sendDate?: string;
  approvalStatus?: string;
  audiences?: Array<{ id: number; name?: string; type?: 'List' | 'Segment' }>;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ScheduleBody;

    if (body.approvalStatus !== 'Approved') {
      return NextResponse.json({ error: 'Jenna must approve this item before it can be scheduled.' }, { status: 400 });
    }
    if (!Number.isInteger(body.campaignID)) {
      return NextResponse.json({ error: 'Select a Dotdigital campaign.' }, { status: 400 });
    }
    const audienceIds = [...new Set((body.addressBookIDs ?? []).filter(Number.isInteger))];
    if (!audienceIds.length) {
      return NextResponse.json({ error: 'Select at least one Dotdigital audience.' }, { status: 400 });
    }
    if (!body.sendDate || Number.isNaN(Date.parse(body.sendDate))) {
      return NextResponse.json({ error: 'Choose a valid send date and time.' }, { status: 400 });
    }
    if (Date.parse(body.sendDate) <= Date.now()) {
      return NextResponse.json({ error: 'The scheduled send time must be in the future.' }, { status: 400 });
    }

    const result = await dotdigitalFetch('/campaigns/send', {
      method: 'POST',
      body: JSON.stringify({
        campaignID: body.campaignID,
        // Dotdigital uses addressBookIDs for both list IDs and segment IDs.
        addressBookIDs: audienceIds,
        sendDate: body.sendDate,
      }),
    });

    return NextResponse.json({ result, audiences: body.audiences ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to schedule campaign' },
      { status: 502 },
    );
  }
}
