## 2026-10-25 - [Dynamic aria-label for stateful buttons]
**Learning:** [When adding `aria-label` to elements that also contain dynamic visible text (e.g., rendering a count like `<span>{likes}</span>`), the dynamic text must be interpolated into the `aria-label`. A static `aria-label` overrides the element's inner text for screen readers, hiding important dynamic information.]
**Action:** [Always interpolate dynamic values into `aria-label`s for elements that render dynamic text. Also add `aria-hidden="true"` to the inner dynamic element to avoid screen reader double-reading.]
