import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { NextResponse } from 'next/server';

// Initialize NextAuth with Edge-compatible config
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;
  const isAuthRoute = nextUrl.pathname.startsWith('/api/auth');
  const isAdminRoute = nextUrl.pathname.startsWith('/admin');

  // Allow auth routes to always process
  if (isAuthRoute) {
    return NextResponse.next();
  }

  // Protect Admin routes
  if (isAdminRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(nextUrl.pathname)}`, req.url));
    }

    if (role === 'USER') {
      // Forbidden: redirect to home or an unauthorized page
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  return response;
});
// Optionally, configure matcher to only run on certain paths for performance
export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
