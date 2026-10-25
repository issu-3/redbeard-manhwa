## 2024-10-25 - ARIA Labels for Reader Icons
**Learning:** Icon-only buttons using lucide-react in the reader view lacked screen reader context, making navigation opaque.
**Action:** Always verify icon-only buttons include `aria-label`s, especially dynamic ones reflecting state (e.g., bookmark saved vs. unsaved).
