## 2024-10-18 - Missing ARIA Labels in Reader Navigation
**Learning:** Found a recurring pattern in the reader components where icon-only buttons (like Bookmark, Comments, More Options, First/Last Page navigations, and Close buttons) are missing `aria-label` attributes, making them inaccessible to screen readers.
**Action:** Always verify icon-only interactive elements contain descriptive `aria-label`s, especially in dense UI areas like reading interfaces where icons are favored to save space.
