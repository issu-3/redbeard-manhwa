import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  trustHost: true,
  providers: [], // Providers are configured in auth.ts to avoid Edge Runtime issues
  pages: {
    signIn: '/login',
    newUser: '/register',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role; // Pass role to token
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.role = token.role as 'USER' | 'MODERATOR' | 'ADMIN'; // Pass role to session
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
