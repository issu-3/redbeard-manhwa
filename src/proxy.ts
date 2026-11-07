import { NextResponse } from 'next/server';
import { auth } from '@/auth';

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
  // rewrite missing resources to the 404 route (the pattern the Next.js
  // docs recommend for streamed routes). Fails open on any error so a
  // database problem can never take these routes down.
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
          const notFoundUrl = req.nextUrl.clone();
          notFoundUrl.pathname = '/404';
          notFoundUrl.search = '';
          return NextResponse.rewrite(notFoundUrl);
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
