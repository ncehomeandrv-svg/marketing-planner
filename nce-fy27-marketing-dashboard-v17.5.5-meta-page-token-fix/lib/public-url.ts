export function normalisePublicOrigin(value?: string | null) {
  const raw = value?.trim().replace(/\/+$/, '');
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

export function getPublicOrigin(request: Request) {
  const configured =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL;

  const configuredOrigin = normalisePublicOrigin(configured);
  if (configuredOrigin) return configuredOrigin;

  const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (forwardedHost) {
    const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
    return normalisePublicOrigin(`${forwardedProto}://${forwardedHost}`);
  }

  try {
    return normalisePublicOrigin(new URL(request.url).origin);
  } catch {
    return 'https://nce-marketing-planner.vercel.app';
  }
}
