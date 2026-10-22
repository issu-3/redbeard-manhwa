## 2024-10-22 - Dynamic Text in ARIA Labels
**Learning:** When adding `aria-label` to buttons that contain dynamic text (like a like count), the static label overrides the visible text for screen readers. This hides crucial information (e.g., the number of likes).
**Action:** Always interpolate dynamic values into the `aria-label` (e.g., `aria-label={likes > 0 ? \`Like comment, \${likes} likes\` : 'Like comment'}`) or use an alternative technique (like screen-reader only text alongside visible text) when dealing with buttons containing dynamic numeric counts or state.
