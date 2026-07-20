import NextAuth from 'next-auth';
import { authConfig } from './src/auth.config';
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
  // Security headers are set in next.config.ts — no duplication here (L1 fix)
  
  return response;
});

// C1 FIX: Corrected matcher regex — was using quadruple-escaped backslashes
export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)' , '/', '/(api|trpc)(.*)'],
};
