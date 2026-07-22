import { auth } from '@/auth';

export default auth((req) => {
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
