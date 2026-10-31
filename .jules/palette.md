## 2024-10-31 - Dynamic ARIA Labels in Lists
**Learning:** Icon-only action buttons in iterated lists (like admin user management) need item-specific dynamic text for their `aria-label` to provide uniquely identifiable actions for screen readers.
**Action:** Always interpolate unique identifiers (e.g., user name or title) into `aria-label`s for repeated actions in a list.