## 2024-05-24 - Missing authentication on admin API endpoints
**Vulnerability:** Several API endpoints under `src/app/api/admin/` lacked explicit authentication and authorization checks (e.g., `drive/scan/route.ts`, `resolver-status/route.ts`).
**Learning:** The application does not enforce authorization at the middleware layer for API routes under `/api/admin/`, requiring manual auth checks in every endpoint. This led to developers forgetting to add the `auth()` check.
**Prevention:** Always manually ensure that `auth()` is called and `session.user.role` is verified for endpoints handling sensitive data or privileged actions, especially under admin paths. Consider adding middleware to enforce this globally for `/api/admin/*`.
