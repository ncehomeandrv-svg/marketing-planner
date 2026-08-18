import { NextResponse } from 'next/server';
import { dotdigitalConfigured, dotdigitalFetch } from '@/lib/dotdigital';

export async function GET() {
  if (!dotdigitalConfigured()) {
    return NextResponse.json({ configured: false, connected: false });
  }

  try {
    const account = await dotdigitalFetch('/account-info');
    return NextResponse.json({ configured: true, connected: true, account });
  } catch (error) {
    return NextResponse.json(
      { configured: true, connected: false, error: error instanceof Error ? error.message : 'Connection failed' },
      { status: 502 },
    );
  }
}
