import { type NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';
import { SESSION_COOKIE } from '@/lib/auth/session';

const intl = createIntlMiddleware(routing);

const PROTECTED_SEGMENTS = ['home', 'appointments', 'pros', 'reviews', 'notifications', 'settings', 'become-professional', 'pro', 'dev'];

const PUBLIC_SEGMENTS = ['sign-in', 'sign-up'];

function pathSegments(pathname: string): string[] {
  return pathname.split('/').filter(Boolean);
}

function isProtected(pathname: string): boolean {
  // Skip if not under a known locale.
  const segs = pathSegments(pathname);
  if (segs.length < 1) return false;
  if (!routing.locales.includes(segs[0] as 'el' | 'en')) return false;
  if (segs.length < 2) return false;
  return PROTECTED_SEGMENTS.includes(segs[1]);
}

function isPublicAuth(pathname: string): boolean {
  const segs = pathSegments(pathname);
  return segs.length >= 2 && PUBLIC_SEGMENTS.includes(segs[1]);
}

export default function middleware(req: NextRequest) {
  // Run next-intl first so localized URLs are normalized.
  const intlResponse = intl(req);
  if (intlResponse instanceof NextResponse && intlResponse.headers.get('location')) {
    return intlResponse;
  }

  const { pathname } = req.nextUrl;

  // Cheap presence check; the layout guards do the cryptographic verification + DB load.
  const hasSession = !!req.cookies.get(SESSION_COOKIE)?.value;

  if (isProtected(pathname) && !hasSession) {
    const segs = pathSegments(pathname);
    const locale = segs[0];
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/sign-in`;
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (isPublicAuth(pathname) && hasSession) {
    const segs = pathSegments(pathname);
    const locale = segs[0];
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/home`;
    url.search = '';
    return NextResponse.redirect(url);
  }

  return intlResponse;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
