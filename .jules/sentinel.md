## 2024-05-18 - [Missing Auth Checks on Admin Endpoints]
**Vulnerability:** Several API routes under `/api/admin` (e.g. `drive/scan` and `resolver-status`) lacked authentication checks and were publicly accessible.
**Learning:** Next.js route handlers in this application do not enforce global authentication or role authorization via middleware. Each protected route, including those logically grouped under an `admin` folder, must manually verify user session and roles using `await auth()`.
**Prevention:** Always manually include role-based authentication checks (using `await auth()`) for any sensitive route handlers in Next.js applications that lack a global middleware auth layer.

## 2026-10-24 - [Information Leakage in API Routes]
**Vulnerability:** Multiple API routes were directly returning raw `error.message` strings in `NextResponse.json` to the client during catch blocks.
**Learning:** This widespread pattern (CWE-209) risks exposing internal stack traces, configuration details, or database structures to the frontend, particularly when third-party libraries or the ORM throw detailed exceptions.
**Prevention:** Catch blocks in API route handlers must always log the detailed error server-side and return a generic `'Internal server error'` string to the client.
