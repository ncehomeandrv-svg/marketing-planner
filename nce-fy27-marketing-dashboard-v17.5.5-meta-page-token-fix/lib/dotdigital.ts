const region = (process.env.DOTDIGITAL_REGION || 'r3').trim();
const configuredBaseUrl = process.env.DOTDIGITAL_API_BASE_URL?.trim();
const username = process.env.DOTDIGITAL_API_USERNAME?.trim();
const password = process.env.DOTDIGITAL_API_PASSWORD;

export function dotdigitalConfigured() {
  return Boolean(username && password && (configuredBaseUrl || region));
}

function baseUrl() {
  const origin = configuredBaseUrl
    ? configuredBaseUrl.replace(/\/+$/, '')
    : `https://${region.replace(/^https?:\/\//, '').replace(/-api\.dotdigital\.com.*$/, '')}-api.dotdigital.com`;

  return origin.endsWith('/v2') ? origin : `${origin}/v2`;
}


function rootBaseUrl() {
  return configuredBaseUrl
    ? configuredBaseUrl.replace(/\/+$/, '').replace(/\/v2$/, '')
    : `https://${region.replace(/^https?:\/\//, '').replace(/-api\.dotdigital\.com.*$/, '')}-api.dotdigital.com`;
}

export async function dotdigitalFetchRoot(path: string, init: RequestInit = {}) {
  if (!username || !password) {
    throw new Error('Dotdigital API credentials are not configured.');
  }

  const auth = Buffer.from(`${username}:${password}`).toString('base64');
  const url = `${rootBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
        ...(init.headers || {}),
      },
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to reach Dotdigital at ${rootBaseUrl()}: ${reason}`);
  }

  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    const detail = typeof body === 'string' ? body : JSON.stringify(body);
    throw new Error(`Dotdigital API error ${response.status}: ${detail}`);
  }

  return body;
}

export async function dotdigitalFetch(path: string, init: RequestInit = {}) {
  if (!username || !password) {
    throw new Error('Dotdigital API credentials are not configured.');
  }

  const auth = Buffer.from(`${username}:${password}`).toString('base64');
  const url = `${baseUrl()}${path.startsWith('/') ? path : `/${path}`}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
        ...(init.headers || {}),
      },
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to reach Dotdigital at ${baseUrl()}: ${reason}`);
  }

  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    const detail = typeof body === 'string' ? body : JSON.stringify(body);
    throw new Error(`Dotdigital API error ${response.status}: ${detail}`);
  }

  return body;
}
