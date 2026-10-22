## 2024-10-23 - Screen Reader Accessibility in Native Views
**Learning:** Native view components on Android heavily rely on icon-only interactive elements (like Back, Delete, Search, and Menus) without visual labels. These present significant accessibility barriers for screen readers if not paired with `aria-label` attributes to explicitly describe the action.
**Action:** Always verify that every icon-only button rendered in any Native view (`src/components/native/*`) includes a descriptive `aria-label` attribute, ensuring an intuitive navigation experience for users employing screen readers.
