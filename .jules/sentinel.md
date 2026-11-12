## 2024-05-18 - Information Exposure Through an Error Message
**Vulnerability:** Raw `error.message` strings were returned directly to the client in Next.js API routes (e.g., `NextResponse.json({ error: error.message })`) and server actions across the codebase.
**Learning:** Returning raw exception messages exposes internal system details like database queries, file paths, or third-party service errors (like Google Drive API structures) which can aid attackers in reconnaissance.
**Prevention:** Catch blocks should log the detailed error server-side (`console.error('Context:', error)`) for debugging, but always return a sanitized, generic message (like 'Internal server error' or 'Operation failed') to the client.
