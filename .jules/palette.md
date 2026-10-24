## 2024-10-24 - Missing ARIA labels in media-heavy components
**Learning:** Icon-only buttons in complex, immersive interfaces like a manga reader often lack ARIA labels, making critical navigation and action controls inaccessible to screen readers.
**Action:** Always ensure that every icon-only button, especially those for core features like bookmarking, pagination, and opening settings/comments, includes an `aria-label` that dynamically reflects its state or associated data.
