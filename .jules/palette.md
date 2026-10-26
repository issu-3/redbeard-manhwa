## 2025-05-18 - Dynamic ARIA labels for stateful toggle buttons
**Learning:** Screen reader users rely on accurate state feedback. A static aria-label on a toggle button (like bookmarking) can provide misleading information if it doesn't reflect the current state (e.g., announcing "Bookmark" when the item is already bookmarked).
**Action:** When adding `aria-label` to stateful elements, dynamically update the label based on the state (e.g., `aria-label={isSaved ? 'Remove bookmark' : 'Add bookmark'}`) to provide accurate screen reader feedback.
