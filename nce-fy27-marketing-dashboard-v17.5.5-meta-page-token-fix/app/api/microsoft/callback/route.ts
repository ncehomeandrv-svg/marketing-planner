import { NextRequest, NextResponse } from 'next/server';
import { exchangeCode } from '@/lib/microsoft';

function errorRedirect(request: NextRequest, stage: string, message: string) {
  const target = new URL('/', request.url);
  target.searchParams.set('outlook', 'error');
  target.searchParams.set('outlook_stage', stage);
  target.searchParams.set('outlook_reason', message.slice(0, 900));
  return NextResponse.redirect(target);
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const microsoftError = url.searchParams.get('error');
  const microsoftDescription = url.searchParams.get('error_description');

  if (microsoftError) {
    return errorRedirect(
      request,
      'Microsoft authorisation',
      microsoftDescription || microsoftError,
    );
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expected = request.cookies.get('nce_ms_oauth_state')?.value;

  if (!code) return errorRedirect(request, 'Callback', 'Microsoft did not return an authorisation code.');
  if (!state) return errorRedirect(request, 'Callback', 'Microsoft did not return the OAuth state value.');
  if (!expected) return errorRedirect(request, 'Security check', 'The Outlook sign-in cookie was missing or expired. Start the connection again from the dashboard in the same browser.');
  if (state !== expected) return errorRedirect(request, 'Security check', 'The Outlook sign-in security state did not match. Start the connection again and do not use an old sign-in tab.');

  try {
    await exchangeCode(code);
    const response = NextResponse.redirect(new URL('/?outlook=connected', request.url));
    response.cookies.delete('nce_ms_oauth_state');
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Microsoft token exchange failed.';
    return errorRedirect(request, 'Token exchange', message);
  }
}
