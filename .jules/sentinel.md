## 2024-05-18 - [Missing Auth Checks on Admin Endpoints]
**Vulnerability:** Several API routes under `/api/admin` (e.g. `drive/scan` and `resolver-status`) lacked authentication checks and were publicly accessible.
**Learning:** Next.js route handlers in this application do not enforce global authentication or role authorization via middleware. Each protected route, including those logically grouped under an `admin` folder, must manually verify user session and roles using `await auth()`.
**Prevention:** Always manually include role-based authentication checks (using `await auth()`) for any sensitive route handlers in Next.js applications that lack a global middleware auth layer.

## 2024-10-25 - API Information Leakage (CWE-209)
**Vulnerability:** Raw error.message strings were exposed to the client in Next.js API responses.
**Learning:** Returning raw errors can leak internal database or application state to malicious users.
**Prevention:** Always log detailed errors server-side and return generic user-facing error messages (e.g., Internal Server Error).
