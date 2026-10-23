## 2025-02-12 - Added ARIA attributes to Chapter Reader action buttons & Reader Settings toggles
**Learning:** Icon-only action buttons (e.g. bookmarks, comments, settings) need explicit `aria-label`s for screen reader accessibility, and custom toggle switches need `role="switch"` and `aria-checked` to communicate state clearly.
**Action:** Always verify that interactive icon-only elements have descriptive text alternatives, and apply appropriate ARIA roles and states to custom interactive components that mimic standard ones (like toggle switches).
