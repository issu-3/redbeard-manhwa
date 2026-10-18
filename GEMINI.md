# Project Rules & MCP Agent Workflow

## 1. Tech Stack & Architecture
- **Framework:** Next.js (App Router, Server Components by default, Server Actions for mutations)
- **Language:** TypeScript (Strict mode, zero `any` types)
- **Database & ORM:** Neon PostgreSQL + Prisma ORM
- **Validation:** Zod for all form inputs, Server Actions, and API payloads
- **Styling & UI:** Tailwind CSS + shadcn/ui

---

## 2. Active MCP Servers & Mandatory Usage Rules
You have direct access to 4 specialized MCP servers. Do NOT rely on outdated training data or ask the user to manually copy-paste schemas, logs, or docs when an MCP tool can fetch them directly.

### 📚 1. `context7` — Official Documentation & Syntax
- **WHEN TO USE:**
  - Before writing code using Next.js App Router APIs, Prisma Client queries, Zod, Tailwind CSS, or shadcn/ui.
  - Whenever you encounter a deprecation warning, type error, or unfamiliar package method.
- **ACTION:** Always resolve the library ID and fetch the latest documentation via `context7` BEFORE writing code. Never guess API signatures.

### 🗄️ 2. `mcp-server-neon` — Live Database & Schema Verification
- **WHEN TO USE:**
  - Before writing or modifying any Prisma queries, relations, or database migrations.
  - When debugging database constraint errors, missing columns, or slow queries.
- **ACTION:**
  - Inspect live tables and schemas via `mcp-server-neon` to ensure exact alignment with `@[Prisma Schema](prisma/schema.prisma)`.
  - Default to read-only queries (`SELECT`) when checking data.
  - **SAFETY:** Never run destructive SQL (`DROP`, `TRUNCATE`, or unqualified `DELETE`/`UPDATE`) without explicit user permission.
  - After updating `prisma/schema.prisma`, always run `npx prisma generate`.

### 🛠️ 3. `chrome-devtools-mcp` — Console, Network & DOM Debugging
- **WHEN TO USE:**
  - Immediately after implementing UI changes or Server Actions to check for runtime issues.
  - When debugging hydration errors, failed network/API requests, broken CSS layouts, or slow page loads on `http://localhost:3000`.
- **ACTION:** Inspect live console logs, network requests, and computed DOM styles directly via `chrome-devtools-mcp` instead of asking the user for error logs.

### 🎭 4. `playwright` — Automated UI & E2E Flow Testing
- **WHEN TO USE:**
  - After building or updating pages, forms, modals, navigation, or interactive client components.
- **ACTION:**
  - Navigate to `http://localhost:3000` using `playwright`.
  - Test the complete user journey (click buttons, fill forms, submit data, verify route changes) to confirm the feature works end-to-end.

---

## 3. Standard Development Workflow
For every feature request or bug fix, follow this exact loop:
1. **Docs Check:** Read `@[Package Config](package.json)` and query **`context7`** for any framework/library syntax needed.
2. **DB Check:** Inspect the live database via **`mcp-server-neon`** and verify `@[Prisma Schema](prisma/schema.prisma)`.
3. **Build:** Write clean, modular TypeScript code. Keep components as Server Components unless interactivity (`"use client"`) is strictly needed.
4. **Test & Debug:** Verify the live page on `localhost:3000` using **`playwright`** for interactions and **`chrome-devtools-mcp`** to ensure zero console or network errors.