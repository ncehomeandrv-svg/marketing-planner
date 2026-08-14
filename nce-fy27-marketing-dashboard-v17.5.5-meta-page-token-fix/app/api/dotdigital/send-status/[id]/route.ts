import { NextResponse } from 'next/server';
import { dotdigitalFetch } from '@/lib/dotdigital';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const result = await dotdigitalFetch(`/campaigns/send/${encodeURIComponent(id)}`);
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load send status' },
      { status: 502 },
    );
  }
}
