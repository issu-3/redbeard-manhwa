import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/auth';

// Soft-404 v2: on Vercel the /404 page is a prerendered static page held in
// the CDN cache, so a middleware rewrite to /404 is served with that page's
// own 200 status (observed in production request logs: "Middleware 200,
// Cache HIT, Key /404") — the rewrite pattern only yields a real 404 under
// `next start`. Instead the middleware returns the response itself with an
// explicit 404 status, reusing the site's real /404 page body (fetched once
// per middleware instance and cached in memory; a minimal branded body is
// the fallback if that fetch ever fails, e.g. preview deployment
// protection). no-store keeps the CDN from caching the 404 under the
// requested URL, so a slug created later is never stuck behind it.
let cachedNotFoundHtml: string | null = null;

async function serveNotFound(req: NextRequest): Promise<NextResponse> {
  try {
    if (!cachedNotFoundHtml) {
      const res = await fetch(new URL('/404', req.nextUrl.origin));
      if (res.ok) {
        cachedNotFoundHtml = await res.text();
      }
    }
  } catch {
    // Fall through to the minimal body below; the 404 status is the point.
  }

  const html =
    cachedNotFoundHtml ??
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>404 — Page Not Found | REDBEARD</title><meta name="robots" content="noindex"></head><body><h1>404 — Page Not Found</h1><p>The page you are looking for does not exist. <a href="/">Go to homepage</a></p></body></html>';

  return new NextResponse(html, {
    status: 404,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

export default auth(async (req) => {
  const host = req.headers.get('host') || req.nextUrl.hostname;
  if (host === 'www.redbeard.store') {
    const newUrl = new URL(req.nextUrl.pathname + req.nextUrl.search, 'https://redbeard.store');
    return Response.redirect(newUrl, 308);
  }

  // SEO soft-404 fix: the series, chapter-reader and genre routes sit inside
  // loading.tsx Suspense boundaries, so streaming starts (HTTP 200) before
  // the page's notFound() can set a 404 status — missing resources were
  // served as soft 404s. Verify existence here, before any streaming, and
  // answer missing resources directly with a real 404 (see serveNotFound
  // above for why a rewrite to /404 does not work on Vercel). Fails open on
  // any error so a database problem can never take these routes down.
  if (req.method === 'GET' || req.method === 'HEAD') {
    const pathname = req.nextUrl.pathname;
    const chapterMatch = pathname.match(/^\/series\/([^/]+)\/chapter\/([^/]+)$/);
    const seriesMatch = chapterMatch ? null : pathname.match(/^\/series\/([^/]+)$/);
    const genreMatch =
      chapterMatch || seriesMatch ? null : pathname.match(/^\/browse\/genres\/([^/]+)$/);

    if (chapterMatch || seriesMatch || genreMatch) {
      try {
        const { prisma } = await import('@/lib/prisma');
        let exists = true;

        if (genreMatch) {
          const genre = await prisma.genre.findUnique({
            where: { slug: decodeURIComponent(genreMatch[1]) },
            select: { id: true },
          });
          exists = !!genre;
        } else {
          const slug = decodeURIComponent((chapterMatch ?? seriesMatch)![1]);
          const series = await prisma.series.findUnique({
            where: { slug },
            select: { id: true },
          });
          if (!series) {
            exists = false;
          } else if (chapterMatch) {
            const { resolveReaderChapterId } = await import('@/lib/chapter-lookup');
            exists = !!(await resolveReaderChapterId(
              series.id,
              decodeURIComponent(chapterMatch[2])
            ));
          }
        }

        if (!exists) {
          return serveNotFound(req);
        }
      } catch {
        // Fail open: serve the page normally if the check cannot run.
      }
    }
  }

  const isLoggedIn = !!req.auth;
  const isApiAuthRoute = req.nextUrl.pathname.startsWith('/api/auth');
  const isAdminRoute = req.nextUrl.pathname.startsWith('/admin');
  const isAdminApiRoute = req.nextUrl.pathname.startsWith('/api/admin');

  if (isApiAuthRoute) {
    return;
  }

  if (isAdminRoute || isAdminApiRoute) {
    if (!isLoggedIn) {
      let callbackUrl = req.nextUrl.pathname;
      if (req.nextUrl.search) {
        callbackUrl += req.nextUrl.search;
      }
      return Response.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`, req.nextUrl));
    }

    if (req.auth?.user?.role !== 'ADMIN') {
      return Response.redirect(new URL('/', req.nextUrl));
    }
  }

  return;
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
