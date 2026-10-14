## 2023-10-12 - Next.js Database Build Failures
**Learning:** Next.js attempts to run static generation (SSG) at build time, which will invoke Prisma `findMany` queries. In a headless/sandbox environment without a valid `DATABASE_URL` pointing to a real PostgreSQL instance, the build will fail with `ECONNREFUSED` or similar Prisma errors, even if the code syntax is perfectly valid.
**Action:** When validating Next.js code changes in this environment, rely heavily on `npm run lint` and `npm run type-check`. A successful type-check and lint means the code is valid, and build failures due to missing DB connections can be safely ignored.

## 2023-10-12 - Caching in Next.js Server Actions
**Learning:** Some functions like `getCachedHomepageSections` in `src/app/actions/public/homepage.ts` were named "Cached" but were not actually using any Next.js caching mechanisms (`unstable_cache` or `cache`), meaning they hit the DB on every call.
**Action:** Always verify if functions claiming to be cached actually implement caching. Wrapping heavy, read-only DB queries in `unstable_cache` is a high-value performance win for Next.js applications.
