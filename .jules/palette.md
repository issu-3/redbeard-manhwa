## 2025-01-29 - Dynamic ARIA labels for Stateful Filters
**Learning:** When a filter button has an active state (like a red dot), a static `aria-label="Filter library"` doesn't inform screen reader users that filters are currently applied.
**Action:** Use a dynamic `aria-label` like `aria-label={isActive ? 'Filter (filters applied)' : 'Filter'}` to communicate visual state to screen readers.