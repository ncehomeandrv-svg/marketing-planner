import { NextResponse } from 'next/server';
import { dotdigitalFetch } from '@/lib/dotdigital';

export async function GET() {
  try {
    const [addressBooks, segments] = await Promise.all([
      dotdigitalFetch('/address-books?select=1000'),
      dotdigitalFetch('/segments?select=1000'),
    ]);
    return NextResponse.json({ addressBooks, segments });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load audiences' },
      { status: 502 },
    );
  }
}
