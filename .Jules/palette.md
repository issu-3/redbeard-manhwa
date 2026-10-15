## 2025-03-01 - Adding ARIA Labels to Icon-Only Buttons
**Learning:** Found multiple instances of icon-only buttons (like Go Back, Close, More Options, Mark as Read) lacking accessibility labels in `AndroidSeriesView.tsx` and `Header.tsx`. This pattern is common in native-app-like web interfaces where space is premium.
**Action:** Always add descriptive `aria-label` attributes to any `<button>` that relies solely on an icon (e.g., from `lucide-react`) to communicate its action.
