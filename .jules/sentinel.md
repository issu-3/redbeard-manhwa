## 2024-05-18 - [Missing Auth Checks on Admin Endpoints]
**Vulnerability:** Several API routes under `/api/admin` (e.g. `drive/scan` and `resolver-status`) lacked authentication checks and were publicly accessible.
**Learning:** Next.js route handlers in this application do not enforce global authentication or role authorization via middleware. Each protected route, including those logically grouped under an `admin` folder, must manually verify user session and roles using `await auth()`.
**Prevention:** Always manually include role-based authentication checks (using `await auth()`) for any sensitive route handlers in Next.js applications that lack a global middleware auth layer.

## 2023-10-30 - [Prevent Information Leakage in API Responses]
**Vulnerability:** Raw `error.message` strings were being returned directly to the client in Next.js API responses (`NextResponse.json`).
**Learning:** This exposes internal error details (CWE-209), potentially revealing sensitive information like file paths, database schemas, or third-party service errors.
**Prevention:** Always log the detailed error server-side (e.g., using `console.error`) and return a generic error message like 'Internal Server Error' to the client.
