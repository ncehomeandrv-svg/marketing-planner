import { NextResponse } from 'next/server';
import { dotdigitalFetch } from '@/lib/dotdigital';

export async function GET() {
  try {
    const campaigns = await dotdigitalFetch('/campaigns/filtered?select=1000&~type=Standard&~statuses=Unsent&~statuses=RequiresWorkflowApproval');
    return NextResponse.json({ campaigns });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load campaigns' },
      { status: 502 },
    );
  }
}
