## 2024-10-24 - Missing ARIA Labels on Core Reader Actions
**Learning:** Core reading experience actions (bookmark, comments, options) in `ChapterReader` were using icon-only buttons without `aria-label`s, making them completely inaccessible to screen readers.
**Action:** Always ensure icon-only `<button>` elements have descriptive `aria-label` attributes to maintain accessibility standards.
