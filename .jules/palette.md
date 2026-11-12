## 2025-05-19 - Accessible Icon-Only Buttons
**Learning:** Native views for Capacitor like `AndroidLibraryView` and `AndroidStorageView` often rely heavily on `lucide-react` icon-only buttons for a native app feel, leading to pervasive missing `aria-label`s.
**Action:** When working on native app views, always verify that structural elements (headers, bottom sheets, toolbars) have descriptive `aria-label`s on their action buttons.
